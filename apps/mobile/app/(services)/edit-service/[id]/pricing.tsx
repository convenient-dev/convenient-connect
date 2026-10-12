import { ApiError, isCommercialPublishabilityError } from "@/api/client";
import {
  getServiceInformation,
  getServicePricing,
  saveServiceCandidate,
  type ServicePricingRecord,
} from "@/api/service-management";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PublishabilityIssues } from "@/components/template-form/PublishabilityIssues";
import { TemplateField } from "@/components/template-form/TemplateField";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import {
  useTemplateForm,
  type ServerErrorResult,
} from "@/hooks/use-template-form";
import {
  asTemplate,
  buildCandidateFormData,
  isPricingStepField,
  valuesFromCurrent,
  valuesFromPricing,
  type FormTemplate,
  type FormValues,
} from "@/services/template";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

interface LoadedPricing {
  /** The full template; its `pricing` field carries the types and price units. */
  template: FormTemplate;
  values: FormValues;
  record: ServicePricingRecord;
}

export default function EditServicePricingScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const serviceId = Number(id);

  const [loaded, setLoaded] = useState<LoadedPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      // The pricing record has the saved values; the information endpoint's
      // candidate_template has the pricing field (types, price units) and the
      // other saved values that decide the active format and currency.
      const [record, info] = await Promise.all([
        getServicePricing(serviceId),
        getServiceInformation(serviceId),
      ]);
      if (!info.candidate_template) {
        throw new ApiError("The pricing form could not be loaded.", 422);
      }
      const template = asTemplate(info.candidate_template);
      setLoaded({
        template,
        values: {
          ...valuesFromCurrent(template, info.current_values),
          ...valuesFromPricing(record),
        },
        record,
      });
    } catch (error) {
      setLoaded(null);
      setLoadError(
        error instanceof ApiError ? error.message : "Couldn't load the service pricing.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const form = useTemplateForm(loaded?.template ?? null, {
    initialValues: loaded?.values,
  });

  const pricingField = loaded?.template.fields.find((f) => f.field_type === "pricing");
  // Pricing plus the business format and the fields that depend on either.
  const stepFields = loaded
    ? form.visible.filter((f) => isPricingStepField(f, loaded.template))
    : [];

  function showFieldErrors(title: string, result: ServerErrorResult) {
    const unmapped = result.general.slice(0, 5).map((m) => `• ${m}`).join("\n");
    const prompt = "Please review the highlighted fields before saving.";
    setDialog({ title, message: unmapped ? `${prompt}\n\n${unmapped}` : prompt });
  }

  async function handleSave() {
    if (!loaded || !pricingField || saving) return;
    if (!form.validateFields(stepFields)) {
      showFieldErrors("Some details need attention", { sectionIndex: -1, general: [] });
      return;
    }
    setSaving(true);
    form.clearGeneralErrors();
    try {
      // The pricing endpoint cannot change the business format, and a format
      // change alters which pricing fields are valid, so the whole listing is
      // re-saved in one transaction. Stored information values are re-sent as is.
      await saveServiceCandidate(serviceId, buildCandidateFormData(loaded.template, form.values));
      setSavedModalVisible(true);
    } catch (error) {
      if (isCommercialPublishabilityError(error)) {
        showFieldErrors("Pricing not publishable yet", form.applyServerErrors(error));
        return;
      }
      const result = form.applyServerIssues(error);
      if (result) {
        showFieldErrors("Some details need attention", result);
        return;
      }
      setDialog({
        title: "Couldn't save pricing",
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Pricing" />
        <ActivityIndicator size="large" color={primary[400]} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!loaded || !pricingField) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Pricing" />
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={neutral[300]} />
          <Text style={styles.errorText}>
            {loadError ?? "Pricing isn't available for this service."}
          </Text>
          <Button title="Try again" variant="primary" size="md" onPress={load} />
          <Button title="Back" variant="ghost" size="md" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const hasErrors = Object.keys(form.errors).length > 0;

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Pricing" subtitle={loaded.record.title ?? undefined} />

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
          <PublishabilityIssues
            publishability={loaded.record.publishability}
            template={loaded.template}
          />

          {form.generalErrors.length ? (
            <View style={styles.generalErrorBox}>
              {form.generalErrors.map((message, index) => (
                <Text key={index} style={styles.generalErrorText}>{message}</Text>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            {stepFields.map((field) => (
              <TemplateField
                key={field.field_key}
                field={field}
                template={loaded.template}
                values={form.values}
                errors={form.errors}
                required={form.isRequired(field)}
                setValue={form.setValue}
              />
            ))}
          </View>
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
        title="Pricing Updated"
        message="Your service pricing has been saved successfully."
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
