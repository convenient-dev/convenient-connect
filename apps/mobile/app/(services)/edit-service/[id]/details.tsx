import { ApiError, isCommercialPublishabilityError } from "@/api/client";
import {
  getServiceInformation,
  getServicePricing,
  updateServiceInformation,
  type ProviderPublishability,
  type ServiceInformationCurrentValues,
} from "@/api/service-management";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PublishabilityIssues } from "@/components/template-form/PublishabilityIssues";
import { TemplateSection } from "@/components/template-form/TemplateSection";
import type { ExistingFile } from "@/components/template-form/controls";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import {
  fieldValueKeys,
  useTemplateForm,
  type ServerErrorResult,
} from "@/hooks/use-template-form";
import {
  ACKNOWLEDGEMENT_KEY,
  asTemplate,
  buildInformationFormData,
  findFieldBySubmitKey,
  isListingField,
  isListingSectionKey,
  removeFileBlockedMessage,
  valuesFromCurrent,
  valuesFromPricing,
  type FormTemplate,
  type FormValues,
  type TemplateField,
} from "@/services/template";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background, status } = Colors;

const PORTFOLIO_SUBMIT_KEY = "portfolio_images";

interface LoadedDetails {
  template: FormTemplate;
  values: FormValues;
  current: ServiceInformationCurrentValues;
  publishability: ProviderPublishability | null;
}

/**
 * Only the listing sections are edited here. The acknowledgement is accepted
 * at create and never resubmitted. Setup fields (format, fulfillment,
 * capability answers) are edited on the setup screen; their stored values are
 * still submitted here, unchanged.
 */
function isEditableField(field: TemplateField, template: FormTemplate): boolean {
  return field.field_key !== ACKNOWLEDGEMENT_KEY && isListingField(field, template);
}

/**
 * The information template comes without the pricing field. Pricing is
 * dropped here too so it can never be rendered or validated on this screen.
 */
function withoutPricing(template: FormTemplate): FormTemplate {
  return {
    ...template,
    fields: template.fields.filter((field) => field.field_type !== "pricing"),
  };
}

