import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background } = Colors;

const BULLETS = [
  "This will only delete your ConvenientConnect account",
  "You can recover your account within 30 days after that, it will be permanently deleted",
  "To delete all your data, delete your account in ConvenientApp",
];

export default function DeleteAccountWarningScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Delete Account" />

      <View style={[styles.body, contentWidthStyle]}>
        <Text style={styles.subtitle}>
          Are you sure you want to delete your account?
        </Text>

        <Image
          source={require("@/assets/global-icons/delete_account_icon.png")}
          style={styles.illustration}
          resizeMode="contain"
        />

        <View style={styles.bulletList}>
          {BULLETS.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>{"•"}</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.7}
          onPress={() => setAcknowledged((v) => !v)}
        >
          <View
            style={[styles.checkbox, acknowledged && styles.checkboxChecked]}
          >
            {acknowledged && (
              <MaterialIcons name="check" size={16} color={neutral[0]} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand that this action cannot be undone
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Continue"
          variant="secondary"
          size="lg"
          disabled={!acknowledged}
          onPress={() => router.push("/delete-account")}
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
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 17,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.408,
    marginTop: 16,
  },
  illustration: {
    alignSelf: "center",
    width: 240,
    height: 190,
    marginTop: 32,
    marginBottom: 32,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 24,
    color: text.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: text.primary,
    letterSpacing: -0.408,
  },
  bulletHighlight: {
    color: secondary[400],
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: neutral[300],
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: secondary[500],
    borderColor: secondary[500],
  },
  checkboxLabel: {
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
