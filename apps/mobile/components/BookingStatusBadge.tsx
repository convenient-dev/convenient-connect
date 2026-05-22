import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type BookingStatus =
  | "active"
  | "completed"
  | "pending"
  | "cancelled";

interface Variant {
  label: string;
  backgroundColor: string;
  color: string;
}

const VARIANTS: Record<BookingStatus, Variant> = {
  active: {
    label: "Active",
    backgroundColor: "#FCE9B6",
    color: "#B07A1A",
  },
  completed: {
    label: "Completed",
    backgroundColor: "#C7EAE8",
    color: "#1F9897",
  },
  pending: {
    label: "Pending",
    backgroundColor: "#F8CFCC",
    color: "#C5453B",
  },
  cancelled: {
    label: "Cancelled",
    backgroundColor: "#DCDCDC",
    color: "#6E6E6E",
  },
};

interface Props {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: Props) {
  const variant = VARIANTS[status] ?? VARIANTS.active;
  return (
    <View style={[styles.badge, { backgroundColor: variant.backgroundColor }]}>
      <Text style={[styles.label, { color: variant.color }]}>
        {variant.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.408,
  },
});
