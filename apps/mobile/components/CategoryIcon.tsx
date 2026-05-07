import { Image as ExpoImage } from "expo-image";
import React from "react";
import { StyleProp, ImageStyle } from "react-native";

const CATEGORY_SVG_ICONS: Record<string, number> = {
  automotive: require("@/assets/categories-svg/automotive.svg"),
  beauty: require("@/assets/categories-svg/beauty.svg"),
  caregiving: require("@/assets/categories-svg/caregiving.svg"),
  culinary: require("@/assets/categories-svg/culinary.svg"),
  delivery: require("@/assets/categories-svg/delivery.svg"),
  education: require("@/assets/categories-svg/education.svg"),
  events: require("@/assets/categories-svg/events.svg"),
  fitness: require("@/assets/categories-svg/fitness.svg"),
  maintenance: require("@/assets/categories-svg/maintenance.svg"),
  it: require("@/assets/categories-svg/it.svg"),
  media: require("@/assets/categories-svg/media.svg"),
  music: require("@/assets/categories-svg/music.svg"),
  "misc.": require("@/assets/categories-svg/misc.svg"),
  personal: require("@/assets/categories-svg/personal.svg"),
  "pet-care": require("@/assets/categories-svg/pet-care.svg"),
  sanitation: require("@/assets/categories-svg/sanitation.svg"),
};

export function getCategoryIcon(name: string): number | undefined {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return CATEGORY_SVG_ICONS[slug];
}

interface CategoryIconProps {
  name: string;
  size: number;
  tintColor?: string;
  style?: StyleProp<ImageStyle>;
}

export function CategoryIcon({ name, size, tintColor, style }: CategoryIconProps) {
  const source = getCategoryIcon(name);
  if (!source) return null;
  return (
    <ExpoImage
      source={source}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      tintColor={tintColor}
    />
  );
}
