import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { useCurrentUser } from "@/constants/session";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;


const BULLETS = [
  "This action cannot be undone",
  "Existing bookings (if any) will not be affected",
  "You'll need to create a new service if you want to offer this again",
];

export default function DeleteServiceScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [pausing, setPausing] = useState(false);

  async function handlePause() {
    setPausing(true);
    try {
      // TODO: legacy API removed — implement inactivate service via Laravel API
      console.log("TODO: implement inactivate service via Laravel API", {
        userId,
        id,
      });
      router.back();
    } catch {
      setPausing(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      {/* Header */}

      <ScreenHeader title="Delete Service" />

      <View style={[styles.body, contentWidthStyle]}>
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

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Continue to delete"
          variant="secondary"
          size="lg"
          onPress={() =>
            router.push({
              pathname: "/edit-service/[id]/delete-reason",
              params: { id },
            })
          }
        />

        <Button
          title="Inactivate service"
          variant="dark"
          size="lg"
          loading={pausing}
          onPress={handlePause}
        />
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
});
