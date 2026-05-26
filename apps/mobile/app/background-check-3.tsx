import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const [submitting, setSubmitting] = useState(false);

  function handleOpenAgreement() {
    WebBrowser.openBrowserAsync(AGREEMENT_URL);
  }

  async function handleAcceptAndProceed() {
    if (!accepted || submitting) return;
    setSubmitting(true);
    try {
      // TODO: Submit the agreement acceptance to the backend

      // 1. Create (or reuse) the user's Stripe connected account. The web
      //    API returns the same acct_... on subsequent calls thanks to the
      //    `stripeAccountId` mapping on the User row.
      // TODO: read userId from auth/session instead of hardcoding.
      const userId = 1;
      const acctRes = await fetch(`${WEB_BASE_URL}/api/stripe/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const acctJson = await acctRes.json();
      if (!acctRes.ok) {
        throw new Error(acctJson.error ?? "Failed to create Stripe account");
      }
      const accountId: string = acctJson.accountId;

      // 2. Mint a short-lived Account Link — this is the Stripe-hosted URL
      //    that walks the user through identity verification, bank info, etc.
      const linkRes = await fetch(
        `${WEB_BASE_URL}/api/stripe/accounts/${accountId}/link`,
        { method: "POST" },
      );
      const linkJson = await linkRes.json();
      if (!linkRes.ok || !linkJson.url) {
        throw new Error(linkJson.error ?? "Failed to create onboarding link");
      }

      // 3. Hand off to the phone's default browser. Unlike
      //    WebBrowser.openBrowserAsync, Linking.openURL does NOT block —
      //    control returns immediately, and the user will see Safari /
      //    Chrome in the foreground while our app stays in the background.
      await Linking.openURL(linkJson.url);

      // 4. Continue to the success screen now (rather than waiting for the
      //    browser to close, which we can't observe). Pass the accountId
      //    so the next screen can fetch live onboarding status from Stripe.
      router.push({
        pathname: "/background-check-4",
        params: { accountId },
      });
    } catch (err) {
      console.warn("[stripe onboarding]", err);
      // TODO: surface a user-facing error toast/banner.
    } finally {
      setSubmitting(false);
    }
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
            (!accepted || submitting) && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!accepted || submitting}
          onPress={handleAcceptAndProceed}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? "Opening Stripe…" : "Accept and Proceed"}
          </Text>
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
