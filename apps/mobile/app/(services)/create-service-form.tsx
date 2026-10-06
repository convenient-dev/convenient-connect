import { createAddress, getDefaultAddress, type Address } from "@/api/address";
import {
  ApiError,
  getValidationIssues,
  isCommercialPublishabilityError,
} from "@/api/client";
import type { MultipartFile } from "@/api/multipart";
import {
  createService,
  getServiceFormTemplate,
} from "@/api/service-management";
import { AddressModal } from "@/components/AddressModal";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { StepProgressHeader } from "@/components/StepProgressHeader";
import { TemplateSection } from "@/components/template-form/TemplateSection";
import {
  CREATE_SERVICE_BASE_STEPS,
  type CreateServiceContextParams,
} from "@/constants/create-service";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useTemplateForm } from "@/hooks/use-template-form";
import {
  PRICING_VALUE_KEYS,
  asTemplate,
  buildCreateFormData,
  resolveCurrency,
  selectedFulfillmentCodes,
  type CertificateBundleValue,
  type FormTemplate,
  type FormValues,
  type TemplateField,
} from "@/services/template";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background, status, border } = Colors;

type Params = CreateServiceContextParams & {
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
};

const ADDRESS_ERROR_HINT = "default address";

// ---------------------------------------------------------------------------
// Review helpers
// ---------------------------------------------------------------------------

function optionLabels(field: TemplateField, value: unknown): string {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((v) => field.options?.find((o) => String(o.value) === String(v))?.label ?? String(v))
    .join(", ");
}

function reviewValue(
  field: TemplateField,
  values: FormValues,
  defaultAddress: Address | null,
): string | null {
  const value = values[field.field_key];
  if (field.submit_as?.type === "display_only") return defaultAddress?.address ?? null;
  if (field.submit_as?.type === "certificate_bundle") {
    const bundle = (value ?? {}) as CertificateBundleValue;
    const count = bundle.files?.length ?? 0;
    if (!count && !bundle.description) return null;
    return `${bundle.description ?? ""}${count ? ` (${count} file${count === 1 ? "" : "s"})` : ""}`.trim();
  }
  if (value === undefined || value === null || value === "") return null;
  switch (field.field_type) {
    case "number": {
      const unit = field.unit_value_key ? values[field.unit_value_key] : undefined;
      return unit ? `${value} ${unit}` : String(value);
    }
    case "multi_select":
    case "single_select":
      return optionLabels(field, value);
    case "yes_no":
      return value === true ? "Yes" : "No";
    case "file_upload":
      return Array.isArray(value) ? `${value.length} file${value.length === 1 ? "" : "s"}` : null;
    default:
      return String(value);
  }
}

function pricingSummary(template: FormTemplate, values: FormValues): string[] {
  const pricingField = template.fields.find((f) => f.field_type === "pricing");
  const type = values[PRICING_VALUE_KEYS.pricingType];
  if (!pricingField || !type) return [];
  const typeLabel =
    pricingField.pricing_types?.find((o) => o.value === type)?.label ?? String(type);
  const unit = pricingField.price_units?.find(
    (u) => String(u.value) === String(values[PRICING_VALUE_KEYS.priceUnitId]),
  );
  const { currency } = resolveCurrency(template.currency_context, {
    fulfillmentCodes: selectedFulfillmentCodes(template, values),
    chargeInUsd: values[PRICING_VALUE_KEYS.chargeInUsd] === true,
  });
  const lines = [typeLabel];
  const amount = values[PRICING_VALUE_KEYS.amount];
  if (amount !== undefined && amount !== "") lines.push(`${currency} ${amount}${unit ? ` / ${unit.label.replace(/^per\s+/i, "")}` : ""}`);
  else if (unit) lines.push(unit.label);
  const scope = values[PRICING_VALUE_KEYS.profilePricingScope];
  if (scope) lines.push(scope === "per_profile" ? "Each selected profile" : "Entire request");
  return lines;
}

// ---------------------------------------------------------------------------

