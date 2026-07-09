import { BackButton } from "@/components/BackButton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors } from "@/constants/theme";
import { useBusinessSignup } from "@/contexts/BusinessSignupContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { brand, primary, secondary, neutral, text, background, status } = Colors;


const ACCOUNT_LAST_FOUR = "5114"; // TODO: Get from API.

export default function UpdateBankAccountScreen() {
  const router = useRouter();
  // Business details, services, and documents collected on the previous
  // screens of the create-business flow.
  const params = useLocalSearchParams<{
    businessName?: string;
    categoryNames?: string;
  }>();
  const { addPendingBusiness, reset } = useBusinessSignup();
  const [successVisible, setSuccessVisible] = useState(false);

  function handleUpdateDetails() {
    // TODO: Open Stripe to update account details.
  }

  function handleSubmit() {
    // TODO: Submit `params` (business details, serviceIds) and the uploaded
    // documents/EIN to the create-business API once it exists.
    setSuccessVisible(true);
  }

  function handleSuccessConfirm() {
    setSuccessVisible(false);
    addPendingBusiness({
      name: params.businessName ?? "",
      categories: (params.categoryNames ?? "").split(",").filter(Boolean),
    });
    reset();
    router.dismissTo("/business-management");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Update Bank Account</Text>
        <Text style={styles.subtitle}>
          Please update the connected account below.
        </Text>

        <View style={styles.statusRow}>
          <MaterialIcons name="check-circle" size={22} color={status.active} />
          <Text style={styles.statusText}>
            Your account is connected to Stripe
          </Text>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.accountText}>
            Connected account ending in{" "}
            <Text style={styles.accountHighlight}>{ACCOUNT_LAST_FOUR}</Text>
          </Text>
        </View>

        <Text style={styles.helperText}>
          You may update your account details on Stripe by selecting the button
          below. Please allow 5-7 business days for account verification.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.updateButton}
          activeOpacity={0.85}
          onPress={handleUpdateDetails}
        >
          <Text style={styles.updateButtonText}>Update account details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitButton}
          activeOpacity={0.85}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Submit with this account</Text>
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={successVisible}
        icon="success"
        title="Success"
        message="Your business is now under review. We'll notify you once it has been approved."
        confirmLabel="Done"
        onConfirm={handleSuccessConfirm}
      />
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerSpacer: { flex: 1 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 20,
    marginTop: 14,
    marginBottom: 22,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },

  accountCard: {
    backgroundColor: neutral[50],
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  accountText: {
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
  },
  accountHighlight: {
    color: primary[400],
    fontWeight: "600",
  },

  helperText: {
    fontSize: 13,
    color: neutral[400],
    lineHeight: 19,
    letterSpacing: -0.408,
    marginTop: 16,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  updateButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
