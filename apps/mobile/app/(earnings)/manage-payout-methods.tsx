import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { brand, neutral, text, background } = Colors;

export default function ManagePayoutMethodsScreen() {
  function handleAddAccountDetails() {
    // TODO: Open Stripe Connect onboarding.
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Payout Methods" />
      <Text style={styles.subtitle}>
        We use Stripe to ensure a secure financial experience
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ExpoImage
          source={require("@/assets/banners/stripe-banner.png")}
          style={styles.banner}
          contentFit="contain"
        />

        <View style={styles.body}>
          <Text style={styles.statusTitle}>
            Your account is not connected to Stripe yet
          </Text>
          <Text style={styles.statusBody}>
            Once all account details are confirmed or updated, please allow 5-7
            business days for account verification.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={handleAddAccountDetails}
          >
            <Text style={styles.primaryButtonText}>Add account details</Text>
          </TouchableOpacity>

          <View style={styles.poweredByBadge}>
            <ExpoImage
              source={require("@/assets/global-icons/PoweredbyStripe-black.svg")}
              style={styles.poweredByImage}
              contentFit="contain"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  subtitle: {
    fontSize: 14,
    color: neutral[400],
    paddingHorizontal: 20,
    paddingBottom: 14,
    letterSpacing: -0.408,
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 32,
  },
  banner: {
    width: "100%",
    aspectRatio: 16 / 11,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    alignSelf: "stretch",
    textAlign: "center",
  },
  statusBody: {
    fontSize: 14,
    lineHeight: 22,
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 14,
    alignSelf: "stretch",
  },
  primaryButton: {
    alignSelf: "stretch",
    height: 56,
    borderRadius: 999,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  poweredByBadge: {
    marginTop: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  poweredByImage: {
    width: 96,
    height: 20,
  },
});
