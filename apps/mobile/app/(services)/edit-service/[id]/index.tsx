import {
  ApiError,
  getPublishabilityFieldMessages,
  isCommercialPublishabilityError,
} from "@/api/client";
import {
  getServiceCategory,
  getServiceEditOverview,
  toggleServiceStatus,
  type ServiceCategoryInfo,
  type ServiceEditOverview,
} from "@/api/service-management";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  ServiceStatusBadge,
  statusFromLabel,
} from "@/components/ServiceStatusBadge";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

const SECTION_ICONS: Record<string, number> = {
  OVERVIEW: require("@/assets/global-icons/provider-type.svg"),
  "SERVICE CATEGORY": require("@/assets/global-icons/category.svg"),
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

/** `individual` is labeled Freelance on this screen; business shows its name. */
function serviceTypeLabel(overview: ServiceEditOverview): string {
  if (overview.business_id == null) return "Freelance";
  return overview.business_name
    ? `Business · ${overview.business_name}`
    : "Business";
}

export default function EditServiceScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const serviceId = Number(id);

  const [overview, setOverview] = useState<ServiceEditOverview | null>(null);
  const [category, setCategory] = useState<ServiceCategoryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [resultModal, setResultModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      // The category card is secondary, so its failure only shows dashes.
      const [overviewData, categoryData] = await Promise.all([
        getServiceEditOverview(serviceId),
        getServiceCategory(serviceId).catch(() => null),
      ]);
      setOverview(overviewData);
      setCategory(categoryData);
      setLoadError(null);
    } catch (error) {
      setOverview(null);
      setLoadError(
        error instanceof ApiError ? error.message : "Couldn't load this service.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, serviceId]);

  // Reload on focus so edits made on the child screens show up here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function navigateToInformation() {
    router.push({ pathname: "/edit-service/[id]/information", params: { id } });
  }

  function navigateToPricing() {
    router.push({ pathname: "/edit-service/[id]/pricing", params: { id } });
  }

  function confirmEditWhilePending(onConfirm: () => void) {
    setConfirmModal({
      title: "Service Under Review",
      message:
        "Any edits will resubmit this service for review, which may extend the pending period. Do you want to continue?",
      onConfirm,
    });
  }

  function handleTapInformation() {
    if (!overview) return;
    if (statusFromLabel(overview.status_label) === "pendingReview") {
      confirmEditWhilePending(navigateToInformation);
    } else {
      navigateToInformation();
    }
  }

  function handleTapPricing() {
    if (!overview) return;
    if (statusFromLabel(overview.status_label) === "pendingReview") {
      confirmEditWhilePending(navigateToPricing);
    } else {
      navigateToPricing();
    }
  }

  async function toggleStatus() {
    setToggling(true);
    try {
      const data = await toggleServiceStatus(serviceId);
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              status_label: data.status_label,
              search_setting: {
                ...prev.search_setting,
                is_active: data.status_label === "active",
              },
            }
          : prev,
      );
    } catch (error) {
      if (isCommercialPublishabilityError(error)) {
        const lines = Object.values(getPublishabilityFieldMessages(error))
          .flat()
          .map((message) => `• ${message}`);
        setResultModal({
          title: "Can't enable search yet",
          message: ["Resolve these issues first:", ...lines].join("\n"),
        });
      } else {
        setResultModal({
          title: "Couldn't update search setting",
          message:
            error instanceof ApiError
              ? error.message
              : "Something went wrong. Please try again.",
        });
      }
    } finally {
      setToggling(false);
    }
  }

  function handleToggleSearch(newValue: boolean) {
    setConfirmModal({
      title: newValue ? "Enable Search?" : "Disable Search?",
      message: newValue
        ? "Clients will be able to discover your service and request bookings."
        : "Your service will be hidden from search results. Existing bookings won't be affected.",
      onConfirm: toggleStatus,
    });
  }

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

  if (!overview) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Edit Service" />
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {loadError ?? "Service not found."}
          </Text>
          <Button title="Try again" variant="primary" size="md" onPress={load} />
        </View>
      </SafeAreaView>
    );
  }

  const status = statusFromLabel(overview.status_label);
  const searchToggleValue =
    overview.search_setting?.is_active ?? status === "active";
  const searchToggleDisabled =
    toggling || !(overview.search_setting?.can_update ?? status !== "pendingReview");
  const searchHint =
    status === "pendingReview"
      ? "Search is paused while your service is under review."
      : searchToggleValue
        ? "Clients can discover you and request bookings."
        : "You won't appear in client search results.";

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Edit Service" subtitle={overview.title ?? ""} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Search Setting</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.toggleLabel}>
                {searchToggleValue ? "Visible in Search" : "Hidden from Search"}
              </Text>
              <Text style={styles.toggleHint}>{searchHint}</Text>
            </View>
            <Switch
              value={searchToggleValue}
              onValueChange={
                searchToggleDisabled ? undefined : handleToggleSearch
              }
              disabled={searchToggleDisabled}
              trackColor={{ false: neutral[200], true: primary[400] }}
              thumbColor={neutral[0]}
            />
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <SectionHeader label="OVERVIEW" />
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>Status</Text>
            <ServiceStatusBadge status={status} />
          </View>
          <InlineRow label="Service Type" value={serviceTypeLabel(overview)} />
        </View>

        {/* Service Category (read-only; fixed at create) */}
        <View style={styles.section}>
          <SectionHeader label="SERVICE CATEGORY" />
          <InlineRow
            label="Category"
            value={category?.category?.name ?? "—"}
          />
          <InlineRow
            label="Subcategory"
            value={category?.subcategory?.name ?? "—"}
          />
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Service Details</Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={handleTapInformation}
            activeOpacity={0.7}
          >
            <View style={styles.navIcon}>
              <ExpoImage
                source={SECTION_ICONS["SERVICE INFORMATION"]}
                style={styles.sectionIcon}
              />
            </View>
            <View style={styles.navRowContent}>
              <Text style={styles.navRowLabel}>Service Information</Text>
              <Text style={styles.navRowSub}>Title, description, location</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={neutral[300]}
            />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={handleTapPricing}
            activeOpacity={0.7}
          >
            <View style={styles.navIcon}>
              <ExpoImage
                source={SECTION_ICONS["PRICING"]}
                style={styles.sectionIcon}
              />
            </View>
            <View style={styles.navRowContent}>
              <Text style={styles.navRowLabel}>Pricing</Text>
              <Text style={styles.navRowSub}>Pricing type, rate and unit</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={neutral[300]}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={confirmModal !== null}
        title={confirmModal?.title ?? ""}
        message={confirmModal?.message ?? ""}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => {
          const fn = confirmModal?.onConfirm;
          setConfirmModal(null);
          fn?.();
        }}
      />

      <ConfirmModal
        visible={resultModal !== null}
        type="error"
        title={resultModal?.title ?? ""}
        message={resultModal?.message ?? ""}
        confirmLabel="OK"
        onConfirm={() => setResultModal(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  loader: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    textAlign: "center",
    color: neutral[400],
    fontSize: 14,
    lineHeight: 20,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },

  // Section card — mirrors service-detail "section"
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
    fontSize: 11,
    fontWeight: "600",
    color: neutral[400],
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Inline rows — mirrors service-detail "inlineRow"
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
    flexShrink: 1,
    textAlign: "right",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  toggleLabelGroup: {
    flex: 1,
    gap: 3,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: neutral[700],
  },
  toggleHint: {
    fontSize: 11,
    color: neutral[400],
    lineHeight: 16,
  },

  // Nav rows
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[200],
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navRowContent: {
    flex: 1,
    gap: 2,
  },
  navRowLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[800],
  },
  navRowSub: {
    fontSize: 11,
    color: neutral[400],
  },
});
