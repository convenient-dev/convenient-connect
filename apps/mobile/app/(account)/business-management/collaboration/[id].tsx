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

const { primary, neutral, text, background, border } = Colors;

const ICON_TILE_SIZE = 44;
const COMPANY_ICON = require("@/assets/global-icons/company.svg");

/**
 * Read-only detail of a business the provider has joined as a member.
 *
 * The contract has no per-collaboration endpoint, so this reads the entry
 * from the business list. The list carries name and assigned services but
 * no joined date, and bookings are not attributable to a business, so the
 * completed-bookings count is a placeholder until the API exposes it.
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

  const modal = (
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
  );

  if (loading || !business) {
    return (
      <SafeAreaView
        style={[styles.container, screenPaddingStyle]}
        edges={["top", "bottom"]}
      >
        <StatusBar style="dark" />
        <ScreenHeader title="Collaboration" />
        <View style={styles.centered}>
          {loading ? (
            <ActivityIndicator size="large" color={primary[400]} />
          ) : (
            <Text style={styles.notFoundText}>Collaboration not found</Text>
          )}
        </View>
        {modal}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScreenHeader title="Collaboration" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroDecor} pointerEvents="none" />
          <IconTile />
          <Text style={styles.businessName}>{business.business_name}</Text>
          <Text style={styles.businessSubtitle}>Active affiliation</Text>
        </View>

        <View style={styles.statsCard}>
          <Stat label="Approved services" value={String(services.length)} />
          <View style={styles.statsDivider} />
          <Stat label="Completed bookings" value="—" />
        </View>

        <View style={styles.servicesCard}>
          <Text style={styles.sectionTitle}>Provided Services</Text>
          {services.length > 0 ? (
            <ServiceChips services={services} />
          ) : (
            <Text style={styles.emptyText}>
              No services have been assigned to you yet.
            </Text>
          )}
        </View>
      </ScrollView>

      {modal}
    </SafeAreaView>
  );
}

function IconTile() {
  return (
    <View style={styles.iconTile}>
      <ExpoImage source={COMPANY_ICON} style={styles.icon} contentFit="contain" />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <IconTile />
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },

  hero: {
    borderRadius: 16,
    backgroundColor: primary[50],
    padding: 20,
    paddingTop: 24,
    overflow: "hidden",
  },
  heroDecor: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: primary[100],
  },
  businessName: {
    fontSize: 20,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 28,
  },
  businessSubtitle: {
    fontSize: 15,
    color: neutral[500],
    letterSpacing: -0.408,
    marginTop: 4,
  },

  statsCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
    paddingVertical: 14,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
  },
  statInfo: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: text.primary,
    letterSpacing: -0.408,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },

  servicesCard: {
    borderRadius: 16,
    backgroundColor: neutral[50],
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  iconTile: {
    width: ICON_TILE_SIZE,
    height: ICON_TILE_SIZE,
    borderRadius: 10,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 24,
    height: 24,
  },
});