export default function CreateServiceFormScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const {
    categoryId,
    categoryName,
    subcategoryId,
    subcategoryName,
    providerType,
    businessId,
    businessName,
  } = useLocalSearchParams<Params>();

  const identity = useMemo(
    () => ({
      categoryId: Number(categoryId),
      subcategoryId: Number(subcategoryId),
      providerType: (providerType ?? "individual") as "individual" | "business",
      businessId: businessId ? Number(businessId) : undefined,
    }),
    [categoryId, subcategoryId, providerType, businessId],
  );

  // ── Template ─────────────────────────────────────────────────────────────
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [needsAddress, setNeedsAddress] = useState(false);

  const loadTemplate = useCallback(async () => {
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      const data = await getServiceFormTemplate(identity);
      setTemplate(asTemplate(data));
      setNeedsAddress(false);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Couldn't load the service form.";
      if (message.toLowerCase().includes(ADDRESS_ERROR_HINT)) setNeedsAddress(true);
      setTemplateError(message);
    } finally {
      setTemplateLoading(false);
    }
  }, [identity]);

  // ── Default address (display-only field, also required by the template) ──
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const loadedOnce = useRef(false);
  // Set when we send the provider to /add-address so the template is
  // requested again when they come back.
  const retryOnFocus = useRef(false);

  const refreshAddress = useCallback(() => {
    getDefaultAddress()
      .then(setDefaultAddress)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAddress();
      if (!loadedOnce.current || retryOnFocus.current) {
        loadedOnce.current = true;
        retryOnFocus.current = false;
        loadTemplate();
      }
    }, [refreshAddress, loadTemplate]),
  );

  function goToAddAddress() {
    setAddressModalOpen(false);
    retryOnFocus.current = !template;
    router.push("/add-address");
  }

  async function handleUseCurrentLocation(location: { address: string; latitude: number; longitude: number }) {
    const saved = await createAddress({ ...location, is_default: true });
    setDefaultAddress(saved);
    setAddressModalOpen(false);
    if (!template) loadTemplate();
  }

  // ── Form state ───────────────────────────────────────────────────────────
  const form = useTemplateForm(template);
  const { sections, fieldsForSection, unsectionedFields } = form;

  const [pageIndex, setPageIndex] = useState(0);
  const reviewIndex = sections.length;
  const isReview = pageIndex === reviewIndex;
  const totalSteps = CREATE_SERVICE_BASE_STEPS + sections.length + 1;
  const currentStep = CREATE_SERVICE_BASE_STEPS + pageIndex + 1;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [pageIndex]);

  const pageFields = useCallback(
    (index: number): TemplateField[] => {
      const section = sections[index];
      if (!section) return [];
      const fields = fieldsForSection(section);
      return index === sections.length - 1 ? [...fields, ...unsectionedFields] : fields;
    },
    [sections, fieldsForSection, unsectionedFields],
  );

  // ── Submit ───────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  async function handleSubmit() {
    if (!template || submitting) return;
    if (!form.validateAll()) {
      const index = form.firstSectionWithErrors();
      setPageIndex(index === -1 ? 0 : index);
      setDialog({
        title: "Some details need attention",
        message: "Please review the highlighted fields before submitting.",
      });
      return;
    }
    setSubmitting(true);
    form.clearGeneralErrors();
    try {
      const formData = buildCreateFormData(template, form.values, identity);
      await createService(formData);
      setSubmitted(true);
    } catch (e) {
      if (isCommercialPublishabilityError(e)) {
        form.applyServerErrors(e);
        const index = form.firstSectionWithErrors();
        if (index !== -1) setPageIndex(index);
        setDialog({ title: "Listing not publishable yet", message: e.message });
      } else {
        // Plain 422s may still carry structured issues; show them and mark fields.
        const hadIssues = form.applyServerIssues(e);
        if (hadIssues) {
          const index = form.firstSectionWithErrors();
          if (index !== -1) setPageIndex(index);
        }
        const details = getValidationIssues(e)
          .slice(0, 5)
          .map((issue) => `• ${issue.message}`)
          .join("\n");
        const message = e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
        setDialog({
          title: "Couldn't submit service",
          message: details && details !== `• ${message}` ? `${message}\n\n${details}` : message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (isReview) {
      handleSubmit();
      return;
    }
    if (form.validateFields(pageFields(pageIndex))) setPageIndex(pageIndex + 1);
  }

  function handleBack() {
    if (pageIndex === 0) router.back();
    else setPageIndex(pageIndex - 1);
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <View style={styles.successContainer}>
          <ExpoImage
            source={require("@/assets/global-icons/successful.svg")}
            style={styles.illustrationImg}
            contentFit="contain"
          />
          <Text style={styles.successTitle}>Service Submitted!</Text>
          <Text style={styles.successDesc}>
            Your service is pending review, which usually takes up to 24 hours.
            We&apos;ll notify you once it&apos;s approved.
          </Text>
          <Button
            title="View my Services"
            variant="primary"
            size="lg"
            style={{ marginTop: 16 }}
            onPress={() => router.replace("/(tabs)/services")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading / error states ───────────────────────────────────────────────
  if (templateLoading && !template) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <StepProgressHeader step={CREATE_SERVICE_BASE_STEPS + 1} totalSteps={CREATE_SERVICE_BASE_STEPS + 2} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <StepProgressHeader step={CREATE_SERVICE_BASE_STEPS + 1} totalSteps={CREATE_SERVICE_BASE_STEPS + 2} />
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={neutral[300]} />
          <Text style={styles.errorText}>{templateError ?? "Couldn't load the service form."}</Text>
          {needsAddress ? (
            <Button title="Add default address" variant="primary" size="md" onPress={() => setAddressModalOpen(true)} />
          ) : (
            <Button title="Try again" variant="primary" size="md" onPress={loadTemplate} />
          )}
          <Button title="Back" variant="ghost" size="md" onPress={() => router.back()} />
        </View>
        <AddressModal
          visible={addressModalOpen}
          onClose={() => setAddressModalOpen(false)}
          onUseCurrentLocation={handleUseCurrentLocation}
          onAddAddress={goToAddAddress}
        />
      </SafeAreaView>
    );
  }

  const section = sections[pageIndex];

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <StepProgressHeader step={currentStep} totalSteps={totalSteps} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            isReview ? styles.scrollContentReview : styles.scrollContent,
            contentWidthStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isReview && section ? (
            <>
              <Text style={styles.title}>{section.title}</Text>
              {section.help_text ? <Text style={styles.subtitle}>{section.help_text}</Text> : null}
              <TemplateSection
                section={section}
                fields={pageFields(pageIndex)}
                template={template}
                values={form.values}
                errors={form.errors}
                isRequired={form.isRequired}
                setValue={form.setValue}
                defaultAddress={defaultAddress}
                onAddAddress={() => setAddressModalOpen(true)}
                hideTitle
              />
            </>
          ) : (
            <>
              <Text style={[styles.title, styles.reviewTitle]}>Review Your Service</Text>
              <Text style={[styles.subtitle, styles.reviewSubtitle]}>
                Make sure everything looks right before submitting
              </Text>

              {form.generalErrors.length ? (
                <View style={styles.generalErrorBox}>
                  {form.generalErrors.map((message, i) => (
                    <Text key={i} style={styles.generalErrorText}>{message}</Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.reviewSection}>
                <Text style={styles.sectionLabel}>SERVICE CATEGORY</Text>
                <ReviewRow label="Category" value={categoryName ?? template.category?.name ?? ""} />
                <ReviewRow label="Subcategory" value={subcategoryName ?? template.subcategory?.name ?? ""} />
                <ReviewRow
                  label="Work Type"
                  value={identity.providerType === "business" ? `Business${businessName ? ` · ${businessName}` : ""}` : "Freelance"}
                />
              </View>

              {sections.map((s, index) => {
                const fields = pageFields(index);
                if (!fields.length) return null;
                return (
                  <View key={s.section_key} style={styles.reviewSection}>
                    <View style={styles.reviewHeaderRow}>
                      <Text style={styles.sectionLabel}>{s.title.toUpperCase()}</Text>
                      <TouchableOpacity style={styles.editBtn} onPress={() => setPageIndex(index)} activeOpacity={0.7}>
                        <Feather name="edit-2" size={12} color={neutral[600]} />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                    {fields.map((field) => {
                      if (field.field_type === "pricing") {
                        const lines = pricingSummary(template, form.values);
                        return lines.length ? (
                          <ReviewBlock key={field.field_key} label={field.label} value={lines.join("\n")} error={form.errors[PRICING_VALUE_KEYS.pricingType] ?? form.errors[PRICING_VALUE_KEYS.amount] ?? form.errors[PRICING_VALUE_KEYS.priceUnitId] ?? form.errors[PRICING_VALUE_KEYS.profilePricingScope]} />
                        ) : null;
                      }
                      if (field.field_type === "file_upload" && Array.isArray(form.values[field.field_key])) {
                        const files = form.values[field.field_key] as MultipartFile[];
                        const images = files.filter((f) => f.type.startsWith("image/"));
                        if (images.length) {
                          return (
                            <View key={field.field_key} style={styles.fieldBlock}>
                              <Text style={styles.fieldLabel}>{field.label}</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {images.map((f, i) => (
                                  <ExpoImage key={`${f.uri}-${i}`} source={{ uri: f.uri }} style={styles.reviewImage} contentFit="cover" />
                                ))}
                              </ScrollView>
                            </View>
                          );
                        }
                      }
                      const value = reviewValue(field, form.values, defaultAddress);
                      if (value === null) return null;
                      return <ReviewBlock key={field.field_key} label={field.label} value={value} error={form.errors[field.field_key]} />;
                    })}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button title="Back" variant="secondary" size="md" style={{ flex: 1 }} onPress={handleBack} />
        <Button
          title={isReview ? "Submit" : "Next"}
          variant="primary"
          size="md"
          style={{ flex: 1 }}
          loading={submitting}
          onPress={handleNext}
        />
      </View>

      <AddressModal
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onUseCurrentLocation={handleUseCurrentLocation}
        onAddAddress={goToAddAddress}
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineRow}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <Text style={styles.inlineValue}>{value}</Text>
    </View>
  );
}

function ReviewBlock({ label, value, error }: { label: string; value: string; error?: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.screen },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  scrollContentReview: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },
  title: { fontSize: 22, fontWeight: "700", color: neutral[800], textAlign: "center", lineHeight: 30, marginBottom: 8 },
  subtitle: { fontSize: 14, color: neutral[400], textAlign: "center", lineHeight: 20, marginBottom: 24 },
  reviewTitle: { marginTop: 16 },
  reviewSubtitle: { marginBottom: 4 },
  errorText: { fontSize: 14, color: neutral[500], textAlign: "center", lineHeight: 20 },
  generalErrorBox: { borderWidth: 1, borderColor: status.error, borderRadius: 10, padding: 12, gap: 4 },
  generalErrorText: { fontSize: 13, color: status.error },
  reviewSection: {
    backgroundColor: background.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: neutral[200],
    padding: 16,
    gap: 8,
  },
  reviewHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: neutral[400], letterSpacing: 0.5 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.screen,
  },
  editBtnText: { fontSize: 12, fontWeight: "500", color: neutral[600] },
  fieldBlock: { gap: 2 },
  fieldLabel: { fontSize: 11, fontWeight: "500", color: neutral[400] },
  fieldValue: { fontSize: 13, color: neutral[700], lineHeight: 19 },
  inlineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inlineLabel: { fontSize: 12, color: neutral[400] },
  inlineValue: { fontSize: 12, color: neutral[700], flexShrink: 1, textAlign: "right" },
  inlineError: { fontSize: 12, color: status.error },
  reviewImage: { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, gap: 16 },
  illustrationImg: { width: 180, height: 180, marginBottom: 8 },
  successTitle: { fontSize: 24, fontWeight: "700", color: neutral[800], textAlign: "center" },
  successDesc: { fontSize: 14, color: neutral[400], textAlign: "center", lineHeight: 21 },
});
