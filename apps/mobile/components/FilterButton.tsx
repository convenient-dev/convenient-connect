import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

const { brand, neutral, secondary } = Colors;

interface FilterButtonProps {
  onPress: () => void;
  /** When true, the icon is tinted and a dot indicator is shown. */
  active?: boolean;
  accessibilityLabel?: string;
}

export function FilterButton({
  onPress,
  active = false,
  accessibilityLabel = "Filter",
}: FilterButtonProps) {
  return (
    <View style={styles.filterRow}>
      <TouchableOpacity
        style={styles.filterButton}
        activeOpacity={0.7}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <Feather
          name="filter"
          size={16}
          color={active ? brand.secondary : secondary[500]}
        />
        {active && <View style={styles.filterDot} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: neutral[0],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: brand.secondary,
  },
});
