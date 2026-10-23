import { useAuth } from "@/auth/AuthContext";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

const { secondary, text } = Colors;

function formatSuspendedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Persistent notice shown while the provider account is suspended. Collapsed
 * by default to a one-line header; tapping it reveals the reason, the
 * suspension date and what is paused. The account stays signed in with read
 * access; services, businesses, members and availability writes are rejected
 * by the API until reactivation.
 */
export function SuspendedBanner({ style }: { style?: ViewStyle }) {
  const { isSuspended, user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  if (!isSuspended) return null;

  const suspension = user?.accountStatus.suspension;
  const suspendedAt = formatSuspendedAt(suspension?.suspended_at);

  return (
    <View style={[styles.banner, style]} accessibilityRole="alert">
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Your account is suspended"
        accessibilityHint={expanded ? "Hides details" : "Shows details"}
      >
        <Image
          source={require("@/assets/global-icons/forbidden.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.title}>Your account is suspended</Text>
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={24}
          color={secondary[600]}
        />
      </Pressable>

      {expanded && (
        <View style={styles.details}>
          {suspension?.reason ? (
            <DetailRow label="Reason" value={suspension.reason} />
          ) : null}
          {suspendedAt ? (
            <DetailRow label="Suspended on" value={suspendedAt} />
          ) : null}
          <Text style={styles.note}>
            You can view your data, but changes to services, businesses, members
            and availability are paused until your account is reactivated.
          </Text>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: secondary[50],
    borderWidth: 1,
    borderColor: secondary[200],
    borderRadius: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  icon: {
    width: 22,
    height: 22,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: secondary[600],
  },
  details: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  detailRow: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: secondary[600],
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 13,
    color: text.primary,
    lineHeight: 18,
  },
  note: {
    fontSize: 12,
    color: text.secondary,
    lineHeight: 18,
  },
});
