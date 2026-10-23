import { ApiError } from "@/api/client";
import {
  listMyServices,
  type ServiceListItem,
  type ServiceListTab,
} from "@/api/service-management";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ServiceAvatar } from "@/components/ServiceAvatar";
import {
  ServiceStatusBadge,
  statusFromLabel,
} from "@/components/ServiceStatusBadge";
import { TabBar } from "@/components/TabBar";
import { withCount } from "@/constants/labels";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

type TabKey = ServiceListTab & string;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "independent", label: "Freelance" },
  { key: "affiliated", label: "Business" },
];

type ViewMode = "card" | "list";

function ServiceCard({
  service,
  onMore,
}: {
  service: ServiceListItem;
  onMore: () => void;
}) {
  return (
    <View style={styles.card}>
      <ServiceAvatar uri={service.portfolio?.url} size={80} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {service.title}
        </Text>
        <ServiceStatusBadge
          status={statusFromLabel(service.status_label)}
          showDescription
        />
        {service.provider_type === "business" && service.business_name && (
          <View style={styles.businessRow}>
            <ExpoImage
              source={require("@/assets/global-icons/business.svg")}
              style={{ width: 12, height: 12 }}
            />
            <Text style={styles.businessName} numberOfLines={1}>
              {service.business_name}
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.moreButton} hitSlop={8} onPress={onMore}>
        <MaterialIcons name="more-horiz" size={22} color={neutral[700]} />
      </TouchableOpacity>
    </View>
  );
}

function ListRowSeparator() {
  return <View style={styles.rowSeparator} />;
}

/** "Caregiving | Seniors"; falls back to whichever name is present. */
function categoryLine(service: ServiceListItem): string | null {
  return (
    [service.category_name, service.subcategory_name]
      .filter(Boolean)
      .join(" | ") || null
  );
}

/** Compact text-only variant of ServiceCard for the list view. */
function ServiceRow({
  service,
  onMore,
}: {
  service: ServiceListItem;
  onMore: () => void;
}) {
  const category = categoryLine(service);
  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {service.title}
        </Text>
        <View style={styles.rowMeta}>
          <ServiceStatusBadge
            status={statusFromLabel(service.status_label)}
            size="sm"
          />
          {category && (
            <Text style={styles.rowCategory} numberOfLines={1}>
              · {category}
            </Text>
          )}
        </View>
        {service.provider_type === "business" && service.business_name && (
          <View style={styles.businessRow}>
            <ExpoImage
              source={require("@/assets/global-icons/business.svg")}
              style={{ width: 12, height: 12 }}
            />
            <Text style={styles.businessName} numberOfLines={1}>
              {service.business_name}
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity hitSlop={8} onPress={onMore}>
        <MaterialIcons name="more-horiz" size={22} color={neutral[700]} />
      </TouchableOpacity>
    </View>
  );
}

export default function ServicesScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [services, setServices] = useState<ServiceListItem[]>([]);
  // Per-tab totals for the tab labels. The list endpoint only reports
  // meta.total for the tab it was asked for, so each tab is counted separately.
  const [tabTotals, setTabTotals] = useState<Partial<Record<TabKey, number>>>(
    {},
  );
  const [lastPage, setLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] =
    useState<ServiceListItem | null>(null);
  // Ignore responses from a superseded request (tab switched, screen refocused).
  const requestId = useRef(0);

  const loadServices = useCallback(
    async (
      tab: TabKey,
      pageToLoad: number,
      // Pull-to-refresh shows its own spinner, so skip the full-screen loader.
      { silent = false }: { silent?: boolean } = {},
    ) => {
      const id = ++requestId.current;
      const isFirstPage = pageToLoad === 1;
      if (!isFirstPage) setLoadingMore(true);
      else if (!silent) setLoading(true);
      try {
        const result = await listMyServices({ tab, page: pageToLoad });
        if (id !== requestId.current) return;
        setServices((prev) =>
          isFirstPage ? result.data : [...prev, ...result.data],
        );
        setPage(result.meta?.current_page ?? pageToLoad);
        setLastPage(result.meta?.last_page ?? pageToLoad);
        if (result.meta?.total !== undefined) {
          const total = result.meta.total;
          setTabTotals((prev) => ({ ...prev, [tab]: total }));
        }
      } catch (err) {
        if (id !== requestId.current) return;
        if (isFirstPage) setServices([]);
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong while loading your services.",
        );
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadServices(activeTab, 1);
    }, [activeTab, loadServices]),
  );

  // Counts are decorative, so a failed fetch just leaves the labels bare.
  const loadTabTotals = useCallback(async () => {
    const results = await Promise.allSettled(
      TABS.map(({ key }) => listMyServices({ tab: key, perPage: 1 })),
    );
    setTabTotals((prev) => {
      const next = { ...prev };
      results.forEach((result, i) => {
        if (
          result.status === "fulfilled" &&
          result.value.meta?.total !== undefined
        ) {
          next[TABS[i].key] = result.value.meta.total;
        }
      });
      return next;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTabTotals();
    }, [loadTabTotals]),
  );

  function handleEndReached() {
    if (loading || loadingMore || refreshing || page >= lastPage) return;
    loadServices(activeTab, page + 1);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      loadServices(activeTab, 1, { silent: true }),
      loadTabTotals(),
    ]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader
        title="My Services"
        onBack={() => router.push("/home")}
        rightAccessory={
          <View style={styles.headerActions}>
            {/* The icon shows the view you'd switch to, not the current one. */}
            <TouchableOpacity
              style={styles.headerButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                viewMode === "card"
                  ? "Switch to list view"
                  : "Switch to card view"
              }
              onPress={() =>
                setViewMode((mode) => (mode === "card" ? "list" : "card"))
              }
            >
              {viewMode === "card" ? (
                <Feather name="list" size={22} color={primary[400]} />
              ) : (
                <MaterialIcons
                  name="view-agenda"
                  size={22}
                  color={primary[400]}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              hitSlop={8}
              onPress={() => router.push("/create-service")}
            >
              <MaterialIcons name="add" size={22} color={primary[400]} />
            </TouchableOpacity>
          </View>
        }
      />
      {/* Filter tabs */}
      <TabBar
        tabs={TABS.map((tab) => ({
          ...tab,
          label: withCount(tab.label, tabTotals[tab.key]),
        }))}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
      {/* Service list */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(service) => String(service.service_id)}
          renderItem={({ item }) =>
            viewMode === "card" ? (
              <ServiceCard
                service={item}
                onMore={() => setSelectedService(item)}
              />
            ) : (
              <ServiceRow
                service={item}
                onMore={() => setSelectedService(item)}
              />
            )
          }
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            viewMode === "card" && styles.cardListContent,
            contentWidthStyle,
          ]}
          ItemSeparatorComponent={
            viewMode === "list" ? ListRowSeparator : undefined
          }
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={primary[400]}
              colors={[primary[400]]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No services found</Text>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={primary[400]} />
            ) : null
          }
        />
      )}
      <BottomSheet
        visible={selectedService !== null}
        title="Manage Service"
        onClose={() => setSelectedService(null)}
        options={[
          {
            label: "Service Details",
            icon: require("@/assets/global-icons/view-detail.svg"),
            onPress: () => {
              const id = selectedService?.service_id;
              setSelectedService(null);
              if (id) router.push(`/service-detail/${id}`);
            },
          },
          {
            label: "Edit Service",
            icon: require("@/assets/global-icons/edit.svg"),
            onPress: () => {
              const id = selectedService?.service_id;
              setSelectedService(null);
              if (id) router.push(`/edit-service/${id}`);
            },
          },
          {
            label: "Delete Service",
            icon: require("@/assets/global-icons/cancel.svg"),
            onPress: () => {
              const id = selectedService?.service_id;
              setSelectedService(null);
              if (id) router.push(`/edit-service/${id}/delete`);
            },
          },
        ]}
      />
      <ConfirmModal
        visible={error !== null}
        type="error"
        title="Couldn't load services"
        message={error ?? ""}
        confirmLabel="Retry"
        cancelLabel="Dismiss"
        onCancel={() => setError(null)}
        onConfirm={() => {
          setError(null);
          loadServices(activeTab, 1);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  suspendedBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerButton: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // List
  loader: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  cardListContent: {
    gap: 20,
  },
  emptyText: {
    textAlign: "center",
    color: neutral[400],
    fontSize: 14,
    marginTop: 40,
  },
  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: neutral[300],
    borderRadius: 8,
    padding: 13,
    gap: 15,
    backgroundColor: background.card,
  },
  cardInfo: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: neutral[700],
    letterSpacing: -0.408,
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  businessName: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[400],
    letterSpacing: -0.408,
  },
  moreButton: {
    alignSelf: "flex-start",
    padding: 2,
  },
  // Row (list view)
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  rowInfo: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[700],
    letterSpacing: -0.408,
  },
  rowCategory: {
    flexShrink: 1,
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowSeparator: {
    height: 0.5,
    backgroundColor: neutral[300],
  },
});
