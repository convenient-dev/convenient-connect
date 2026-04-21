import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, View } from "react-native";

const { primary, secondary, status } = Colors;

type Variant = "success" | "alert" | "error";

const VARIANT_CONFIG: Record<
  Variant,
  {
    icon: React.ComponentProps<typeof MaterialIcons>["name"];
    backgroundColor: string;
    iconColor: string;
  }
> = {
  success: {
    icon: "check",
    backgroundColor: status.active,
    iconColor: "#fff",
  },
  alert: {
    icon: "priority-high",
    backgroundColor: primary[400],
    iconColor: "#fff",
  },
  error: {
    icon: "close",
    backgroundColor: secondary[500],
    iconColor: "#fff",
  },
};

interface Props {
  variant: Variant;
  size?: number;
}

export function ModalIcon({ variant, size = 28 }: Props) {
  const cfg = VARIANT_CONFIG[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: cfg.backgroundColor }]}>
      <MaterialIcons name={cfg.icon} size={size} color={cfg.iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
