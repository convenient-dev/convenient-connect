import { StatusBadge } from "@/components/StatusBadge";
import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { primary, neutral, text, background, border } = Colors;

export type BookingStatus = "active" | "completed" | "pending" | "cancelled";

export interface BookingCardData {
  /** ISO date, e.g. "2026-06-25". */
  date: string;
  start: string;
  end: string;
  title: string;
  clientName: string;
  status: BookingStatus;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  active: "Active",
  completed: "Completed",
  pending: "Pending",
  cancelled: "Cancelled",
};

export function formatBookingTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

// "2026-06-25" -> "Jun 25"
export function formatBookingDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface BookingCardProps {
  booking: BookingCardData;
  /** Color of the leading status dot, typically cycled by list position. */
  dotColor: string;
  /** Shown for non-active bookings. */
  onView?: () => void;
  /** Shown for active bookings in place of the View button. */
  onChat?: () => void;
  /** Opens the manage menu from the top-right three-dots (active only). */
  onManage?: () => void;
}

export function BookingCard({
  booking,
  dotColor,
  onView,
  onChat,
  onManage,
}: BookingCardProps) {
  // Active bookings are manageable: they get a chat action plus a three-dots
  // menu. Every other status is read-only and only offers "View".
  const isActive = booking.status === "active";
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingTopRow}>
        <View style={[styles.bookingDotRing, { borderColor: dotColor }]} />
        <Text style={styles.bookingTimeRange} numberOfLines={1}>
          {formatBookingDate(booking.date)} · {formatBookingTime(booking.start)}{" "}
          - {formatBookingTime(booking.end)}
        </Text>
        <StatusBadge label={BOOKING_STATUS_LABEL[booking.status]} />
        {isActive && (
          <TouchableOpacity
            style={styles.manageButton}
            hitSlop={8}
            activeOpacity={0.7}
            onPress={onManage}
            accessibilityLabel="Manage booking"
          >
            <Feather name="more-horizontal" size={20} color={neutral[700]} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.bookingMiddleRow}>
        <Text style={styles.bookingTitle} numberOfLines={2}>
          {booking.title}
        </Text>
        {isActive ? (
          <TouchableOpacity
            style={styles.chatButton}
            activeOpacity={0.85}
            onPress={onChat}
          >
            <ExpoImage
              source={require("@/assets/global-icons/chat-bubble.svg")}
              style={styles.icon}
            />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.bookingViewButton}
            activeOpacity={0.85}
            onPress={onView}
          >
            <Text style={styles.bookingViewButtonText}>View</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.bookingClient} numberOfLines={1}>
        By {booking.clientName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bookingCard: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: background.card,
    gap: 8,
  },
  bookingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
  },
  bookingDotRing: {
    width: 10,
    height: 10,
    borderRadius: 7,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingTimeRange: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: neutral[500],
    letterSpacing: -0.408,
  },
  bookingMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  bookingTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  manageButton: {
    marginLeft: "auto",
  },
  bookingViewButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: primary[400],
  },
  bookingViewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: primary[400],
  },
  icon: {
    width: 20,
    height: 20,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  bookingClient: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
  },
});
