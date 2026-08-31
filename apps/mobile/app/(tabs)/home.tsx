import {
  createAddress,
  getDefaultAddress,
  type Address,
  type ResolvedLocation,
} from "@/api/address";
import bookingsData from "@/assets/data/bookings.json";
import { useAuth } from "@/auth/AuthContext";
import { AddressModal } from "@/components/AddressModal";
import {
  BookingRequestCard,
  type BookingRequest,
} from "@/components/BookingRequestCard";
import { CardGrid } from "@/components/CardGrid";
import { MyServiceCard, MyServiceCardData } from "@/components/MyServiceCard";
import { SideMenu } from "@/components/SideMenu";
import { useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage, ImageSource } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, text, background, neutral } = Colors;
const BANNER_GAP = 12;
// Banner art is ~2.9:1 (1038×360); used to size banners on wide screens.
const BANNER_ASPECT_RATIO = 1038 / 360;
const BANNER_ROTATE_INTERVAL_MS = 4000;

const bannerAssets: Record<string, ImageSource> = {
  "1": require("@/assets/banners/home-banner-1.png"),
  "2": require("@/assets/banners/home-banner-2.png"),
  "3": require("@/assets/banners/home-banner-3.png"),
  "4": require("@/assets/banners/home-banner-4.png"),
};

type BookingStatus = "active" | "completed" | "pending" | "cancelled";

type Booking = {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  clientName: string;
  status: BookingStatus;
  bookingId?: string;
  category?: string;
  location?: string;
  clientType?: "repeat" | "new";
};

const BOOKINGS: Booking[] = bookingsData.bookings as Booking[];

function toBookingRequest(b: Booking): BookingRequest {
  return {
    id: b.id,
    bookingId: b.bookingId ?? b.id,
    serviceId: b.category ?? "",
    service: b.title,
    date: b.date,
    start: b.start,
    end: b.end,
    client: {
      name: b.clientName,
      location: b.location ?? "",
      type: b.clientType ?? "new",
    },
  };
}

