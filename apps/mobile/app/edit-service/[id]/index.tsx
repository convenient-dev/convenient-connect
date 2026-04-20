import { BackButton } from "@/components/BackButton";
import { ServiceStatusBadge } from "@/components/ServiceStatusBadge";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const SECTION_ICONS: Record<string, number> = {
  OVERVIEW: require("@/assets/global-icons/provider-type.svg"),
  "SERVICE CATEGORY": require("@/assets/global-icons/category.svg"),
  "SERVICE INFORMATION": require("@/assets/global-icons/info.svg"),
  PRICING: require("@/assets/global-icons/pricing.svg"),
};

interface ServiceSummary {
  id: number;
  title: string;
  status: "active" | "inactive" | "pendingReview";
  serviceMode: "freelance" | "business";
  searchActive: boolean;
  subcategory: { name: string; category: { name: string } } | null;
}

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

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [service, setService] = useState<ServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchActive, setSearchActive] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  function navigateToInformation() {
    router.push({ pathname: "/edit-service/[id]/information", params: { id } });
  }

  function navigateToPricing() {
    router.push({ pathname: "/edit-service/[id]/pricing", params: { id } });
  }

  function handleTapInformation() {
    if (!service) return;
    if (service.status === "pendingReview") {
      setConfirmModal({
        title: "Service Under Review",
        message:
          "Any edits will resubmit this service for review, which may extend the pending period. Do you want to continue?",
        onConfirm: navigateToInformation,
      });
    } else {
      // active or inactive: editing information changes status to pendingReview
      setConfirmModal({
        title: "Status Will Change",
        message:
          "Editing service information will move this service back to Pending Review while it's re-evaluated. Do you want to continue?",
        onConfirm: navigateToInformation,
      });
    }
  }

  function handleToggleSearch(newValue: boolean) {
    setConfirmModal({
      title: newValue ? "Enable Search?" : "Disable Search?",
      message: newValue
        ? "Clients will be able to discover your service and request bookings."
        : "Your service will be hidden from search results. Existing bookings won't be affected.",
      onConfirm: async () => {
        const newStatus = newValue ? "active" : "inactive";
        setSearchActive(newValue);
        setService((prev) => prev ? { ...prev, status: newStatus } : prev);
        await fetch(`${API_BASE_URL}/services/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ searchActive: newValue }),
        });
      },
    });
  }

  function handleTapPricing() {
    if (!service) return;
    if (service.status === "pendingReview") {
      setConfirmModal({
        title: "Service Under Review",
        message:
          "Any edits will resubmit this service for review, which may extend the pending period. Do you want to continue?",
        onConfirm: navigateToPricing,
      });
    } else {
      // active or inactive: pricing edits do not change status
      navigateToPricing();
    }
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/services/${id}`)
      .then((res) => res.json())
      .then((data: ServiceSummary) => {
        setService(data);
        setSearchActive(data.searchActive ?? false);
      })
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

  const searchToggleValue =
    service.status === "active"
      ? true
      : service.status === "inactive"
        ? false
        : searchActive;
  const searchToggleDisabled = service.status === "pendingReview";
  const searchHint =
    service.status === "pendingReview"
      ? "Search is paused while your service is under review."
      : service.status === "inactive"
        ? "Search is off while your service is inactive."
        : searchToggleValue
          ? "Clients can discover you and request bookings."
          : "You won't appear in client search results.";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Service</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {service.title}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
              onValueChange={searchToggleDisabled ? undefined : handleToggleSearch}
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
            <ServiceStatusBadge status={service.status} />
          </View>
          <InlineRow
            label="Service Type"
            value={
              service.serviceMode === "business" ? "Business" : "Freelance"
            }
          />
        </View>

        {/* Service Category */}
        <View style={styles.section}>
          <SectionHeader label="SERVICE CATEGORY" />
          <InlineRow
            label="Category"
            value={service.subcategory?.category.name ?? "—"}
          />
          <InlineRow
            label="Subcategory"
            value={service.subcategory?.name ?? "—"}
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
            <View style={[styles.navIcon]}>
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
            <View style={[styles.navIcon]}>
              <ExpoImage
                source={SECTION_ICONS["PRICING"]}
                style={styles.sectionIcon}
              />
            </View>
            <View style={styles.navRowContent}>
              <Text style={styles.navRowLabel}>Pricing</Text>
              <Text style={styles.navRowSub}>Base rate and add-ons</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={neutral[300]}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation modal */}
      <Modal
        visible={confirmModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setConfirmModal(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="info-outline" size={28} color="#b45309" />
            </View>
            <Text style={styles.modalTitle}>{confirmModal?.title}</Text>
            <Text style={styles.modalMessage}>{confirmModal?.message}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModal(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  const fn = confirmModal?.onConfirm;
                  setConfirmModal(null);
                  fn?.();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  loader: { flex: 1 },
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#222b45",
  },
  headerSubtitle: {
    fontSize: 12,
    color: neutral[400],
    maxWidth: 200,
  },
  headerSpacer: { width: 38 },

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
    color: "#303030",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleLabelGroup: {
    flex: 1,
    gap: 3,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#303030",
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
  // navIconTeal: { backgroundColor: primary[50] },
  // navIconRed: { backgroundColor: "#fdecea" },
  // navIconImg: { width: 22, height: 22 },
  navRowContent: {
    flex: 1,
    gap: 2,
  },
  navRowLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#222b45",
  },
  navRowSub: {
    fontSize: 11,
    color: neutral[400],
  },

  // Confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: background.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff8e1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222b45",
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 13,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[600],
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: primary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[0],
  },
});
