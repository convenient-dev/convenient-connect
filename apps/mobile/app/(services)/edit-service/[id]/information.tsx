import { createAddress, getDefaultAddress, type ResolvedLocation } from "@/api/address";
import {
  ApiError,
  isCommercialPublishabilityError,
  toAbsoluteUrl,
} from "@/api/client";
import {
  deleteServiceFile,
  getServiceInformation,
  getServicePricing,
  updateServiceInformation,
  type ProviderPublishability,
  type ServiceInformationCurrentValues,
} from "@/api/service-management";
import { AddressModal } from "@/components/AddressModal";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PublishabilityIssues } from "@/components/template-form/PublishabilityIssues";
import { TemplateSection } from "@/components/template-form/TemplateSection";
import type { ExistingFile } from "@/components/template-form/controls";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import {
  useTemplateForm,
  type ServerErrorResult,
} from "@/hooks/use-template-form";
import {
  ACKNOWLEDGEMENT_KEY,
  asTemplate,
  buildInformationFormData,
  findFieldBySubmitKey,
  isPricingStepField,
  valuesFromCurrent,
  valuesFromPricing,
  type FormTemplate,
  type FormValues,
  type TemplateField,
} from "@/services/template";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
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

interface LoadedInformation {
  template: FormTemplate;
  values: FormValues;
  current: ServiceInformationCurrentValues;
  publishability: ProviderPublishability | null;
}

/**
 * The acknowledgement is accepted at create and never resubmitted. The business
 * format and the fields that depend on it or on pricing are edited on the
 * pricing screen, since changing the format changes the pricing rules. Their
 * stored values are still submitted here, unchanged.
 */