export default function HomeScreen() {
  const { isWideScreen, screenPadding, screenPaddingStyle } =
    useResponsivePadding();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { openMenu } = useLocalSearchParams<{ openMenu?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  // Banners span the content card (padding 22 each side) inside the
  // responsive screen padding. Wide screens show two banners per page,
  // each at the artwork's native aspect ratio.
  const contentWidth = windowWidth - 2 * screenPadding - 44;
  const bannersPerPage = isWideScreen ? 2 : 1;
  const bannerWidth =
    (contentWidth - (bannersPerPage - 1) * BANNER_GAP) / bannersPerPage;
  const bannerHeight = isWideScreen ? bannerWidth / BANNER_ASPECT_RATIO : 120;
  const bannerPageWidth = (bannerWidth + BANNER_GAP) * bannersPerPage;
  const bannerPageCount = Math.ceil(
    Object.keys(bannerAssets).length / bannersPerPage,
  );
  const [activeBanner, setActiveBanner] = useState(0);
  const [bannerAutoRotate, setBannerAutoRotate] = useState(true);
  const bannerRef = useRef<FlatList>(null);

  // Auto-rotate: advance one page per interval, wrapping to the start.
  // Paused while the user drags; any page change (auto or manual) restarts
  // the countdown since activeBanner is a dependency.
  useEffect(() => {
    if (!bannerAutoRotate || bannerPageCount <= 1) return;
    const timer = setTimeout(() => {
      const next = (activeBanner + 1) % bannerPageCount;
      bannerRef.current?.scrollToOffset({
        offset: next * bannerPageWidth,
        animated: true,
      });
      setActiveBanner(next);
    }, BANNER_ROTATE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [bannerAutoRotate, activeBanner, bannerPageCount, bannerPageWidth]);

  const user = authUser
    ? {
        firstName: authUser.user.user_fname ?? "",
        lastName: authUser.user.user_lname ?? "",
        avatarUrl: authUser.profileImage,
        backgroundVerification: authUser.backgroundVerification,
      }
    : null;

  const [services, setServices] = useState<MyServiceCardData[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [acceptedRequests] = useState<Set<string>>(
    new Set(),
  );

  const newRequests = BOOKINGS.filter(
    (b) => b.status === "pending" && !acceptedRequests.has(b.id),
  );

  function acceptRequest(id: string) {
    // setAcceptedRequests((prev) => new Set(prev).add(id));
    // TODO: Call API to accept the request, then update state based on response.
  }

  // Gate the onboarding prompt so it only appears once per landing, not on
  // every screen focus.
  const promptedForAddress = useRef(false);

  const refreshDefaultAddress = useCallback(() => {
    getDefaultAddress()
      .then((address) => {
        setDefaultAddress(address);
        // Final onboarding step: prompt for an address once if none is set yet.
        if (!address && !promptedForAddress.current) {
          promptedForAddress.current = true;
          setAddressModalOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  // Re-fetch when returning from the add-address screen so the header stays current.
  useFocusEffect(refreshDefaultAddress);

  async function handleUseCurrentLocation(location: ResolvedLocation) {
    const saved = await createAddress({ ...location, is_default: true });
    setDefaultAddress(saved);
    setAddressModalOpen(false);
  }

  useEffect(() => {
    if (openMenu === "1") {
      setMenuOpen(true);
      // Clear the param so re-focusing the tab doesn't reopen the menu.
      router.setParams({ openMenu: undefined });
    }
  }, [openMenu, router]);

  useEffect(() => {
    if (!authUser?.user.user_id) return;
    // TODO: legacy API removed — implement getUserServices via Laravel API
    console.log("TODO: implement getUserServices via Laravel API", {
      userId: authUser.user.user_id,
    });
    setServices([]);
  }, [authUser?.user.user_id]);

  const handleBannerScroll = (event: any) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / bannerPageWidth,
    );
    setActiveBanner(Math.min(Math.max(index, 0), bannerPageCount - 1));
  };

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.header}>
          {/* Avatar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.avatarWrap}>
              <ExpoImage
                source={
                  user?.avatarUrl
                    ? { uri: user.avatarUrl }
                    : require("@/assets/default-avatar-square.svg")
                }
                style={styles.avatar}
                contentFit="cover"
              />
              {((user?.accountType === "individual" &&
                user?.isPersonVerified) ||
                (user?.accountType === "business" &&
                  user?.isBusinessVerified)) && (
                <ExpoImage
                  source={require("@/assets/global-icons/verified.svg")}
                  style={styles.avatarBadge}
                  contentFit="contain"
                />
              )}
            </View>
          </TouchableOpacity>

          {/* Address + Menu */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.locationRow}
              activeOpacity={0.7}
              onPress={() => router.push("/add-address")}
            >
              <Ionicons
                name="location-outline"
                size={22}
                color={primary[400]}
              />
              <Text style={styles.locationText} numberOfLines={1}>
                {defaultAddress?.address ?? authUser?.user.user_address ?? "—"}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={18}
                color={text.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, styles.roundShadow]}
              onPress={() => setMenuOpen(true)}
            >
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
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/services")}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={text.primary}
                style={styles.arrowIcon}
              />
            </TouchableOpacity>
          </View>
          {/* Show current services */}
          {services.length > 0 ? (
            <FlatList
              data={services}
              keyExtractor={(item) => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.myServicesList}
              renderItem={({ item }) => (
                <MyServiceCard
                  service={item}
                  onPress={() => router.push(`/service-detail/${item.id}`)}
                />
              )}
            />
          ) : (
            // Empty State: Create service card
            <TouchableOpacity
              style={styles.createServiceCard}
              activeOpacity={0.8}
              onPress={() => router.push("/create-service")}
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
          )}
          {/* Banners carousel */}
          <View style={styles.bannersSection}>
            <FlatList
              ref={bannerRef}
              data={Object.entries(bannerAssets)}
              keyExtractor={([id]) => id}
              horizontal
              pagingEnabled
              snapToInterval={bannerPageWidth}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={handleBannerScroll}
              onScrollBeginDrag={() => setBannerAutoRotate(false)}
              onScrollEndDrag={() => setBannerAutoRotate(true)}
              scrollEventThrottle={16}
              renderItem={({ item: [, source] }) => (
                <ExpoImage
                  source={source}
                  style={[
                    styles.bannerImage,
                    { width: bannerWidth, height: bannerHeight },
                  ]}
                  contentFit="cover"
                />
              )}
            />
            {/* Swipe dots — one per page */}
            <View style={styles.swipeDots}>
              {Array.from({ length: bannerPageCount }).map((_, i) => (
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
          {newRequests.length > 0 ? (
            <CardGrid gap={16}>
              {newRequests.map((b) => (
                <BookingRequestCard
                  key={b.id}
                  request={toBookingRequest(b)}
                  onAccept={() => acceptRequest(b.id)}
                />
              ))}
            </CardGrid>
          ) : (
            // Empty state
            <View style={styles.emptyState}>
              <ExpoImage
                source={require("@/assets/home/empty-state-requests.png")}
                style={styles.emptyStateImage}
                contentFit="cover"
              />
            </View>
          )}
        </View>
      </ScrollView>
      <AddressModal
        visible={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onUseCurrentLocation={handleUseCurrentLocation}
        onAddAddress={() => {
          setAddressModalOpen(false);
          router.push("/add-address");
        }}
      />
      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={
          user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
                backgroundVerification: user.backgroundVerification,
              }
            : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
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
  avatarWrap: {
    width: 50,
    height: 50,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    overflow: "hidden",
  },
  avatarBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
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
  myServicesList: {
    gap: 16,
    paddingVertical: 4,
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
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
});
