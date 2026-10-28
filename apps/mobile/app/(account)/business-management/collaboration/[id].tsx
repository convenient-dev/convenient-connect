import { listBusinesses, type ProviderBusinessListItem } from "@/api/business";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ServiceChips } from "@/components/ServiceChips";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

const ICON_TILE_SIZE = 44;
const COMPANY_ICON = require("@/assets/global-icons/company.svg");

/**
 * Read-only detail of a business the provider has joined as a member.
 *
 * The contract has no per-collaboration endpoint, so this reads the entry
 * from the business list. The list carries name and assigned services but
 * no joined date, and bookings are not attributable to a business, so the
 * affiliation date, completed-bookings count and booking history from the
 * design are placeholders until the API exposes them.
 */
export default function CollaborationDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const businessId = Number(id);

  const [business, setBusiness] = useState<ProviderBusinessListItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!businessId) return;
      setLoading(true);
      listBusinesses()
        .then((items) => {
          const match = items.find((b) => b.business_id === businessId);
          if (!match) {
            setErrorMessage("This collaboration is no longer available.");
            return;
          }
          setBusiness(match);
        })
        .catch((error: any) =>
          setErrorMessage(error?.message || "Failed to load collaboration"),
        )
        .finally(() => setLoading(false));
    }, [businessId]),
  );

  const services = (business?.services ?? []).map((s) => ({
    id: s.sub_category_id ?? 0,
    name: s.sub_category_name ?? "",
  }));

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScreenHeader title="Collaboration" />

      {loading || !business ? (
        <View style={styles.loader}>
          {loading && <ActivityIndicator size="large" color={primary[400]} />}
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.businessCard}>
            <View style={styles.iconTile}>
              <ExpoImage
                source={COMPANY_ICON}
                style={styles.icon}
                contentFit="contain"
              />
            </View>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName} numberOfLines={2}>
                {business.business_name}
              </Text>
              <Text style={styles.businessSubtitle}>Active affiliation</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Approved services" value={String(services.length)} />
            <StatCard label="Completed bookings" value="—" />
          </View>

          <Text style={styles.sectionTitle}>Provided Services</Text>
          {services.length > 0 ? (
            <ServiceChips services={services} />
          ) : (
            <Text style={styles.emptyText}>
              No services have been assigned to you yet.
            </Text>
          )}

          <Text style={styles.sectionTitle}>Booking History</Text>
          <Text style={styles.emptyText}>
            Booking history for this collaboration isn&apos;t available yet.
          </Text>
        </ScrollView>
      )}

      <ConfirmModal
        visible={errorMessage !== null}
        type="error"
        title="Error"
        message={errorMessage ?? ""}
        confirmLabel="OK"
        onConfirm={() => {
          setErrorMessage(null);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.iconTile}>
        <ExpoImage source={COMPANY_ICON} style={styles.icon} contentFit="contain" />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },

  businessCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: neutral[50],
  },
  businessInfo: {
    flex: 1,
    gap: 2,
  },
  businessName: {
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  businessSubtitle: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: neutral[50],
  },
  statInfo: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 13,
    color: text.primary,
    letterSpacing: -0.408,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },

  iconTile: {
    width: ICON_TILE_SIZE,
    height: ICON_TILE_SIZE,
    borderRadius: 8,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 22,
    height: 22,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: neutral[400],
    letterSpacing: -0.408,
  },
});
