import { Colors } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage, ImageSource } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const { primary, text, background, neutral } = Colors;
const BANNER_GAP = 12;
const BANNER_WIDTH = SCREEN_WIDTH - 44;

const bannerAssets: Record<string, ImageSource> = {
  "1": require("@/assets/banners/home-banner-1.png"),
  "2": require("@/assets/banners/home-banner-2.png"),
};


const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

export default function HomeScreen() {
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    addresses: {
      id: number;
      userId: number;
      address: string;
      latitude: string;
      longitude: string;
      isDefault: boolean;
    }[];
    avatarUrl: string | null;
  } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/users/1`)
      .then((res) => res.json())
      .then((data) =>
        setUser({
          firstName: data.firstName,
          lastName: data.lastName,
          addresses: data.address ?? [],
          avatarUrl: data.avatarUrl,
        }),
      )
      .catch(() => {});
  }, []);

  const handleBannerScroll = (event: any) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / (BANNER_WIDTH + BANNER_GAP),
    );
    setActiveBanner(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.header}>
          {/* Avatar */}
          <ExpoImage
            source={
              user?.avatarUrl
                ? { uri: user.avatarUrl }
                : require("@/assets/default-avatar-square.svg")
            }
            style={styles.avatar}
            contentFit="contain"
          />

          {/* Address + Menu */}
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={22}
                color={primary[400]}
              />
              <Text style={styles.locationText} numberOfLines={1}>
                {user?.addresses?.find((a) => a.isDefault)?.address ??
                  user?.addresses?.[0]?.address ??
                  "—"}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={18}
                color={text.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuButton, styles.roundShadow]}>
              <MaterialIcons name="menu" size={24} color={text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingName}>
            {user ? `Hi ${user.firstName} ${user.lastName}!` : "Hi!"}
          </Text>
          <Text style={styles.greetingSubtitle}>
            Welcome to Convenient Connect
          </Text>
        </View>

        {/* Content card */}
        <View style={styles.contentCard}>
          {/* My Services header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Services</Text>
            <TouchableOpacity>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={text.primary}
                style={styles.arrowIcon}
              />
            </TouchableOpacity>
          </View>

          {/* Create service card */}
          <TouchableOpacity
            style={styles.createServiceCard}
            activeOpacity={0.8}
          >
            <ExpoImage
              source={require("@/assets/home/create-service.png")}
              style={styles.serviceProviderImage}
              contentFit="cover"
            />
            <View style={styles.createServiceAction}>
              <MaterialIcons name="add" size={20} color={primary[400]} />
              <Text style={styles.createServiceText}>Create a service</Text>
            </View>
          </TouchableOpacity>

          {/* Banners carousel */}
          <View style={styles.bannersSection}>
            <FlatList
              ref={bannerRef}
              data={Object.entries(bannerAssets)}
              keyExtractor={([id]) => id}
              horizontal
              pagingEnabled
              snapToInterval={BANNER_WIDTH + BANNER_GAP}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={handleBannerScroll}
              scrollEventThrottle={16}
              renderItem={({ item: [, source] }) => (
                <ExpoImage
                  source={source}
                  style={styles.bannerImage}
                  contentFit="cover"
                />
              )}
            />
            {/* Swipe dots */}
            <View style={styles.swipeDots}>
              {Object.keys(bannerAssets).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeBanner ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* New Requests header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>New Requests</Text>
          </View>

          {/* Empty state */}
          <View style={styles.emptyState}>
            <ExpoImage
              source={require("@/assets/home/empty-state-requests.png")}
              style={styles.emptyStateImage}
              contentFit="cover"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 27,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
  },
  locationRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    fontSize: 17,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
    flex: 1,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    paddingHorizontal: 30,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greetingName: {
    fontSize: 16,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: text.secondary,
    letterSpacing: -0.408,
    marginTop: 2,
  },
  contentCard: {
    backgroundColor: background.card,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 10,
  },
  arrowIcon: {
    borderRadius: 100,
    backgroundColor: background.subtle,
    padding: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  createServiceCard: {
    backgroundColor: background.subtle,
    borderRadius: 8,
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 50,
    gap: 10,
    overflow: "hidden",
  },
  serviceProviderImage: {
    width: 90,
    height: 90,
  },
  createServiceAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createServiceText: {
    fontSize: 16,
    fontWeight: "500",
    color: primary[400],
    letterSpacing: -0.408,
  },
  bannersSection: {
    gap: 10,
    paddingVertical: 10,
  },
  bannerImage: {
    width: BANNER_WIDTH,
    height: 120,
    marginRight: BANNER_GAP,
    borderRadius: 8,
  },
  swipeDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  dot: {
    borderRadius: 40,
    backgroundColor: neutral[400],
  },
  dotInactive: {
    width: 6,
    height: 6,
    opacity: 0.3,
  },
  dotActive: {
    width: 8,
    height: 8,
    opacity: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyStateImage: {
    width: 165,
    height: 165,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: text.primary,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
  },
  roundShadow: {
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
});
