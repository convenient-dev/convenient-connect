import { logout as logoutApi } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage, ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

interface MenuItem {
  key: string;
  label: string;
  icon: ImageSource;
  trailing?: "toggle" | "none";
  onPress?: () => void;
}

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  user: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    accountType?: "individual" | "business" | string;
    isPersonVerified?: boolean;
    isBusinessVerified?: boolean;
  } | null;
  membership?: { tier: string };
  appVersion?: string;
}

export function SideMenu({
  visible,
  onClose,
  user,
  membership = { tier: "Gold" },
  appVersion = "1.0.0",
}: SideMenuProps) {
  const router = useRouter();
  const auth = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const menuWidth = Math.min(windowWidth * 0.82, 340);
  const translateX = useRef(new Animated.Value(-menuWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = React.useState(visible);
  const [notificationsOn, setNotificationsOn] = React.useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -menuWidth,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, menuWidth]);

  const items: MenuItem[] = [
    {
      key: "profile",
      label: "Profile",
      icon: require("@/assets/side-menu/profile.svg"),
      onPress: () => {
        onClose();
        router.push("/profile");
      },
    },
    {
      key: "earnings",
      label: "Earnings",
      icon: require("@/assets/side-menu/earnings.svg"),
      onPress: () => {
        onClose();
        router.push("/earnings" as never);
      },
    },
    {
      key: "schedule",
      label: "Schedule",
      icon: require("@/assets/side-menu/schedule.svg"),
      onPress: () => {
        onClose();
        router.push("/schedule" as never);
      },
    },
    {
      key: "business-management",
      label: "Business Management",
      icon: require("@/assets/side-menu/group.png"),
      onPress: () => {
        onClose();
        router.push("/business-management" as never);
      },
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: require("@/assets/side-menu/notifications.svg"),
      trailing: "toggle",
    },
    {
      key: "support",
      label: "Customer Support",
      icon: require("@/assets/side-menu/support.svg"),
      onPress: () => {
        onClose();
        router.push("/customer-support");
      },
    },
    {
      key: "about",
      label: "About",
      icon: require("@/assets/side-menu/about.svg"),
    },
    {
      key: "privacy",
      label: "Privacy Policy",
      icon: require("@/assets/side-menu/privacy-policy.svg"),
    },
    {
      key: "user-agreement",
      label: "User Agreement",
      icon: require("@/assets/side-menu/user-agreement.svg"),
    },
    {
      key: "terms",
      label: "Terms & Conditions",
      icon: require("@/assets/side-menu/terms-conditions.svg"),
    },
    {
      key: "logout",
      label: "Logout",
      icon: require("@/assets/side-menu/logout.svg"),
      onPress: () => setLogoutModalVisible(true),
    },
    {
      key: "delete-account",
      label: "Delete Account",
      icon: require("@/assets/side-menu/delete.svg"),
      onPress: () => {
        onClose();
        router.push("/delete-account-warning");
      },
    },
  ];

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    onClose();
    try {
      await logoutApi();
    } catch {}
    await auth.logout();
  };

  const fullName = user
    ? `${user.firstName} ${user.lastName}`.trim() || "—"
    : "—";

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable style={styles.overlayPressable} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            { width: menuWidth, transform: [{ translateX }] },
          ]}
        >
          <SafeAreaView style={styles.drawerSafe} edges={["top", "bottom"]}>
            <ScrollView
              contentContainerStyle={styles.drawerContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar with verified badge */}
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

              {/* Name */}
              <Text style={styles.userName}>{fullName}</Text>

              {/* Membership card */}
              <TouchableOpacity
                style={styles.membershipCard}
                activeOpacity={0.8}
              >
                <View style={styles.membershipIcon}>
                  <MaterialIcons name="hexagon" size={30} color="#D69400" />
                  <View style={styles.membershipIconInner}>
                    <MaterialIcons
                      name="emoji-events"
                      size={15}
                      color={neutral[0]}
                    />
                  </View>
                </View>
                <View style={styles.membershipText}>
                  <Text style={styles.membershipTier}>{membership.tier}</Text>
                  <Text style={styles.membershipSub}>Membership</Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={neutral[400]}
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Menu items */}
              <View style={styles.menuList}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.menuItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      item.onPress?.();
                    }}
                  >
                    <ExpoImage
                      source={item.icon}
                      style={styles.menuItemIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                    {item.trailing === "toggle" && (
                      <Switch
                        value={notificationsOn}
                        onValueChange={setNotificationsOn}
                        trackColor={{
                          false: neutral[200],
                          true: primary[300],
                        }}
                        thumbColor={neutral[0]}
                        ios_backgroundColor={neutral[200]}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerTitle}>Love the app? Rate us</Text>
                <Text style={styles.footerVersion}>v.{appVersion}</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>

      <ConfirmModal
        visible={logoutModalVisible}
        title="Log Out"
        message="Are you sure you want to log out?"
        icon="warning"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 50,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  overlayPressable: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: background.card,
    shadowColor: neutral[1000],
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  drawerSafe: {
    flex: 1,
  },
  drawerContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    marginTop: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: neutral[100],
  },
  avatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
  },
  userName: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  membershipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: neutral[100],
    marginTop: 14,
  },
  membershipIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  membershipIconInner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  membershipText: {
    flex: 1,
  },
  membershipTier: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D69400",
    letterSpacing: -0.408,
  },
  membershipSub: {
    fontSize: 12,
    color: text.secondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: neutral[100],
    marginTop: 18,
    marginBottom: 6,
  },
  menuList: {
    gap: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 14,
  },
  menuItemIcon: {
    width: 24,
    height: 24,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
    gap: 4,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
  },
  footerVersion: {
    fontSize: 12,
    color: neutral[300],
  },
});
