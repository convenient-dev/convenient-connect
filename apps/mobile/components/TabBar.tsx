import { Colors } from "@/constants/theme";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const { brand, neutral } = Colors;

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  tabs: TabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}

export function TabBar<K extends string>({
  tabs,
  activeKey,
  onChange,
  style,
}: Props<K>) {
  return (
    <View style={[styles.tabBar, style]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              numberOfLines={1}
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
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: neutral[50],
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  tab: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  tabActive: {
    backgroundColor: brand.primary,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[500],
  },
  tabTextActive: {
    color: neutral[0],
  },
});
