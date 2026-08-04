import { addBusinessProfile } from "@/api/business";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useBusinessSignup } from "@/contexts/BusinessSignupContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, status } = Colors;


const ACCOUNT_LAST_FOUR = "5114"; // TODO: Get from API.

export default function UpdateBankAccountScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  // Business details, services, and documents collected on the previous
  // screens of the create-business flow.
  const params = useLocalSearchParams<{
    businessName?: string;
    businessAddress?: string;
    countryId?: string;
    countryName?: string;
    stateId?: string;
    stateName?: string;
    cityId?: string;
    cityName?: string;
    zipcode?: string;
    about?: string;
    serviceIds?: string;
    categoryNames?: string;
  }>();
  const { data, addPendingBusiness, reset } = useBusinessSignup();
  const [successVisible, setSuccessVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleUpdateDetails() {
    // TODO: Open Stripe to update account details.
  }

  async function handleSubmit() {
    if (submitting) return;

    const {
      businessName,
      businessAddress,
      countryId,
      stateId,
      cityId,
      zipcode,
      about,
      serviceIds,
    } = params;

    // Validate required params
    if (
      !businessName ||
      !businessAddress ||
      !countryId ||
      !stateId ||
      !cityId ||
      !serviceIds
    ) {
      Alert.alert("Error", "Missing required business information");
      return;
    }

    const serviceSubCategoryIds = serviceIds
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (serviceSubCategoryIds.length === 0) {
      Alert.alert("Error", "No services selected");
      return;
    }

    setSubmitting(true);

    try {
      // TODO: Get Stripe account info from the connected account
      // For now, we'll pass placeholder values
      const stripeAccountId = "acct_placeholder";
      const stripeAccountLastFour = ACCOUNT_LAST_FOUR;

      await addBusinessProfile({
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        about: about?.trim() || null,
        countryId: parseInt(countryId, 10),
        stateId: parseInt(stateId, 10),
        cityId: parseInt(cityId, 10),
        zipcode: zipcode?.trim() || null,
        businessDocuments: data.registrationDoc?.url
          ? await uriToBlob(data.registrationDoc.url)
          : undefined,
        governmentIssuedId: data.governmentId?.url
          ? await uriToBlob(data.governmentId.url)
          : undefined,
        businessEin: data.ein || null,
        serviceSubCategoryIds,
        // Stripe info - for now just pass as data in the request
        stripeAccountId,
        stripeAccountLastFour,
      });

      setSuccessVisible(true);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Failed to create business profile. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return await response.blob();
  }

  function handleSuccessConfirm() {
    setSuccessVisible(false);
    addPendingBusiness({
      name: params.businessName ?? "",
      categories: (params.categoryNames ?? "").split(",").filter(Boolean),
      address: params.businessAddress ?? "",
      country: params.countryName ?? "",
      state: params.stateName ?? "",
      city: params.cityName ?? "",
      zipCode: params.zipcode ?? "",
      about: params.about ?? "",
    });
    reset();
    router.dismissTo("/business-management");
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
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

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Update account details"
          variant="primary"
          size="lg"
          disabled={submitting}
          onPress={handleUpdateDetails}
        />

        <Button
          title={submitting ? "Submitting..." : "Submit with this account"}
          variant="secondary"
          size="lg"
          disabled={submitting}
          onPress={handleSubmit}
        />
      </View>

      {submitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      )}

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

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
