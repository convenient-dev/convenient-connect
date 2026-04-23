import { Colors } from "@/constants/theme";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage, ImageSource } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const icons = {
  home: require("@/assets/home/nav-home.svg"),
  services: require("@/assets/home/nav-services.svg"),
  calendar: require("@/assets/home/nav-calender.svg"),
  chats: require("@/assets/home/nav-chats.svg"),
  share: require("@/assets/home/nav-share.svg"),
};

const TAB_CONFIG: Record<
  string,
  { label: string; icon: ImageSource; badge?: string }
> = {
  index: {
    label: "Home",
    icon: icons.home,
  },
  services: {
    label: "Services",
    icon: icons.services,
  },
  calendar: {
    label: "Calendar",
    icon: icons.calendar,
  },
  chats: {
    label: "Chats",
    icon: icons.chats,
    badge: "2",
  },
  share: {
    label: "Share",
    icon: icons.share,
  },
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 12 }]}>
      {state.routes.map((route, index) => {
        const tab = TAB_CONFIG[route.name];
        if (!tab) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          if (process.env.EXPO_OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <ExpoImage source={tab.icon} style={styles.icon} />
              {tab.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                isFocused ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.background.screen,
    paddingHorizontal: 30,
    paddingTop: 8,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: Colors.neutral[1000],
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 48,
  },
  iconWrapper: {
    width: 24,
    height: 24,
  },
  icon: {
    width: 24,
    height: 24,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.brand.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: Colors.neutral[0],
    fontSize: 8,
    lineHeight: 10,
  },
  label: {
    fontSize: 11,
    letterSpacing: -0.408,
  },
  labelActive: {
    color: Colors.brand.primary,
    fontWeight: "700",
  },
  labelInactive: {
    color: Colors.text.muted,
    fontWeight: "500",
  },
});
