import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { primary, neutral, text } = Colors;

export interface MyServiceCardData {
  id: number;
  title: string;
  baseRate: number | string;
  baseRateUnit: "booking" | "hour" | string;
  images: { url: string }[];
  rating?: number;
  reviewCount?: number;
}

interface MyServiceCardProps {
  service: MyServiceCardData;
  onPress?: () => void;
}

const RATE_UNIT_LABEL: Record<string, string> = {
  booking: "booking",
  hour: "hour",
};

function formatPriceAmount(rate: number | string): string {
  const value = typeof rate === "number" ? rate : parseFloat(rate);
  const safe = Number.isFinite(value) ? value : 0;
  return `$${safe.toFixed(2)}`;
}

function formatPriceUnit(unit: string): string {
  return `/${RATE_UNIT_LABEL[unit] ?? unit}`;
}

export function MyServiceCard({ service, onPress }: MyServiceCardProps) {
  const photo = service.images[0]?.url;
  const rating = service.rating ?? 0;
  const reviewCount = service.reviewCount ?? 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.imageWrap}>
        <ExpoImage
          source={photo ? { uri: photo } : undefined}
          style={styles.image}
          contentFit="cover"
        />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {service.title}
      </Text>
      <View style={styles.ratingRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <MaterialIcons
            key={i}
            name={i < Math.round(rating) ? "star" : "star-border"}
            size={15}
            color="#FFCC00"
          />
        ))}
        <Text style={styles.ratingText}>({reviewCount})</Text>
      </View>
      <Text style={styles.price}>
        {formatPriceAmount(service.baseRate)}
        <Text style={styles.priceUnit}>
          {formatPriceUnit(service.baseRateUnit)}
        </Text>
      </Text>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 100;
const IMAGE_SIZE = 90;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    gap: 6,
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    overflow: "hidden",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
  },
  title: {
    fontSize: 13,
    lineHeight: 16,
    minHeight: 32,
    fontWeight: "400",
    color: text.primary,
    letterSpacing: -0.408,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[400],
    letterSpacing: -0.408,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[400],
  },
});
