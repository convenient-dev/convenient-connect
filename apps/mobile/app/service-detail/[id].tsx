import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

interface ServiceDetail {
  id: number;
  title: string;
  status: "active" | "inactive" | "pendingReview";
  serviceMode: "freelance" | "business";
  serviceType: "inPerson" | "remote";
  areaRadius: string | null;
  aboutYou: string;
  description: string;
  slogan: string | null;
  baseRate: string;
  baseRateUnit: "booking" | "hour";
  images: { id: number; url: string; altText: string | null }[];
  certifications: { id: number; url: string; fileName: string | null }[];
  addons: {
    id: number;
    price: string;
    template: {
      name: string;
      description: string | null;
      rateUnit: "booking" | "hour";
    };
  }[];
  customValues: {
    id: number;
    valueText: string | null;
    valueNumber: string | null;
    valueBoolean: boolean | null;
    valueJson: unknown | null;
    field: { fieldLabel: string; fieldType: string };
  }[];
  subcategory: { name: string; category: { name: string } } | null;
  address: { address: string } | null;
  business: { business: { name: string } } | null;
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

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
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

function formatRate(rate: string, unit: "booking" | "hour") {
  return `$${parseFloat(rate).toFixed(2)} ${unit === "booking" ? "per booking" : "per hour"}`;
}

function formatCustomValue(
  cv: ServiceDetail["customValues"][number],
): string | null {
  if (cv.field.fieldType === "boolean") {
    return cv.valueBoolean != null ? (cv.valueBoolean ? "Yes" : "No") : null;
  }
  if (cv.field.fieldType === "number") {
    return cv.valueNumber != null ? String(parseFloat(cv.valueNumber)) : null;
  }
  if (cv.field.fieldType === "multiSelect" && cv.valueJson) {
    return Array.isArray(cv.valueJson) ? cv.valueJson.join(", ") : null;
  }
  return cv.valueText ?? null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/services/${id}`)
      .then((res) => res.json())
      .then((data: ServiceDetail) => setService(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Service not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {selectedImageUri && (
        <ImageViewerModal
          uri={selectedImageUri}
          onClose={() => setSelectedImageUri(null)}
        />
      )}
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Service Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SERVICE CATEGORY */}
        <View style={styles.section}>
          <SectionHeader label="SERVICE CATEGORY" />
          {service.subcategory && (
            <>
              <InlineRow
                label="Category"
                value={service.subcategory.category.name}
              />
              <InlineRow label="Subcategory" value={service.subcategory.name} />
            </>
          )}
        </View>

        {/* WORK TYPE */}
        <View style={styles.section}>
          <SectionHeader label="WORK TYPE" />
          <InlineRow
            label="Work Type"
            value={
              service.serviceMode === "business" ? "Business" : "Freelance"
            }
          />
          {service.serviceMode === "business" && service.business && (
            <InlineRow
              label="Business"
              value={service.business.business.name}
            />
          )}
        </View>

        {/* SERVICE INFORMATION */}
        <View style={styles.section}>
          <SectionHeader label="SERVICE INFORMATION" />

          <Text style={styles.serviceTitle}>{service.title}</Text>

          <InlineRow
            label="Service Type"
            value={service.serviceType === "inPerson" ? "In-person" : "Remote"}
          />
          {service.address && (
            <FieldBlock
              label="Service Address"
              value={service.address.address}
            />
          )}
          {service.areaRadius && (
            <InlineRow
              label="Service Area Radius"
              value={`${parseFloat(service.areaRadius)} miles`}
            />
          )}

          {/* Custom field values */}
          {service.customValues.map((cv) => {
            const value = formatCustomValue(cv);
            if (!value) return null;
            return (
              <InlineRow
                key={cv.id}
                label={cv.field.fieldLabel}
                value={value}
              />
            );
          })}

          {service.aboutYou ? (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>About</Text>
              <Text style={styles.bodyText}>{service.aboutYou}</Text>
            </View>
          ) : null}

          {service.description ? (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Description</Text>
              <Text style={styles.bodyText}>{service.description}</Text>
            </View>
          ) : null}

          {service.slogan ? (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Slogan</Text>
              <Text style={styles.bodyText}>{service.slogan}</Text>
            </View>
          ) : null}

          {service.images.length > 0 && (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>Images / Portfolio</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageScrollRow}
              >
                {service.images.map((img) => (
                  <TouchableOpacity
                    key={img.id}
                    onPress={() => setSelectedImageUri(img.url)}
                    activeOpacity={0.85}
                  >
                    <ExpoImage
                      source={{ uri: img.url }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {service.certifications.length > 0 && (
            <View style={styles.subBlock}>
              <Text style={styles.subBlockLabel}>
                Certifications / Licenses
              </Text>
              {service.certifications.map((cert) => (
                <TouchableOpacity
                  key={cert.id}
                  style={styles.certRow}
                  onPress={() => WebBrowser.openBrowserAsync(cert.url)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="insert-drive-file"
                    size={15}
                    color={neutral[300]}
                  />
                  <Text style={[styles.certText, styles.certTextTappable]}>
                    {cert.fileName
                      ? decodeURIComponent(cert.fileName)
                      : "Certificate"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* PRICING */}
        <View style={styles.section}>
          <SectionHeader label="PRICING" />

          <PricingRow
            label="Base Rate"
            value={formatRate(service.baseRate, service.baseRateUnit)}
          />

          {service.addons.length > 0 && (
            <>
              <View style={styles.pricingDivider} />
              {service.addons.map((addon) => (
                <PricingRow
                  key={addon.id}
                  label={addon.template.name}
                  value={formatRate(addon.price, addon.template.rateUnit)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>
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
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#222b45",
  },
  headerSpacer: {
    width: 26,
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
    shadowColor: "#000",
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
    fontSize: 11,
    fontWeight: "600",
    color: neutral[400],
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  // Fields
  fieldBlock: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[400],
  },
  fieldValue: {
    fontSize: 13,
    color: "#303030",
  },
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
    color: "#303030",
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222b45",
  },
  subBlock: {
    gap: 5,
    marginTop: 2,
  },
  subBlockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#303030",
  },
  bodyText: {
    fontSize: 12,
    color: "#505050",
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
    backgroundColor: "#eaeaea",
  },
  certRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  certText: {
    fontSize: 12,
    color: "#303030",
    flex: 1,
  },
  certTextTappable: {
    color: primary[500],
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  modalCloseButton: {
    position: "absolute",
    top: 48,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    color: "#303030",
    flex: 1,
  },
  pricingValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#222b45",
  },
  pricingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[200],
    marginVertical: 4,
  },
});
