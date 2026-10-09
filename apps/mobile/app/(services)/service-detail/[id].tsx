import { ApiError } from "@/api/client";
import {
  getServiceDetails,
  getServiceFormTemplate,
  type ServiceCertificate,
  type ServiceDetails,
  type ServiceDynamicAnswer,
  type ServicePricingData,
  type ServiceStoredFile,
} from "@/api/service-management";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  ServiceStatusBadge,
  statusFromLabel,
} from "@/components/ServiceStatusBadge";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import {
  asTemplate,
  type FieldOption,
  type FormTemplate,
  type TemplateField,
} from "@/services/template";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background, overlay, status: statusColors } = Colors;

// api-doc.json types these nested objects as plain `object`; the keys below
// follow the documented response example, so treat every field as optional.
interface NamedRef {
  id?: number;
  name?: string | null;
}

interface ServiceInfo {
  title?: string;
  description?: string | null;
  additional_information?: string | null;
  tagline?: string | null;
  address?: { address?: string | null } | null;
  service_radius?: number | string | null;
  service_radius_unit?: "mile" | "km" | null;
}

interface LocationContext {
  source?: string;
  address?: string | null;
}

interface PublishabilityIssue {
  field?: string;
  message?: string;
}

/**
 * The screen lays out saved values under the sections of the listing's form
 * template, so it mirrors the create wizard's review step. These are the
 * minimal bits of a template field the read-only view needs.
 */
interface DetailField {
  key: string;
  label: string;
  options?: FieldOption[];
}

interface DetailSection {
  key: string;
  title: string;
  fields: DetailField[];
}

// Used when the template can't be loaded (e.g. the taxonomy changed). Keys
// match the generic field keys every template shares.
const FALLBACK_SECTIONS: DetailSection[] = [
  {
    key: "service_information",
    title: "Service Information",
    fields: [
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "additional_information", label: "Additional Information" },
      { key: "tagline", label: "Tagline" },
      { key: "portfolio_images", label: "Images / Portfolio" },
      { key: "certificates", label: "Certifications / Licenses" },
    ],
  },
  {
    key: "fulfillment_location",
    title: "Fulfillment Location",
    fields: [
      { key: "fulfillment_types", label: "Service Type" },
      { key: "address", label: "Service Address" },
      { key: "service_radius", label: "Service Area Radius" },
    ],
  },
  {
    key: "pricing",
    title: "Pricing",
    fields: [{ key: "pricing", label: "Pricing" }],
  },
];

const OTHER_SECTION_KEY = "other_details";

// Short label/value sections read better as single rows than stacked blocks.
const INLINE_SECTION_KEYS = new Set([
  "fulfillment_location",
  "pricing",
  "service_capability",
  "service_format",
  "business_format",
]);

// Submission-only inputs that aren't listing content.
const HIDDEN_FIELD_KEYS = new Set(["information_accuracy_acknowledgement"]);

const SECTION_ICONS: Record<string, number> = {
  service_category: require("@/assets/global-icons/category.svg"),
  work_type: require("@/assets/global-icons/provider-type.svg"),
  service_information: require("@/assets/global-icons/info.svg"),
  fulfillment_location: require("@/assets/global-icons/fulfillment-icon.svg"),
  service_capability: require("@/assets/global-icons/capability-icon.svg"),
  pricing: require("@/assets/global-icons/pricing.svg"),
};
const DEFAULT_SECTION_ICON = require("@/assets/global-icons/info.svg");
const PORTFOLIO_SECTION_ICON = require("@/assets/global-icons/portfolio-icon.svg");
const CERTIFICATE_SECTION_ICON = require("@/assets/global-icons/certificate-icon.svg");

// Template section keys for portfolio and certification sections aren't
// documented in api-doc.json, so match them by key or title wording.
function sectionIcon(key: string, title: string): number {
  const known = SECTION_ICONS[key];
  if (known) return known;
  const text = `${key} ${title}`.toLowerCase();
  if (/portfolio|image|photo/.test(text)) return PORTFOLIO_SECTION_ICON;
  if (/certif|licen/.test(text)) return CERTIFICATE_SECTION_ICON;
  return DEFAULT_SECTION_ICON;
}

