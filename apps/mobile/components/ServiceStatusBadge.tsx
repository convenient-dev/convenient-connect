import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const { secondary, status } = Colors;

export type ServiceStatus = "active" | "inactive" | "pendingReview";
export type ServiceStatusBadgeSize = "sm" | "md";

interface StatusVariant {
  label: string;
  description: string;
  icon: "check-circle" | "remove-circle" | "schedule";
  color: string;
}

export const SERVICE_STATUS_CONFIG: Record<ServiceStatus, StatusVariant> = {
  active: {
    label: "Active",
    description: "Accepting new bookings",
    icon: "check-circle",
    color: status.active,
  },
  inactive: {
    label: "Inactive",
    description: "Not accepting bookings",
    icon: "remove-circle",
    color: status.inactive,
  },
  pendingReview: {
    label: "Pending Review",
    description: "Under review",
    icon: "schedule",
    color: secondary[500],
  },
};

interface Props {
  status: ServiceStatus;
  size?: ServiceStatusBadgeSize;
}

export function ServiceStatusBadge({ status, size = "md" }: Props) {
  const cfg = SERVICE_STATUS_CONFIG[status];
  const isSm = size === "sm";

  return (
    <View style={styles.badge}>
      <MaterialIcons name={cfg.icon} size={isSm ? 11 : 12} color={cfg.color} />
      <Text
        style={[
          styles.label,
          isSm ? styles.labelSm : styles.labelMd,
          { color: cfg.color },
        ]}
      >
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  label: {
    fontWeight: "600",
  },
  labelMd: {
    fontSize: 12,
  },
  labelSm: {
    fontSize: 11,
  },
});
