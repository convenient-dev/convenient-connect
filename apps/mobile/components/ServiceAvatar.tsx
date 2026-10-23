import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const { primary } = Colors;

interface Props {
  /** Portfolio image URL; the placeholder shows when null or empty. */
  uri?: string | null;
  /** Diameter in px. The placeholder icon scales with it. */
  size: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Round service thumbnail with a shared fallback for listings that have no portfolio image yet.
 */
export function ServiceAvatar({ uri, size, style }: Props) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <ExpoImage source={{ uri }} style={styles.image} contentFit="cover" />
      ) : (
        <MaterialIcons
          name="image"
          size={Math.round(size * 0.33)}
          color={primary[300]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
