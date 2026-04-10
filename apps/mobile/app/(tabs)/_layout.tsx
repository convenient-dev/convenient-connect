import { Tabs } from "expo-router";
import React from "react";

import { BottomTabBar } from "@/components/ui/bottom-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="services" options={{ title: "Services" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="chats" options={{ title: "Chats" }} />
      <Tabs.Screen name="share" options={{ title: "Share" }} />
    </Tabs>
  );
}
