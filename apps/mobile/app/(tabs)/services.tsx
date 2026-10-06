import { ApiError } from "@/api/client";
import {
  listMyServices,
  type ServiceListItem,
  type ServiceListTab,
} from "@/api/service-management";
import { BottomSheet } from "@/components/BottomSheet";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  SERVICE_STATUS_CONFIG,
  ServiceStatus,
} from "@/components/ServiceStatusBadge";
import { TabBar } from "@/components/TabBar";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

const TABS: { key: ServiceListTab & string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "independent", label: "Freelance" },
  { key: "affiliated", label: "Business" },
];

const STATUS_BY_LABEL: Record<
  NonNullable<ServiceListItem["status_label"]>,
  ServiceStatus
> = {
  active: "active",
  inactive: "inactive",
  pending_review: "pendingReview",
};

function ServiceCard({
  service,
  onMore,
}: {
  service: ServiceListItem;
  onMore: () => void;
}) {
  const status = service.status_label
    ? STATUS_BY_LABEL[service.status_label]
    : "inactive";
  const meta = SERVICE_STATUS_CONFIG[status];
  const photo = service.portfolio?.url;

  return (
    <View style={styles.card}>
      <Image
        source={photo ? { uri: photo } : undefined}
        style={styles.cardAvatar}
        resizeMode="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {service.title}
        </Text>
        <View style={styles.statusRow}>
          <MaterialIcons name={meta.icon} size={12} color={meta.color} />
          <Text style={styles.statusText}>
            <Text style={{ color: meta.color }}>{meta.label} </Text>
            <Text style={styles.statusDescription}>· {meta.description}</Text>
          </Text>
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
      <TouchableOpacity style={styles.moreButton} hitSlop={8} onPress={onMore}>
        <MaterialIcons name="more-horiz" size={22} color={neutral[700]} />
      </TouchableOpacity>
    </View>
  );
}

export default function ServicesScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ServiceListTab & string>("all");
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] =
    useState<ServiceListItem | null>(null);
  // Ignore responses from a superseded request (tab switched, screen refocused).
  const requestId = useRef(0);

  const loadServices = useCallback(
    async (tab: ServiceListTab, pageToLoad: number) => {
      const id = ++requestId.current;
      const isFirstPage = pageToLoad === 1;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      try {
        const result = await listMyServices({ tab, page: pageToLoad });
        if (id !== requestId.current) return;
        setServices((prev) =>
          isFirstPage ? result.data : [...prev, ...result.data],
        );
        setPage(result.meta?.current_page ?? pageToLoad);
        setLastPage(result.meta?.last_page ?? pageToLoad);
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

  function handleEndReached() {
    if (loading || loadingMore || page >= lastPage) return;
    loadServices(activeTab, page + 1);
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader
        title="My Services"
        onBack={() => router.push("/home")}
        rightAccessory={
          <TouchableOpacity
            style={styles.addButton}
            hitSlop={8}
            onPress={() => router.push("/create-service")}
          >
            <MaterialIcons name="add" size={22} color={primary[400]} />
          </TouchableOpacity>
        }
      />
      {/* Filter tabs */}
      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
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
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              onMore={() => setSelectedService(item)}
            />
          )}
          style={styles.list}
          contentContainerStyle={[styles.listContent, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
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
  addButton: {
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
    gap: 20,
    paddingBottom: 20,
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
  cardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: neutral[100],
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.408,
  },
  statusDescription: {
    color: neutral[400],
    fontWeight: "500",
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
});
