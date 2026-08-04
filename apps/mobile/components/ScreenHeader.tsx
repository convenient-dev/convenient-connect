import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const { text, neutral } = Colors;

interface Props {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  titleAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  titleAccessory,
  rightAccessory,
}: Props) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={styles.header}>
      <BackButton onPress={handleBack} />
      <View style={styles.headerCenter}>
        {(title || titleAccessory) && (
          <View style={styles.titleRow}>
            {title && <Text style={styles.headerTitle}>{title}</Text>}
            {titleAccessory}
          </View>
        )}
        {subtitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightAccessory ? (
        <View style={styles.headerRight}>{rightAccessory}</View>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  headerSubtitle: {
    fontSize: 12,
    color: neutral[400],
    maxWidth: 200,
  },
  headerSpacer: { width: 40 },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
