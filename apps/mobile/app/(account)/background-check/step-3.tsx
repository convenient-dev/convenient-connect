import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCurrentUser } from "@/constants/session";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

export default function BackgroundCheck3Screen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenAgreement() {
    // TODO: legacy API removed — serve the agreement page via the Laravel backend
    console.log("TODO: implement agreement page via Laravel API");
  }

  async function handleAcceptAndProceed() {
    if (!accepted || submitting) return;
    setSubmitting(true);
    try {
      // TODO: Submit the agreement acceptance to the backend

      // TODO: legacy API removed — implement Stripe Connect onboarding
      // (create connected account + account link + browser handoff) via
      // Laravel API
      console.log(
        "TODO: implement Stripe Connect onboarding via Laravel API",
        { userId },
      );

      router.push("/background-check/step-4");
    } catch (err) {
      console.warn("[stripe onboarding]", err);
      // TODO: surface a user-facing error toast/banner.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Agreement" />

      <View style={[styles.body, contentWidthStyle]}>
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

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title={submitting ? "Opening Stripe…" : "Accept and Proceed"}
          variant="primary"
          size="lg"
          disabled={!accepted || submitting}
          onPress={handleAcceptAndProceed}
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
});
