import { BottomSheet } from "@/components/BottomSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  SERVICE_STATUS_CONFIG,
  ServiceStatus,
} from "@/components/ServiceStatusBadge";
import { TabBar } from "@/components/TabBar";
import { useCurrentUser } from "@/constants/session";
import { getUserServices } from "@/api/legacy";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

interface Service {
  id: number;
  title: string;
  status: ServiceStatus;
  serviceMode: "freelance" | "business";
  images: { url: string }[];
  subcategory: { name: string; category: { name: string } } | null;
  business: { business: { name: string } } | null;
  updatedAt: string;
}

function getRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TABS = ["All", "Freelance", "Business"] as const;
type Tab = (typeof TABS)[number];

function ServiceCard({
  service,
  onMore,
}: {
  service: Service;
  onMore: () => void;
}) {
  const meta = SERVICE_STATUS_CONFIG[service.status];
  const statusColor = meta.color;
  const statusDescription =
    service.status === "pendingReview"
      ? getRelativeTime(service.updatedAt)
      : meta.description;
  const photo = service.images[0]?.url;

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
          <MaterialIcons name={meta.icon} size={12} color={statusColor} />
          <Text style={styles.statusText}>
            <Text style={{ color: statusColor }}>{meta.label} </Text>
            <Text style={styles.statusDescription}>· {statusDescription}</Text>
          </Text>
        </View>
        {service.serviceMode === "business" && service.business && (
          <View style={styles.businessRow}>
            <ExpoImage
              source={require("@/assets/global-icons/business.svg")}
              style={{ width: 12, height: 12 }}
            />
            <Text style={styles.businessName} numberOfLines={1}>
              {service.business.business.name}
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
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getUserServices(userId, false)
        .then((data: Service[]) => setServices(data))
        .finally(() => setLoading(false));
    }, [userId]),
  );

  const visibleServices =
    activeTab === "All"
      ? services
      : services.filter((s) => s.serviceMode === activeTab.toLowerCase());

  return (
    <SafeAreaView style={styles.container}>
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
      <TabBar
        tabs={TABS.map((tab) => ({ key: tab, label: tab }))}
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
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleServices.length === 0 ? (
            <Text style={styles.emptyText}>No services found</Text>
          ) : (
            visibleServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onMore={() => setSelectedService(service)}
              />
            ))
          )}
        </ScrollView>
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
              const id = selectedService?.id;
              setSelectedService(null);
              if (id) router.push(`/service-detail/${id}`);
            },
          },
          {
            label: "Edit Service",
            icon: require("@/assets/global-icons/edit.svg"),
            onPress: () => {
              const id = selectedService?.id;
              setSelectedService(null);
              if (id) router.push(`/edit-service/${id}`);
            },
          },
          {
            label: "Delete Service",
            icon: require("@/assets/global-icons/cancel.svg"),
            onPress: () => {
              const id = selectedService?.id;
              setSelectedService(null);
              if (id) router.push(`/edit-service/${id}/delete`);
            },
          },
        ]}
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
