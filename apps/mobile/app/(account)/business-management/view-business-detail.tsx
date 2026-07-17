import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useBusinessSignup } from "@/contexts/BusinessSignupContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { neutral, text, background, border, status } = Colors;

// TODO: Get the connected bank account from the API once it exists.
const BANK_ACCOUNT = {
  holderName: "William Conzalez",
  routingLastFour: "0015",
  accountLastFour: "6789",
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

export default function ViewBusinessDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pendingBusinesses } = useBusinessSignup();
  const business = pendingBusinesses.find((b) => b.id === Number(id));

  if (!business) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <ScreenHeader title="Business Details" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Business not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isVerified = business.status === "verified";

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScreenHeader title="Business Details" />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <DetailField label="Business Name" value={business.name} />
          <DetailField label="Business Address" value={business.address} />
        </View>

        <View style={styles.card}>
          <DetailField label="Country" value={business.country} />
          <DetailField label="State" value={business.state} />
          <DetailField label="City" value={business.city} />
          <DetailField label="Zip code" value={business.zipCode} />
        </View>

        <View style={styles.card}>
          <DetailField label="About" value={business.about} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bank Account</Text>
          <DetailField
            label="Account holder name"
            value={BANK_ACCOUNT.holderName}
          />
          <DetailField
            label="Routing number"
            value={`*****${BANK_ACCOUNT.routingLastFour}`}
          />
          <DetailField
            label="Account number"
            value={`********${BANK_ACCOUNT.accountLastFour}`}
          />
        </View>

        <View style={[styles.card, styles.verificationCard]}>
          <Text style={styles.verificationText}>
            Business Document Verification
          </Text>
          <MaterialIcons
            name={isVerified ? "check-circle" : "schedule"}
            size={20}
            color={isVerified ? status.active : status.inactive}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Edit"
          variant="secondary"
          size="lg"
          onPress={() => {
            // TODO: Open the edit-business flow once it exists.
          }}
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
  flex: { flex: 1 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 14,
    padding: 18,
    backgroundColor: background.card,
    gap: 16,
  },
  cardTitle: {
    fontSize: 17,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  fieldValue: {
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 24,
  },
  verificationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verificationText: {
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
