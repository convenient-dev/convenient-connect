import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, brand, background } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const BULLETS = [
  "This action cannot be undone",
  "Existing bookings (if any) will not be affected",
  "You'll need to create a new service if you want to offer this again",
];

export default function DeleteServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [pausing, setPausing] = useState(false);

  async function handlePause() {
    setPausing(true);
    try {
      await fetch(`${API_BASE_URL}/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      });
      router.back();
    } catch {
      setPausing(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Delete Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.warningText}>
          Deleting a service will permanently remove it from your profile and it
          will no longer be visible to clients.
        </Text>

        <View style={styles.bullets}>
          {BULLETS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.altHeading}>Not ready to delete?</Text>
        <Text style={styles.altBody}>
          You can <Text style={styles.altBold}>inactivate this service</Text>{" "}
          instead and resume it anytime.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            router.push({
              pathname: "/edit-service/[id]/delete-reason",
              params: { id },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.deleteBtnText}>Continue to delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pauseBtn}
          onPress={handlePause}
          disabled={pausing}
          activeOpacity={0.85}
        >
          {pausing ? (
            <ActivityIndicator size="small" color={neutral[0]} />
          ) : (
            <Text style={styles.pauseBtnText}>Inactivate service</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: neutral[800],
  },
  headerSpacer: { width: 38 },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  warningText: {
    fontSize: 15,
    color: neutral[800],
    lineHeight: 23,
  },
  bullets: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bulletDot: {
    fontSize: 15,
    color: neutral[800],
    lineHeight: 23,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: neutral[800],
    lineHeight: 23,
  },
  altHeading: {
    fontSize: 15,
    fontWeight: "600",
    color: primary[400],
    marginTop: 8,
  },
  altBody: {
    fontSize: 15,
    color: neutral[800],
    lineHeight: 23,
  },
  altBold: {
    fontWeight: "700",
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 12,
  },
  deleteBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: brand.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
  },
  pauseBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: neutral[1000],
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
  },
});
