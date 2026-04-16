import Divider from "@/components/ui/divider";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background, status } = Colors;

// TODO: replace with real auth user id
const USER_ID = 1;

type ServiceStatus = "active" | "inactive" | "pendingReview";

interface Service {
  id: number;
  title: string;
  status: ServiceStatus;
  serviceMode: "freelance" | "business";
  images: { url: string }[];
  subcategory: { name: string; category: { name: string } } | null;
  business: { business: { name: string } } | null;
}

const STATUS_META: Record<
  ServiceStatus,
  {
    label: string;
    description: string;
    icon: "check-circle" | "remove-circle" | "schedule";
  }
> = {
  active: {
    label: "Active",
    description: "Accepting new bookings",
    icon: "check-circle",
  },
  inactive: {
    label: "Inactive",
    description: "Not accepting bookings",
    icon: "remove-circle",
  },
  pendingReview: {
    label: "Pending Review",
    description: "Under review",
    icon: "schedule",
  },
};

const TABS = ["All", "Freelance", "Business"] as const;
type Tab = (typeof TABS)[number];

const SHEET_HEIGHT = 220;

interface ManageServiceSheetProps {
  visible: boolean;
  onClose: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ManageServiceSheet({
  visible,
  onClose,
  onDetail,
  onEdit,
  onDelete,
}: ManageServiceSheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <Pressable>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Manage Service</Text>
            <Divider />
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={onDetail}
              activeOpacity={0.7}
            >
              <ExpoImage
                source={require("@/assets/global-icons/view-detail.svg")}
                style={{ width: 20, height: 20 }}
              />
              <Text style={styles.sheetOptionText}>Service Detail</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <ExpoImage
                source={require("@/assets/global-icons/edit.svg")}
                style={{ width: 20, height: 20 }}
              />
              <Text style={styles.sheetOptionText}>Edit Service</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={onDelete}
              activeOpacity={0.7}
            >
              <ExpoImage
                source={require("@/assets/global-icons/cancel.svg")}
                style={{ width: 20, height: 20 }}
              />
              <Text style={styles.sheetOptionText}>Delete Service</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ServiceCard({
  service,
  onMore,
}: {
  service: Service;
  onMore: () => void;
}) {
  const meta = STATUS_META[service.status];
  const statusColor =
    service.status === "active"
      ? status.active
      : service.status === "inactive"
        ? status.inactive
        : "#f0a500";
  const photo = service.images[0]?.url;

  return (
    <View style={styles.card}>
      <Image
        source={photo ? { uri: photo } : undefined}
        style={styles.cardAvatar}
        resizeMode="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{service.title}</Text>
        <View style={styles.statusRow}>
          <MaterialIcons name={meta.icon} size={12} color={statusColor} />
          <Text style={styles.statusText}>
            <Text style={{ color: statusColor }}>{meta.label} </Text>
            <Text style={styles.statusDescription}>· {meta.description}</Text>
          </Text>
        </View>
        {service.serviceMode === "business" && service.business && (
          <View style={styles.businessRow}>
            <MaterialIcons name="business" size={12} color="#7a7a7a" />
            <Text style={styles.businessName}>
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
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/${USER_ID}/services`)
      .then((res) => res.json())
      .then((data: Service[]) => setServices(data))
      .finally(() => setLoading(false));
  }, []);

  const visibleServices =
    activeTab === "All"
      ? services
      : services.filter((s) => s.serviceMode === activeTab.toLowerCase());

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)")}
        >
          <MaterialIcons name="arrow-back-ios" size={18} color={neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity
          style={styles.addButton}
          hitSlop={8}
          onPress={() => router.push("/create-service")}
        >
          <MaterialIcons name="add" size={22} color={primary[400]} />
        </TouchableOpacity>
      </View>
      {/* Filter tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
      <ManageServiceSheet
        visible={selectedService !== null}
        onClose={() => setSelectedService(null)}
        onDetail={() => {
          const id = selectedService?.id;
          setSelectedService(null);
          if (id) router.push(`/service-detail/${id}`);
        }}
        onEdit={() => {
          setSelectedService(null);
          // TODO: navigate to edit service
        }}
        onDelete={() => {
          setSelectedService(null);
          // TODO: handle delete
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
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 23,
    backgroundColor: neutral[0],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#222b45",
  },
  addButton: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // Filter tabs
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    marginHorizontal: 30,
    marginBottom: 20,
    padding: 4,
    gap: 6,
  },
  tab: {
    flex: 1,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  tabActive: {
    backgroundColor: primary[400],
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6d6d6d",
  },
  tabTextActive: {
    color: neutral[0],
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
    borderColor: "#a3a3a3",
    borderRadius: 8,
    padding: 13,
    gap: 15,
    backgroundColor: background.card,
  },
  cardAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eaeaea",
  },
  cardInfo: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#303030",
    letterSpacing: -0.408,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: -0.408,
  },
  statusDescription: {
    color: "#7a7a7a",
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
    color: "#7a7a7a",
    letterSpacing: -0.408,
  },
  moreButton: {
    alignSelf: "flex-start",
    padding: 2,
  },
  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[300],
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222b45",
    textAlign: "center",
    marginBottom: 20,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: "400",
    color: "#222b45",
  },
});
