import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background, status } = Colors;

// Service photos (Figma assets — replace with permanent assets before shipping)
const PHOTOS = {
  dogSitting:
    "https://www.figma.com/api/mcp/asset/39902bc8-7915-4547-b7a2-591f73a1c669",
  dogWalking1:
    "https://www.figma.com/api/mcp/asset/de9e2d56-251a-46c8-8a46-1bce3ffa191b",
  dogWalking2:
    "https://www.figma.com/api/mcp/asset/2383181f-9f1f-4aa2-a56b-f19a121a06d8",
};

type ServiceStatus = "active" | "inactive";

interface Service {
  id: string;
  title: string;
  photo: string;
  status: ServiceStatus;
  statusLabel: string;
  statusDescription: string;
  businessName?: string;
  category: "Freelance" | "Business";
}

const SERVICES: Service[] = [
  {
    id: "1",
    title: "In-Home Dog Sitting",
    photo: PHOTOS.dogSitting,
    status: "active",
    statusLabel: "Active",
    statusDescription: "Accepting new bookings",
    category: "Freelance",
  },
  {
    id: "2",
    title: "Dog Walking",
    photo: PHOTOS.dogWalking1,
    status: "inactive",
    statusLabel: "Inactive",
    statusDescription: "Stop new bookings",
    category: "Freelance",
  },
  {
    id: "3",
    title: "Dog Walking",
    photo: PHOTOS.dogWalking2,
    status: "active",
    statusLabel: "Active",
    statusDescription: "Accepting new bookings",
    businessName: "Boston Pet Care Co.",
    category: "Business",
  },
];

const TABS = ["All", "Freelance", "Business"] as const;
type Tab = (typeof TABS)[number];

const STATUS_ICONS: Record<ServiceStatus, "check-circle" | "remove-circle"> = {
  active: "check-circle",
  inactive: "remove-circle",
};

function ServiceCard({ service }: { service: Service }) {
  const statusColor = status[service.status];

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: service.photo }}
        style={styles.cardAvatar}
        resizeMode="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{service.title}</Text>
        <View style={styles.statusRow}>
          <MaterialIcons
            name={STATUS_ICONS[service.status]}
            size={12}
            color={statusColor}
          />
          <Text style={styles.statusText}>
            <Text style={{ color: statusColor }}>{service.statusLabel} </Text>
            <Text style={styles.statusDescription}>
              · {service.statusDescription}
            </Text>
          </Text>
        </View>
        {service.businessName && (
          <View style={styles.businessRow}>
            <MaterialIcons name="business" size={12} color="#7a7a7a" />
            <Text style={styles.businessName}>{service.businessName}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.moreButton} hitSlop={8}>
        <MaterialIcons name="more-horiz" size={22} color={neutral[700]} />
      </TouchableOpacity>
    </View>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const visibleServices =
    activeTab === "All"
      ? SERVICES
      : SERVICES.filter((s) => s.category === activeTab);

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
        <TouchableOpacity style={styles.addButton} hitSlop={8}>
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
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleServices.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </ScrollView>
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 30,
    gap: 20,
    paddingBottom: 20,
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
});