function isEditableField(field: TemplateField, template: FormTemplate): boolean {
  return field.field_key !== ACKNOWLEDGEMENT_KEY && !isPricingStepField(field, template);
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

/**
 * Stored dynamic file paths under a field key in `answers_json`. The backend
 * inserts uploaded file URLs there as strings; anything else is ignored.
 */
function storedDynamicPaths(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.filter((item): item is string => typeof item === "string");
}

function dynamicFieldKey(field: TemplateField): string {
  return field.submit_as?.type === "dynamic_files"
    ? field.submit_as.field_key ?? field.field_key
    : field.field_key;
}

export default function EditServiceInformationScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const serviceId = Number(id);

  const [loaded, setLoaded] = useState<LoadedInformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The address shown for provider-location fulfillment: the provider default
  // address snapshotted on the service (for individual and business services
  // alike), else the current default address. Saving re-snapshots the default,
  // so the provider can change it from this screen.
  const [address, setAddress] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const loadedOnce = useRef(false);
  // Set when we send the provider to /add-address so the new default is
  // picked up when they come back.
  const refreshAddressOnFocus = useRef(false);

  // Stored files marked for deletion; sent as delete_*_ids[] on save.
  const [removedPortfolioIds, setRemovedPortfolioIds] = useState<number[]>([]);
  const [removedCertificateIds, setRemovedCertificateIds] = useState<number[]>([]);
  // Stored dynamic file paths per field_key. These can only be removed through
  // the file endpoint, so deletion is immediate after confirmation.
  const [dynamicPaths, setDynamicPaths] = useState<Record<string, string[]>>({});
  const [pendingDynamicDelete, setPendingDynamicDelete] = useState<{
    field: TemplateField;
    file: ExistingFile;
  } | null>(null);

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
        // Pricing is not edited here, but capability fields such as session
        // duration are shown/required based on the saved pricing type and unit.
        getServicePricing(serviceId).catch(() => null),
      ]);
      if (!data.template) {
        throw new ApiError("The service form could not be loaded.", 422);
      }
      const template = withoutPricing(asTemplate(data.template));
      const current = data.current_values ?? {};
      const values = {
        ...valuesFromCurrent(template, current),
        ...(pricing ? valuesFromPricing(pricing) : {}),
      };
      // Keeps the hidden acknowledgement valid; it is dropped from the payload.
      values[ACKNOWLEDGEMENT_KEY] = current.information_accuracy_acknowledgement ?? true;

      const answers = current.answers_json ?? {};
      const paths: Record<string, string[]> = {};
      for (const field of template.fields) {
        if (field.submit_as?.type !== "dynamic_files") continue;
        paths[field.field_key] = storedDynamicPaths(answers[dynamicFieldKey(field)]);
      }
      setDynamicPaths(paths);
      setRemovedPortfolioIds([]);
      setRemovedCertificateIds([]);
      setLoaded({
        template,
        values,
        current,
        publishability: data.publishability ?? null,
      });

      setAddress(current.address?.address ?? null);
      if (!current.address?.address) {
        getDefaultAddress()
          .then((saved) => setAddress(saved?.address ?? null))
          .catch(() => {});
      }
    } catch (error) {
      setLoaded(null);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Couldn't load the service information.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, serviceId]);

  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce.current) {
        loadedOnce.current = true;
        load();
      } else if (refreshAddressOnFocus.current) {
        refreshAddressOnFocus.current = false;
        getDefaultAddress()
          .then((saved) => setAddress(saved?.address ?? null))
          .catch(() => {});
      }
    }, [load]),
  );

  // ── Default address ───────────────────────────────────────────────────────
  function goToAddAddress() {
    setAddressModalOpen(false);
    refreshAddressOnFocus.current = true;
    router.push("/add-address");
  }

  async function handleUseCurrentLocation(location: ResolvedLocation) {
    const saved = await createAddress({ ...location, is_default: true });
    setAddress(saved.address);
    setAddressModalOpen(false);
  }

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

    for (const [fieldKey, paths] of Object.entries(dynamicPaths)) {
      map[fieldKey] = paths.map((path) => ({
        key: path,
        url: toAbsoluteUrl(path) ?? path,
      }));
    }
    return map;
  }, [loaded, removedPortfolioIds, removedCertificateIds, dynamicPaths]);

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
    switch (field.submit_as?.type) {
      case "certificate_bundle":
        setRemovedCertificateIds((prev) => [...prev, Number(file.key)]);
        break;
      case "dynamic_files":
        setPendingDynamicDelete({ field, file });
        break;
      default:
        setRemovedPortfolioIds((prev) => [...prev, Number(file.key)]);
    }
  }

  async function confirmDynamicDelete() {
    const target = pendingDynamicDelete;
    setPendingDynamicDelete(null);
    if (!target) return;
    try {
      await deleteServiceFile(serviceId, {
        file_type: "dynamic",
        field_key: dynamicFieldKey(target.field),
        file_path: target.file.key,
      });
      setDynamicPaths((prev) => ({
        ...prev,
        [target.field.field_key]: (prev[target.field.field_key] ?? []).filter(
          (path) => path !== target.file.key,
        ),
      }));
    } catch (error) {
      setDialog({
        title: "Couldn't delete file",
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
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
      if (isCommercialPublishabilityError(error)) {
        showFieldErrors("Listing not publishable yet", form.applyServerErrors(error));
        return;
      }
      const result = form.applyServerIssues(error);
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
        <ScreenHeader title="Service Information" />
        <ActivityIndicator size="large" color={primary[400]} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Service Information" />
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={neutral[300]} />
          <Text style={styles.errorText}>
            {loadError ?? "Couldn't load the service information."}
          </Text>
          <Button title="Try again" variant="primary" size="md" onPress={load} />
          <Button title="Back" variant="ghost" size="md" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const { template } = loaded;
  const sections = form.sections;
  const unsectioned = form.unsectionedFields.filter((f) => isEditableField(f, template));
  const hasErrors = Object.keys(form.errors).length > 0;

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Service Information" />

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
            // Fields the template left outside any section join the last one.
            const all = index === sections.length - 1 ? [...fields, ...unsectioned] : fields;
            if (!all.length) return null;
            return (
              <View key={section.section_key ?? String(index)} style={styles.card}>
                <TemplateSection
                  section={section}
                  fields={all}
                  template={template}
                  values={form.values}
                  errors={form.errors}
                  isRequired={form.isRequired}
                  setValue={form.setValue}
                  defaultAddress={address ? { address } : null}
                  onAddAddress={() => setAddressModalOpen(true)}
                  onChangeAddress={goToAddAddress}
                  existingFiles={existingFiles}
                  onRemoveExistingFile={handleRemoveExisting}
                />
              </View>
            );
          })}

          {!sections.length && unsectioned.length ? (
            <View style={styles.card}>
              <TemplateSection
                section={{ title: "Service Information", help_text: null }}
                fields={unsectioned}
                template={template}
                values={form.values}
                errors={form.errors}
                isRequired={form.isRequired}
                setValue={form.setValue}
                defaultAddress={address ? { address } : null}
                onAddAddress={() => setAddressModalOpen(true)}
                onChangeAddress={goToAddAddress}
                existingFiles={existingFiles}
                onRemoveExistingFile={handleRemoveExisting}
              />
            </View>
          ) : null}
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

      <AddressModal
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onUseCurrentLocation={handleUseCurrentLocation}
        onAddAddress={goToAddAddress}
      />

      <ConfirmModal
        visible={savedModalVisible}
        type="success"
        title="Information Updated"
        message="Your service information has been saved successfully."
        confirmLabel="View Service"
        onConfirm={() => {
          setSavedModalVisible(false);
          router.replace(`/service-detail/${id}`);
        }}
      />

      <ConfirmModal
        visible={pendingDynamicDelete !== null}
        title="Delete this file?"
        message="This file will be removed from your service right away. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setPendingDynamicDelete(null)}
        onConfirm={confirmDynamicDelete}
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
