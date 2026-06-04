import { setCurrentUserId } from "@/constants/session";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background } = Colors;

type ProviderType = "individual" | "business";

interface Option {
  type: ProviderType;
  title: string;
  description: string;
  icon: ImageSource;
}

const OPTIONS: Option[] = [
  {
    type: "individual",
    title: "Individual",
    description: "Freelancer or sole proprietor",
    icon: require("@/assets/global-icons/freelancer.svg"),
  },
  {
    type: "business",
    title: "Business",
    description: "Registered business entity",
    icon: require("@/assets/global-icons/company.svg"),
  },
];

export default function SelectProviderTypeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<ProviderType | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.body}>
        <Text style={styles.title}>
          Select the provider type that best describes you
        </Text>

        <View style={styles.cardRow}>
          {OPTIONS.map((option) => {
            const isSelected = selected === option.type;
            return (
              <TouchableOpacity
                key={option.type}
                style={[styles.card, isSelected && styles.cardSelected]}
                activeOpacity={0.8}
                onPress={() => setSelected(option.type)}
              >
                <ExpoImage
                  source={option.icon}
                  style={styles.cardIcon}
                  contentFit="contain"
                />
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selected && styles.continueDisabled]}
          activeOpacity={0.85}
          disabled={!selected}
          onPress={() => {
            if (selected === "business") {
              setCurrentUserId(2);
              router.push("/enter-business-details");
            } else {
              setCurrentUserId(1);
              router.push("/enter-personal-details");
            }
          }}
        >
          <Text style={styles.continueText}>Continue</Text>
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
    paddingHorizontal: 20,
    paddingTop: 120,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 28,
  },
  cardRow: {
    flexDirection: "row",
    gap: 16,
  },
  card: {
    flex: 1,
    backgroundColor: neutral[50],
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  cardSelected: {
    borderColor: primary[400],
    backgroundColor: primary[50],
  },
  cardIcon: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  cardDescription: {
    fontSize: 13,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  continueButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  continueDisabled: {
    opacity: 0.6,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