function toDetailField(field: TemplateField): DetailField {
  return {
    key: field.field_key ?? "",
    label: field.label ?? field.field_key ?? "",
    options: field.options,
  };
}

/** Sections in display order; fields outside any section join the last one. */
function sectionsFromTemplate(template: FormTemplate): DetailSection[] {
  const visibleFields = template.fields.filter(
    (f) => !HIDDEN_FIELD_KEYS.has(f.field_key ?? ""),
  );
  const byKey = new Map(visibleFields.map((f) => [f.field_key ?? "", f]));
  const sections: DetailSection[] = [...(template.sections ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((section) => ({
      key: section.section_key ?? section.title ?? "",
      title: section.title ?? "",
      fields: (section.field_keys ?? []).flatMap((key) => {
        const field = byKey.get(key);
        return field ? [toDetailField(field)] : [];
      }),
    }));
  const placed = new Set(sections.flatMap((s) => s.fields.map((f) => f.key)));
  const rest = visibleFields
    .filter((f) => !placed.has(f.field_key ?? ""))
    .map(toDetailField);
  if (rest.length) {
    if (sections.length) sections[sections.length - 1].fields.push(...rest);
    else
      sections.push({ key: OTHER_SECTION_KEY, title: "Details", fields: rest });
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

function formatPricing(pricing: ServicePricingData | undefined): string {
  if (!pricing) return "—";
  const unit = pricing.price_unit?.label;
  if (pricing.pricing_type === "quote_required" || pricing.amount == null) {
    return unit ? `Quote required · ${unit}` : "Quote required";
  }
  const amount = parseFloat(pricing.amount);
  const money = pricing.currency
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: pricing.currency,
      }).format(amount)
    : amount.toFixed(2);
  return unit ? `${money} ${unit.toLowerCase()}` : money;
}

function pricingRows(
  pricing: ServicePricingData | undefined,
): { label: string; value: string }[] {
  const rows = [{ label: "Base Rate", value: formatPricing(pricing) }];
  if (pricing?.profile_pricing_scope) {
    rows.push({
      label: "Applies To",
      value:
        pricing.profile_pricing_scope === "per_profile"
          ? "Each selected profile"
          : "Entire request",
    });
  }
  return rows;
}

function formatRadius(info: ServiceInfo): string | null {
  if (info.service_radius == null || info.service_radius === "") return null;
  const value = parseFloat(String(info.service_radius));
  if (Number.isNaN(value)) return null;
  const unit = info.service_radius_unit === "km" ? "km" : "miles";
  return `${value} ${unit}`;
}

function formatDynamicAnswer(answer: ServiceDynamicAnswer): string | null {
  if (answer.display_value) return answer.display_value;
  if (answer.labeled_values?.length) {
    return answer.labeled_values.map((item) => item.label).join(", ");
  }
  return formatRawValue(answer.value);
}

/** Raw answers_json values, mapped through template options when available. */
function formatRawValue(raw: unknown, options?: FieldOption[]): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  const list = Array.isArray(raw) ? raw : [raw];
  const labels = list.flatMap((item) => {
    const option = options?.find((o) => String(o.value) === String(item));
    if (option) return [option.label];
    return typeof item === "object" ? [] : [String(item)];
  });
  return labels.length ? labels.join(", ") : null;
}

function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|heic)$/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url.split("?")[0]);
}

function fileNameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const last = url.split("?")[0].split("/").pop();
  return last ? decodeURIComponent(last) : null;
}

// ---------------------------------------------------------------------------
// Field content resolution
// ---------------------------------------------------------------------------

type FieldContent =
  | { kind: "text"; value: string }
  | { kind: "images"; files: ServiceStoredFile[] }
  | { kind: "certificate"; certificate: ServiceCertificate }
  | { kind: "pricing"; rows: { label: string; value: string }[] };

function textContent(value: string | null | undefined): FieldContent | null {
  return value ? { kind: "text", value } : null;
}

/**
 * Resolves what to show for one template field from the saved service.
 * Generic fields map to fixed payload keys; everything else is a dynamic
 * answer, with answers_json as the fallback for values the API didn't label.
 */
