import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

const { neutral } = Colors;

interface Props {
  onPress: () => void;
}

export function BackButton({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} hitSlop={8} onPress={onPress}>
      <MaterialIcons name="arrow-back-ios" size={18} color={neutral[700]} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
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
