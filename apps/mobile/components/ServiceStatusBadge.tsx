import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const { secondary, status, neutral } = Colors;

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
    description: "Accepting bookings",
    icon: "check-circle",
    color: status.active,
  },
  inactive: {
    label: "Inactive",
    description: "Stop New bookings",
    icon: "remove-circle",
    color: status.inactive,
  },
  pendingReview: {
    label: "Pending",
    description: "Under review",
    icon: "schedule",
    color: secondary[500],
  },
};

/** Maps the API's `status_label` to a badge status; unknown labels read as inactive. */
export function statusFromLabel(
  label: string | null | undefined,
): ServiceStatus {
  switch (label) {
    case "active":
      return "active";
    case "pending_review":
      return "pendingReview";
    default:
      return "inactive";
  }
}

interface Props {
  status: ServiceStatus;
  size?: ServiceStatusBadgeSize;
  /** Appends the status description, e.g. "Active · Accepting bookings". */
  showDescription?: boolean;
}

export function ServiceStatusBadge({
  status,
  size = "md",
  showDescription = false,
}: Props) {
  const cfg = SERVICE_STATUS_CONFIG[status];
  const isSm = size === "sm";

  return (
    <View style={styles.badge}>
      <MaterialIcons name={cfg.icon} size={isSm ? 11 : 12} color={cfg.color} />
      <Text style={[styles.label, isSm ? styles.labelSm : styles.labelMd]}>
        <Text style={{ color: cfg.color }}>{cfg.label}</Text>
        {showDescription && (
          <Text style={styles.description}> · {cfg.description}</Text>
        )}
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
  description: {
    color: neutral[400],
    fontWeight: "500",
  },
});