function contentFor(
  field: DetailField,
  service: ServiceDetails,
  answersByKey: Map<string, ServiceDynamicAnswer>,
): FieldContent | null {
  const info = (service.service_info ?? {}) as ServiceInfo;
  switch (field.key) {
    case "title":
      return textContent(info.title);
    case "description":
      return textContent(info.description);
    case "additional_information":
      return textContent(info.additional_information);
    case "tagline":
      return textContent(info.tagline);
    case "fulfillment_types": {
      const labels = (service.fulfillment_types ?? [])
        .map((type) => type.label)
        .filter(Boolean);
      return textContent(labels.join(", "));
    }
    case "address": {
      const context = service.location_context as
        LocationContext | null | undefined;
      return textContent(context?.address ?? info.address?.address);
    }
    case "service_radius":
      return textContent(formatRadius(info));
    case "portfolio_images": {
      const files = (
        (service.portfolio_images ?? []) as ServiceStoredFile[]
      ).filter((file) => file.url);
      return files.length ? { kind: "images", files } : null;
    }
    case "certificates": {
      const certificate = service.certificate as
        ServiceCertificate | null | undefined;
      const hasFiles = (certificate?.files ?? []).some((file) => file.url);
      return certificate && (certificate.description || hasFiles)
        ? { kind: "certificate", certificate }
        : null;
    }
    case "pricing":
      return { kind: "pricing", rows: pricingRows(service.pricing) };
    default: {
      const answer = answersByKey.get(field.key);
      if (answer) return textContent(formatDynamicAnswer(answer));
      const answers = (service.answers_json ?? {}) as Record<string, unknown>;
      return textContent(formatRawValue(answers[field.key], field.options));
    }
  }
}

// ---------------------------------------------------------------------------
// Presentational pieces
// ---------------------------------------------------------------------------

function SectionHeader({
  sectionKey,
  title,
}: {
  sectionKey: string;
  title: string;
}) {
  const icon = sectionIcon(sectionKey, title);
  return (
    <View style={styles.sectionHeaderRow}>
      <ExpoImage source={icon} style={styles.sectionIcon} />
      <Text style={styles.sectionLabel}>{title}</Text>
    </View>
  );
}

function InlineRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineRow}>
      <Text style={styles.inlineLabel}>{label}</Text>
      <Text style={styles.inlineValue}>{value}</Text>
    </View>
  );
}

