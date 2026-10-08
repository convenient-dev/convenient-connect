import type { ProviderHomeServiceCard } from "@/api/home";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { primary, neutral, text } = Colors;

interface MyServiceCardProps {
  service: ProviderHomeServiceCard;
  onPress?: () => void;
}

const STAR_COLOR = "#FFCC00";

/** "4/5 (189)" — whole averages drop the decimal, others keep one. */
function formatRating(rating: ProviderHomeServiceCard["rating"]): string {
  const average = Number.isInteger(rating.average)
    ? String(rating.average)
    : rating.average.toFixed(1);
  return `${average}/5 (${rating.total_reviews})`;
}

/**
 * Vertical service listing card used on the home "My Services" strip. Sized to
 * its fixed width so a horizontal list shows a partial next card as a scroll
 * affordance, matching the Figma layout.
 */
export function MyServiceCard({ service, onPress }: MyServiceCardProps) {
  const photo = service.portfolio?.url;
  const isQuote =
    service.pricing?.pricing_type === "quote_required" || service.price == null;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.imageWrap}>
        {photo ? (
          <ExpoImage
            source={{ uri: photo }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <MaterialIcons name="image" size={36} color={primary[300]} />
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {service.title ?? "Untitled service"}
      </Text>
      <View style={styles.ratingRow}>
        <MaterialIcons name="star" size={18} color={STAR_COLOR} />
        <Text style={styles.ratingText}>{formatRating(service.rating)}</Text>
      </View>
      {isQuote ? (
        <Text style={styles.price}>Quote required</Text>
      ) : (
        <Text style={styles.price}>
          ${service.price}
          {service.service_unit ? (
            <Text style={styles.priceUnit}>/{service.service_unit}</Text>
          ) : null}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 120;
const IMAGE_SIZE = 110;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    gap: 8,
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
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    minHeight: 36,
    fontWeight: "400",
    color: text.primary,
    letterSpacing: -0.408,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "500",
    color: neutral[500],
    letterSpacing: -0.408,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: neutral[500],
  },
});
