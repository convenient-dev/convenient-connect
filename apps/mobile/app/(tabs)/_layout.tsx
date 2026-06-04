import { Tabs } from "expo-router";
import React from "react";

import { BottomTabBar } from "@/components/ui/bottom-tab-bar";

export const unstable_settings = {
  initialRouteName: "home",
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="services" options={{ title: "Services" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="chats" options={{ title: "Chats" }} />
      <Tabs.Screen name="share" options={{ title: "Share" }} />
      {/* Profile lives inside the tabs navigator so the bottom tab bar shows
          on /profile. BottomTabBar filters out routes not in TAB_CONFIG, so
          no extra tab button is rendered for it. */}
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
