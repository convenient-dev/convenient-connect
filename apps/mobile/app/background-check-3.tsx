import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// The agreement page is served by the Next.js web app at /agreement, so
// non-engineers can update the copy without shipping a new mobile build.
const WEB_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api"
).replace(/\/api\/?$/, "");
const AGREEMENT_URL = `${WEB_BASE_URL}/agreement`;

const { primary, neutral, text, background } = Colors;

export default function BackgroundCheck3Screen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  function handleOpenAgreement() {
    WebBrowser.openBrowserAsync(AGREEMENT_URL);
  }

  function handleAcceptAndProceed() {
    if (!accepted) return;
    // TODO: Submit the agreement acceptance to the backend
    router.push("/background-check-4");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Agreement" />

      <View style={styles.body}>
        <Text style={styles.description}>
          Please read and accept our{" "}
          <Text style={styles.descriptionLink} onPress={handleOpenAgreement}>
            Agreement
          </Text>{" "}
          to start offering services on our platform.
        </Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.7}
          onPress={() => setAccepted((v) => !v)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && (
              <MaterialIcons name="check" size={16} color={neutral[0]} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and understood the agreement.
          </Text>
        </TouchableOpacity>

        <ExpoImage
          source={require("@/assets/global-icons/contract.svg")}
          style={styles.illustration}
          contentFit="contain"
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !accepted && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!accepted}
          onPress={handleAcceptAndProceed}
        >
          <Text style={styles.primaryButtonText}>Accept and Proceed</Text>
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
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  description: {
    fontSize: 16,
    color: text.primary,
    lineHeight: 24,
    letterSpacing: -0.408,
  },
  descriptionLink: {
    color: primary[400],
    fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: neutral[700],
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: primary[400],
    borderColor: primary[400],
  },
  checkboxLabel: {
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
    flexShrink: 1,
  },
  illustration: {
    alignSelf: "center",
    width: 200,
    height: 200,
    marginTop: 56,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: primary[300],
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
