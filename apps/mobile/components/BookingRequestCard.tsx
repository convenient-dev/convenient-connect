import { SwipeButton } from "@/components/SwipeButton";
import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { primary, secondary, neutral, text, background, border, status } =
  Colors;

export interface BookingRequest {
  id: string;
  bookingId: string;
  serviceId: string;
  service: string;
  date: string;
  start: string;
  end: string;
  client: {
    name: string;
    location: string;
    type: "repeat" | "new";
  };
}

const CLIENT_TINTS: Record<BookingRequest["client"]["type"], string> = {
  repeat: status.inactive,
  new: status.active,
};

const CLIENT_BG: Record<BookingRequest["client"]["type"], string> = {
  repeat: "#FCE9B6",
  new: "#CDEBD6",
};

const AVATAR_PALETTE = [
  primary[100],
  secondary[100],
  "#FCE9B6",
  "#CDEBD6",
  primary[200],
];

function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// DiceBear "initials" avatar derived from the client's name.
function clientAvatarUri(name: string): string {
  return `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name)}`;
}

// Picsum photo, seeded by the service so each card stays stable across renders.
function serviceAvatarUri(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/200`;
}

// "09:00" -> "9:00 AM"
function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${mStr} ${period}`;
}

interface BookingRequestCardProps {
  request: BookingRequest;
  onAccept: () => void;
  onMore?: () => void;
}

export function BookingRequestCard({
  request,
  onAccept,
  onMore,
}: BookingRequestCardProps) {
  const { client } = request;
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Text style={styles.bookingIdLabel}>
          Booking ID{" "}
          <Text style={styles.bookingIdValue}>#{request.bookingId}</Text>
        </Text>
        <TouchableOpacity hitSlop={8} activeOpacity={0.7} onPress={onMore}>
          <Feather name="more-horizontal" size={20} color={neutral[700]} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.requestServiceRow}>
        <ExpoImage
          source={{
            uri: serviceAvatarUri(request.serviceId || request.service),
          }}
          style={[styles.serviceAvatar]}
          contentFit="cover"
        />
        <View style={styles.requestServiceInfo}>
          <Text style={styles.requestServiceTitle}>{request.service}</Text>
          <View style={styles.requestMetaRow}>
            <Feather name="calendar" size={13} color={neutral[400]} />
            <Text style={styles.requestMetaText}>
              {new Date(`${request.date}T00:00:00`).toLocaleDateString(
                "en-US",
                {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                },
              )}
            </Text>
          </View>
          <View style={styles.requestMetaRow}>
            <Feather name="clock" size={13} color={neutral[400]} />
            <Text style={styles.requestMetaText}>
              Start: {formatTime(request.start)} End: {formatTime(request.end)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.requestClientRow}>
        <ExpoImage
          source={{ uri: clientAvatarUri(client.name) }}
          style={[
            styles.clientAvatar,
            { backgroundColor: avatarBg(client.name) },
          ]}
          contentFit="cover"
        />
        <View style={styles.requestClientInfo}>
          <Text style={styles.clientName}>{client.name}</Text>
          <View style={styles.requestMetaRow}>
            <Feather name="map-pin" size={12} color={secondary[500]} />
            <Text style={styles.clientLocation} numberOfLines={1}>
              {client.location}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.clientBadge,
            { backgroundColor: CLIENT_BG[client.type] },
          ]}
        >
          <Text
            style={[
              styles.clientBadgeText,
              { color: CLIENT_TINTS[client.type] },
            ]}
          >
            {client.type === "repeat" ? "Repeat Client" : "New Client"}
          </Text>
        </View>
      </View>

      <View style={styles.swipeWrap}>
        <SwipeButton label="Swipe to Accept" onComplete={onAccept} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  requestCard: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 16,
    padding: 16,
    backgroundColor: background.card,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookingIdLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  bookingIdValue: {
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: border.default,
    marginVertical: 14,
  },
  requestServiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  serviceAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  requestServiceInfo: {
    flex: 1,
    gap: 5,
  },
  requestServiceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  requestMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requestMetaText: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  requestClientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  requestClientInfo: {
    flex: 1,
    gap: 3,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  clientLocation: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
    flexShrink: 1,
  },
  clientBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  clientBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.408,
  },
  swipeWrap: {
    marginTop: 16,
  },
});
