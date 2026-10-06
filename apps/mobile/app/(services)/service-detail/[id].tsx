import { ApiError } from "@/api/client";
import {
  getServiceDetails,
  type ServiceCertificate,
  type ServiceDetails,
  type ServiceDynamicAnswer,
  type ServicePricingData,
  type ServiceStoredFile,
} from "@/api/service-management";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
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

const { primary, neutral, background, overlay } = Colors;

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

const SECTION_ICONS: Record<string, number> = {
  "SERVICE CATEGORY": require("@/assets/global-icons/category.svg"),
  "WORK TYPE": require("@/assets/global-icons/provider-type.svg"),
  "SERVICE INFORMATION": require("@/assets/global-icons/info.svg"),
  PRICING: require("@/assets/global-icons/pricing.svg"),
};

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <ExpoImage source={SECTION_ICONS[label]} style={styles.sectionIcon} />
      <Text style={styles.sectionLabel}>{label}</Text>
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

function PricingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pricingRow}>
      <Text style={styles.pricingLabel}>{label}</Text>
      <Text style={styles.pricingValue}>{value}</Text>
    </View>
  );
}

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
  const raw = answer.value;
  if (raw == null || raw === "") return null;
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : null;
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "object") return null;
  return String(raw);
}

function fileNameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const last = url.split("?")[0].split("/").pop();
  return last ? decodeURIComponent(last) : null;
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

export default function ServiceDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<ServiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const loadService = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setService(await getServiceDetails(Number(id)));
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
  const portfolio = (service.portfolio_images ?? []) as ServiceStoredFile[];
  const certificate = service.certificate as ServiceCertificate | null | undefined;
  const certificateFiles = certificate?.files ?? [];
  const fulfillmentTypes = service.fulfillment_types ?? [];
  const dynamicAnswers = service.dynamic_answers ?? [];
  const isBusiness = service.provider_type === "business";
  const radius = formatRadius(info);

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      {selectedImageUri && (
        <ImageViewerModal
          uri={selectedImageUri}
          onClose={() => setSelectedImageUri(null)}
        />
      )}
      {/* Header */}
      <ScreenHeader title="Service Details" subtitle={info.title} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* WORK TYPE */}
        <View style={styles.section}>
          <SectionHeader label="WORK TYPE" />
          <InlineRow
            label="Work Type"
            value={isBusiness ? "Business" : "Freelance"}
          />
          {isBusiness && business?.name && (
            <InlineRow label="Business" value={business.name} />
          )}
        </View>

        {/* SERVICE CATEGORY */}
        <View style={styles.section}>
          <SectionHeader label="SERVICE CATEGORY" />
          {category?.name && (
            <InlineRow label="Category" value={category.name} />
          )}
          {subcategory?.name && (
            <InlineRow label="Subcategory" value={subcategory.name} />
          )}
        </View>

        {/* SERVICE INFORMATION */}
        <View style={styles.section}>
          <SectionHeader label="SERVICE INFORMATION" />

          {info.title ? (
            <Text style={styles.serviceTitle}>{info.title}</Text>
          ) : null}

          {fulfillmentTypes.length > 0 && (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Service Type</Text>
              <Text style={styles.bodyText}>
                {fulfillmentTypes.map((type) => type.label).join(", ")}
              </Text>
            </View>
          )}

          {info.address?.address ? (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Service Address</Text>
              <Text style={styles.bodyText}>{info.address.address}</Text>
            </View>
          ) : null}
          {radius && (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Service Area Radius</Text>
              <Text style={styles.bodyText}>{radius}</Text>
            </View>
          )}

          {/* Dynamic (template) answers */}
          {dynamicAnswers.map((answer) => {
            const value = formatDynamicAnswer(answer);
            if (!value) return null;
            return (
              <View style={styles.subBlock} key={answer.field_key}>
                <Text style={styles.subBlockLabel}>{answer.label}</Text>
                <Text style={styles.bodyText}>{value}</Text>
              </View>
            );
          })}

          {info.description ? (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Description</Text>
              <Text style={styles.bodyText}>{info.description}</Text>
            </View>
          ) : null}

          {info.additional_information ? (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Additional Information</Text>
              <Text style={styles.bodyText}>{info.additional_information}</Text>
            </View>
          ) : null}

          {info.tagline ? (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Tagline</Text>
              <Text style={styles.bodyText}>{info.tagline}</Text>
            </View>
          ) : null}

          {portfolio.length > 0 && (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Images / Portfolio</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageScrollRow}
              >
                {portfolio.map((img, index) =>
                  img.url ? (
                    <TouchableOpacity
                      key={img.id ?? index}
                      onPress={() => setSelectedImageUri(img.url!)}
                      activeOpacity={0.85}
                    >
                      <ExpoImage
                        source={{ uri: img.url }}
                        style={styles.thumbnail}
                        contentFit="cover"
                      />
                    </TouchableOpacity>
                  ) : null,
                )}
              </ScrollView>
            </View>
          )}

          {(certificate?.description || certificateFiles.length > 0) && (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>
                Certifications / Licenses
              </Text>
              {certificate?.description ? (
                <Text style={styles.bodyText}>{certificate.description}</Text>
              ) : null}
              {certificateFiles.map((file, index) =>
                file.url ? (
                  <TouchableOpacity
                    key={file.id ?? index}
                    style={styles.certRow}
                    onPress={() => WebBrowser.openBrowserAsync(file.url!)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="insert-drive-file"
                      size={15}
                      color={neutral[300]}
                    />
                    <Text style={[styles.certText, styles.certTextTappable]}>
                      {fileNameFromUrl(file.url) ?? "Certificate"}
                    </Text>
                  </TouchableOpacity>
                ) : null,
              )}
            </View>
          )}
        </View>

        {/* PRICING */}
        <View style={styles.section}>
          <SectionHeader label="PRICING" />
          <PricingRow
            label="Base Rate"
            value={formatPricing(service.pricing)}
          />
        </View>
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
  },
  inlineLabel: {
    fontSize: 12,
    color: neutral[400],
  },
  inlineValue: {
    fontSize: 12,
    color: neutral[700],
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral[800],
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
  certRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  certText: {
    fontSize: 12,
    color: neutral[700],
    flex: 1,
  },
  certTextTappable: {
    color: primary[500],
    textDecorationLine: "underline",
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
  // Pricing
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  pricingLabel: {
    fontSize: 13,
    color: neutral[700],
    flex: 1,
  },
  pricingValue: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[800],
  },
});
