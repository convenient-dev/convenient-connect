import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import { useBusinessSignup } from "@/contexts/BusinessSignupContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
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

const { primary, secondary, neutral, text, background } = Colors;

type AccountType = "individual" | "business";

interface Benefit {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
}

const INDIVIDUAL_BENEFITS: Benefit[] = [
  {
    icon: "person-outline",
    title: "Simple setup",
    description:
      "Start offering services quickly with a straightforward personal profile.",
  },
  {
    icon: "verified-user",
    title: "Simple verification process",
    description: "Only personal background check are required.",
  },
  {
    icon: "star-outline",
    title: "Simple integration into any lifestyle",
    description:
      "Great if you personally provide the service and manage your own schedule.",
  },
];

const BUSINESS_BENEFITS: Benefit[] = [
  {
    icon: "business",
    title: "Professional business presence",
    description:
      "Present your services as an established company rather than an individual provider.",
  },
  {
    icon: "verified-user",
    title: "Build trust with your business identity",
    description:
      "Offer services under your registered business name to strengthen credibility with customers.",
  },
];

const ACKNOWLEDGEMENTS = [
  "I understand that my provider type change requires review and may take up to X business days to complete.",
  "I understand that the switch can only proceed after all my active bookings are completed.",
  "I understand that I will not be able to accept new bookings while the switch request is under review.",
];

export default function ProfileTypeScreen() {
  const router = useRouter();
  const { reset: resetBusinessSignup } = useBusinessSignup();
  const { accountType } = useLocalSearchParams<{ accountType?: string }>();

  const current: AccountType =
    accountType === "business" ? "business" : "individual";
  const target: AccountType =
    current === "individual" ? "business" : "individual";

  const isIndividual = current === "individual";
  const benefits = isIndividual ? INDIVIDUAL_BENEFITS : BUSINESS_BENEFITS;

  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const allChecked = checked.every(Boolean);

  function toggle(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Current Profile Type</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          You are offering services as{" "}
          {isIndividual ? "an individual" : "a business"} provider.
        </Text>

        <View style={styles.selectedCard}>
          <View style={styles.selectedAvatar}>
            <ExpoImage
              source={
                isIndividual
                  ? require("@/assets/global-icons/freelancer.svg")
                  : require("@/assets/global-icons/company.svg")
              }
              style={styles.icon}
              contentFit="contain"
            />
          </View>
          <View style={styles.selectedTextWrap}>
            <Text style={styles.selectedTitle}>
              {isIndividual ? "Individual Profile" : "Business Profile"}
            </Text>
            <Text style={styles.selectedSubtitle}>Currently Selected</Text>
          </View>
          <View style={styles.checkCircle}>
            <MaterialIcons name="check" size={14} color={neutral[0]} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          As {isIndividual ? "an individual" : "a business"} provider...
        </Text>

        <View style={styles.benefits}>
          {benefits.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <MaterialIcons name={b.icon} size={22} color={primary[500]} />
              </View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDescription}>{b.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.acknowledgements}>
          {ACKNOWLEDGEMENTS.map((label, i) => (
            <TouchableOpacity
              key={label}
              style={styles.ackRow}
              activeOpacity={0.7}
              onPress={() => toggle(i)}
            >
              <View
                style={[styles.checkbox, checked[i] && styles.checkboxChecked]}
              >
                {checked[i] && (
                  <MaterialIcons name="check" size={14} color={neutral[0]} />
                )}
              </View>
              <Text style={styles.ackText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.switchButton,
            !allChecked && styles.switchButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!allChecked}
          onPress={() => {
            if (target === "business") {
              resetBusinessSignup();
              router.push("/business-details");
            }
          }}
        >
          <Text style={styles.switchButtonText}>
            Accept and Switch to{" "}
            {target === "business" ? "Business" : "Individual"}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerSpacer: { width: 40 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  subtitle: {
    fontSize: 14,
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginBottom: 18,
  },
  icon: {
    width: 28,
    height: 28,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: primary[300],
    backgroundColor: primary[50],
  },
  selectedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  selectedTextWrap: {
    flex: 1,
    gap: 2,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  selectedSubtitle: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: primary[400],
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 28,
    marginBottom: 14,
  },

  benefits: {
    gap: 16,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextWrap: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  benefitDescription: {
    fontSize: 13,
    color: neutral[400],
    lineHeight: 18,
    letterSpacing: -0.408,
  },

  acknowledgements: {
    marginTop: 24,
    gap: 14,
  },
  ackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: neutral[300],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: primary[500],
    borderColor: primary[500],
  },
  ackText: {
    flex: 1,
    fontSize: 13,
    color: text.primary,
    lineHeight: 18,
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  switchButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  switchButtonDisabled: {
    opacity: 0.5,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