export default function EditServiceDetailsScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const serviceId = Number(id);

  const [loaded, setLoaded] = useState<LoadedDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stored files marked for deletion; sent as delete_*_ids[] on save.
  const [removedPortfolioIds, setRemovedPortfolioIds] = useState<number[]>([]);
  const [removedCertificateIds, setRemovedCertificateIds] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [data, pricing] = await Promise.all([
        getServiceInformation(serviceId),
        // Pricing is not edited here, but the stored capability answers that
        // are re-sent depend on the saved pricing type and unit for visibility.
        getServicePricing(serviceId).catch(() => null),
      ]);
      if (!data.template) {
        throw new ApiError("The service form could not be loaded.", 422);
      }
      const template = withoutPricing(asTemplate(data.template));
      const current = data.current_values ?? {};
      setRemovedPortfolioIds([]);
      setRemovedCertificateIds([]);
      setLoaded({
        template,
        values: {
          ...valuesFromCurrent(template, current),
          ...(pricing ? valuesFromPricing(pricing) : {}),
        },
        current,
        publishability: data.publishability ?? null,
      });
    } catch (error) {
      setLoaded(null);
      setLoadError(
        error instanceof ApiError ? error.message : "Couldn't load the listing details.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Stored files ─────────────────────────────────────────────────────────
  const existingFiles = useMemo<Record<string, ExistingFile[]>>(() => {
    if (!loaded) return {};
    const { template, current } = loaded;
    const map: Record<string, ExistingFile[]> = {};

    const portfolioField = findFieldBySubmitKey(template, PORTFOLIO_SUBMIT_KEY);
    if (portfolioField) {
      map[portfolioField.field_key] = (current.portfolio_images ?? [])
        .filter((file) => file.id != null && !!file.url)
        .map((file) => ({
          key: String(file.id),
          url: file.url!,
          removed: removedPortfolioIds.includes(file.id!),
        }));
    }

    const certificateField = template.fields.find(
      (field) => field.submit_as?.type === "certificate_bundle",
    );
    if (certificateField) {
      map[certificateField.field_key] = (current.certificate?.files ?? [])
        .filter((file) => file.id != null && !!file.url)
        .map((file) => ({
          key: String(file.id),
          url: file.url!,
          removed: removedCertificateIds.includes(file.id!),
        }));
    }
    return map;
  }, [loaded, removedPortfolioIds, removedCertificateIds]);

  const existingFileCounts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(existingFiles).map(([key, files]) => [
          key,
          files.filter((file) => !file.removed).length,
        ]),
      ),
    [existingFiles],
  );

  const form = useTemplateForm(loaded?.template ?? null, {
    initialValues: loaded?.values,
    existingFileCounts,
  });

  function handleRemoveExisting(field: TemplateField, file: ExistingFile) {
    if (field.submit_as?.type === "certificate_bundle") {
      setRemovedCertificateIds((prev) => [...prev, Number(file.key)]);
      return;
    }
    const added = Array.isArray(form.values[field.field_key])
      ? (form.values[field.field_key] as unknown[]).length
      : 0;
    const keptAfterRemoval = (existingFileCounts[field.field_key] ?? 0) - 1 + added;
    const blocked = removeFileBlockedMessage(field, keptAfterRemoval);
    if (blocked) {
      setDialog({ title: "Cannot Remove Photo", message: blocked });
      return;
    }
    setRemovedPortfolioIds((prev) => [...prev, Number(file.key)]);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  function showFieldErrors(title: string, result: ServerErrorResult) {
    const unmapped = result.general.slice(0, 5).map((m) => `• ${m}`).join("\n");
    const prompt = "Please review the highlighted fields before saving.";
    setDialog({ title, message: unmapped ? `${prompt}\n\n${unmapped}` : prompt });
  }

  async function handleSave() {
    if (!loaded || saving) return;
    const editable = form.visible.filter((f) => isEditableField(f, loaded.template));
    if (!form.validateFields(editable)) {
      showFieldErrors("Some details need attention", { sectionIndex: -1, general: [] });
      return;
    }
    setSaving(true);
    form.clearGeneralErrors();
    try {
      const formData = buildInformationFormData(loaded.template, form.values, {
        deletePortfolioIds: removedPortfolioIds,
        deleteCertificateIds: removedCertificateIds,
      });
      await updateServiceInformation(serviceId, formData);
      setSavedModalVisible(true);
    } catch (error) {
      // Errors on the re-sent setup fields cannot be shown here, so they are
      // reported as general messages rather than silently disabling Save.
      if (isCommercialPublishabilityError(error)) {
        showFieldErrors("Listing not publishable yet", form.applyServerErrors(error, editable));
        return;
      }
      const result = form.applyServerIssues(error, editable);
      if (result) {
        showFieldErrors("Some details need attention", result);
        return;
      }
      setDialog({
        title: "Couldn't save changes",
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Listing Details" />
        <ActivityIndicator size="large" color={primary[400]} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Listing Details" />
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={neutral[300]} />
          <Text style={styles.errorText}>
            {loadError ?? "Couldn't load the listing details."}
          </Text>
          <Button title="Try again" variant="primary" size="md" onPress={load} />
          <Button title="Back" variant="ghost" size="md" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const { template } = loaded;
  const sections = form.sections.filter((section) => isListingSectionKey(section.section_key));
  // Only errors on fields this screen renders can block Save.
  const editableKeys = new Set(
    form.visible.filter((f) => isEditableField(f, template)).flatMap(fieldValueKeys),
  );
  const hasErrors = Object.keys(form.errors).some((key) => editableKeys.has(key));

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Listing Details" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PublishabilityIssues publishability={loaded.publishability} template={template} />

          {form.generalErrors.length ? (
            <View style={styles.generalErrorBox}>
              {form.generalErrors.map((message, index) => (
                <Text key={index} style={styles.generalErrorText}>{message}</Text>
              ))}
            </View>
          ) : null}

          {sections.map((section, index) => {
            const fields = form.fieldsForSection(section).filter((f) => isEditableField(f, template));
            if (!fields.length) return null;
            return (
              <View key={section.section_key ?? String(index)} style={styles.card}>
                <TemplateSection
                  section={section}
                  fields={fields}
                  template={template}
                  values={form.values}
                  errors={form.errors}
                  isRequired={form.isRequired}
                  setValue={form.setValue}
                  existingFiles={existingFiles}
                  onRemoveExistingFile={handleRemoveExisting}
                />
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Cancel"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          onPress={() => router.back()}
        />
        <Button
          title="Save"
          variant="primary"
          size="md"
          style={{ flex: 1 }}
          disabled={hasErrors}
          loading={saving}
          onPress={handleSave}
        />
      </View>

      <ConfirmModal
        visible={savedModalVisible}
        type="success"
        title="Listing Updated"
        message="Your listing details have been saved successfully."
        confirmLabel="View Service"
        onConfirm={() => {
          setSavedModalVisible(false);
          router.replace(`/service-detail/${id}`);
        }}
      />

      <ConfirmModal
        visible={dialog !== null}
        type="error"
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        confirmLabel="OK"
        onConfirm={() => setDialog(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.screen },
  flex: { flex: 1 },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: { fontSize: 14, color: neutral[500], textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: background.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: neutral[200],
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  generalErrorBox: {
    borderWidth: 1,
    borderColor: status.error,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  generalErrorText: { fontSize: 13, color: status.error },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