function FieldBlock({
  field,
  content,
  inline,
  onImagePress,
}: {
  field: DetailField;
  content: FieldContent;
  inline: boolean;
  onImagePress: (uri: string) => void;
}) {
  switch (content.kind) {
    case "text":
      if (inline)
        return <InlineRow label={field.label} value={content.value} />;
      return (
        <View style={styles.subBlock}>
          <Text style={styles.subBlockLabel}>{field.label}</Text>
          <Text style={styles.bodyText}>{content.value}</Text>
        </View>
      );
    case "images":
      return (
        <View style={styles.subBlock}>
          {/* <Text style={styles.subBlockLabel}>{field.label}</Text> */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScrollRow}
          >
            {content.files.map((img, index) => (
              <TouchableOpacity
                key={img.id ?? index}
                onPress={() => onImagePress(img.url!)}
                activeOpacity={0.85}
              >
                <ExpoImage
                  source={{ uri: img.url! }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    case "certificate":
      return (
        <View style={styles.subBlock}>
          {/* <Text style={styles.subBlockLabel}>{field.label}</Text> */}
          {content.certificate.description ? (
            <Text style={styles.bodyText}>
              {content.certificate.description}
            </Text>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScrollRow}
          >
            {(content.certificate.files ?? []).map((file, index) => {
              if (!file.url) return null;
              const url = file.url;
              const name = fileNameFromUrl(url) ?? "Certificate";
              if (isImageUrl(url)) {
                return (
                  <TouchableOpacity
                    key={file.id ?? index}
                    onPress={() => onImagePress(url)}
                    activeOpacity={0.85}
                  >
                    <ExpoImage
                      source={{ uri: url }}
                      style={styles.thumbnail}
                      contentFit="cover"
                      accessibilityLabel={name}
                    />
                  </TouchableOpacity>
                );
              }
              // Non-image files (PDFs) have no renderable preview; show a
              // document tile that opens the file in the browser.
              return (
                <TouchableOpacity
                  key={file.id ?? index}
                  style={[styles.thumbnail, styles.fileTile]}
                  onPress={() => WebBrowser.openBrowserAsync(url)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="picture-as-pdf"
                    size={32}
                    color={neutral[300]}
                  />
                  <Text style={styles.fileTileName} numberOfLines={2}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      );
    case "pricing":
      return (
        <View style={styles.rowGroup}>
          {content.rows.map((row) => (
            <InlineRow key={row.label} label={row.label} value={row.value} />
          ))}
        </View>
      );
  }
}

function ImageViewerModal({
  uri,
  onClose,
}: {
  uri: string;
  onClose: () => void;
}) {
  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <StatusBar hidden />
        <ExpoImage
          source={{ uri }}
          style={styles.fullscreenImage}
          contentFit="contain"
        />
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={onClose}
          hitSlop={12}
        >
          <MaterialIcons name="close" size={24} color={neutral[0]} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

export default function ServiceDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<ServiceDetails | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const loadService = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const details = await getServiceDetails(Number(id));
      setService(details);
      // The template only shapes the layout, so a failed load falls back to
      // the generic sections rather than blocking the screen.
      const category = details.category as NamedRef | undefined;
      const subcategory = details.subcategory as NamedRef | undefined;
      const business = details.business as NamedRef | null | undefined;
      if (category?.id && subcategory?.id && details.provider_type) {
        try {
          const payload = await getServiceFormTemplate({
            categoryId: category.id,
            subcategoryId: subcategory.id,
            providerType: details.provider_type,
            businessId: business?.id,
          });
          setTemplate(asTemplate(payload));
        } catch {
          setTemplate(null);
        }
      }
    } catch (error) {
      setService(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Something went wrong while loading this service.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  // Load errors send the user back to the previous screen once acknowledged.
  const errorModal = (
    <ConfirmModal
      visible={errorMessage !== null}
      type="error"
      title="Couldn't load service"
      message={errorMessage ?? ""}
      confirmLabel="OK"
      onConfirm={() => {
        setErrorMessage(null);
        router.back();
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <Text style={styles.errorText}>Service not found.</Text>
        {errorModal}
      </SafeAreaView>
    );
  }

  const category = service.category as NamedRef | undefined;
  const subcategory = service.subcategory as NamedRef | undefined;
  const business = service.business as NamedRef | null | undefined;
  const info = (service.service_info ?? {}) as ServiceInfo;
  const isBusiness = service.provider_type === "business";
  const categoryLine = [category?.name, subcategory?.name]
    .filter(Boolean)
    .join(" · ");
  const dynamicAnswers = service.dynamic_answers ?? [];
  const answersByKey = new Map(dynamicAnswers.map((a) => [a.field_key, a]));

  const sections = template
    ? sectionsFromTemplate(template)
    : FALLBACK_SECTIONS;
  // Saved answers the current template no longer knows about still get shown.
  const knownKeys = new Set(
    sections.flatMap((s) => s.fields.map((f) => f.key)),
  );
  const orphanAnswers = dynamicAnswers.filter(
    (a) => !knownKeys.has(a.field_key) && !HIDDEN_FIELD_KEYS.has(a.field_key),
  );

  const issues = Object.values(
    (service.publishability?.issues ?? {}) as Record<
      string,
      PublishabilityIssue[]
    >,
  ).flat();
  const showPublishability =
    service.publishability?.is_publishable === false || issues.length > 0;

  const created = formatDate(service.created_at);
  const updated = formatDate(service.updated_at);

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      {selectedImageUri && (
        <ImageViewerModal
          uri={selectedImageUri}
          onClose={() => setSelectedImageUri(null)}
        />
      )}
      <ScreenHeader title="Service Details" subtitle={info.title} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        {showPublishability && (
          <View style={styles.noticeBox}>
            <MaterialIcons
              name="error-outline"
              size={16}
              color={statusColors.inactive}
            />
            <View style={styles.noticeBody}>
              <Text style={styles.noticeTitle}>Not publishable yet</Text>
              {issues.map((issue, index) =>
                issue.message ? (
                  <Text
                    key={`${issue.field ?? index}`}
                    style={styles.noticeText}
                  >
                    {issue.message}
                  </Text>
                ) : null,
              )}
            </View>
          </View>
        )}

        {/* WORK TYPE */}
        <View style={styles.section}>
          <SectionHeader sectionKey="work_type" title="Work Type" />
          <InlineRow
            label="Work Type"
            value={isBusiness ? "Business" : "Freelance"}
          />
          {isBusiness && business?.name && (
            <InlineRow label="Business" value={business.name} />
          )}
          {service.status_label && (
            <View style={styles.inlineRow}>
              <Text style={styles.inlineLabel}>Status</Text>
              <ServiceStatusBadge
                status={statusFromLabel(service.status_label)}
                size="sm"
                showDescription
              />
            </View>
          )}
        </View>

        {/* SERVICE CATEGORY */}
        <View style={styles.section}>
          <SectionHeader
            sectionKey="service_category"
            title="Service Category"
          />
          {categoryLine && <InlineRow label="Category" value={categoryLine} />}
        </View>

        {/* Template sections */}
        {sections.map((section) => {
          const blocks = section.fields.flatMap((field) => {
            const content = contentFor(field, service, answersByKey);
            return content ? [{ field, content }] : [];
          });
          if (!blocks.length) return null;
          return (
            <View style={styles.section} key={section.key}>
              <SectionHeader sectionKey={section.key} title={section.title} />
              {blocks.map(({ field, content }) => (
                <FieldBlock
                  key={field.key}
                  field={field}
                  content={content}
                  inline={INLINE_SECTION_KEYS.has(section.key)}
                  onImagePress={setSelectedImageUri}
                />
              ))}
            </View>
          );
        })}

        {orphanAnswers.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              sectionKey={OTHER_SECTION_KEY}
              title="Other Details"
            />
            {orphanAnswers.map((answer) => {
              const value = formatDynamicAnswer(answer);
              if (!value) return null;
              return (
                <View style={styles.subBlock} key={answer.field_key}>
                  <Text style={styles.subBlockLabel}>{answer.label}</Text>
                  <Text style={styles.bodyText}>{value}</Text>
                </View>
              );
            })}
          </View>
        )}
        {(created || updated) && (
          <Text style={styles.timestamps}>
            {[created && `Created ${created}`, updated && `Updated ${updated}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
      </ScrollView>
      {errorModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  loader: {
    flex: 1,
  },
  errorText: {
    textAlign: "center",
    marginTop: 40,
    color: neutral[400],
    fontSize: 14,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
    paddingTop: 8,
  },
  // Publishability notice
  noticeBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: statusColors.inactive,
    backgroundColor: "#FCE9B6",
  },
  noticeBody: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[800],
  },
  noticeText: {
    fontSize: 12,
    color: neutral[700],
    lineHeight: 18,
  },
  // Sections
  section: {
    backgroundColor: background.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: neutral[200],
    padding: 16,
    gap: 8,
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  sectionIcon: {
    width: 30,
    height: 30,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[400],
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // Fields
  inlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  inlineLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[700],
  },
  inlineValue: {
    fontSize: 12,
    color: neutral[700],
    flexShrink: 1,
    textAlign: "right",
  },
  subBlock: {
    gap: 5,
    marginTop: 2,
  },
  subBlockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[700],
  },
  bodyText: {
    fontSize: 12,
    color: neutral[600],
    lineHeight: 19,
  },
  imageScrollRow: {
    marginTop: 2,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: neutral[100],
  },
  fileTile: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: neutral[200],
  },
  fileTileName: {
    fontSize: 10,
    color: neutral[600],
    textAlign: "center",
  },
  timestamps: {
    fontSize: 11,
    color: neutral[400],
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: neutral[1000],
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCloseButton: {
    position: "absolute",
    top: 48,
    right: 20,
    backgroundColor: overlay.medium,
    borderRadius: 20,
    padding: 6,
  },
  rowGroup: {
    gap: 8,
  },
});
