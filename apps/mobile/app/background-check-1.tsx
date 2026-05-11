import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, status } = Colors;

const BENEFITS = [
  "Takes only a few minutes",
  "Your information is encrypted and kept confidential",
  "Required before you can start publishing your services",
];

export default function OnboardingBackgroundCheckScreen() {
  const router = useRouter();

  function handleAccept() {
    router.push("/background-check-2");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Complete Background Check" />

      <View style={styles.body}>
        <Text style={styles.description}>
          For the safety of everyone on our platform, all providers must
          complete a quick background check. This helps us verify your identity
          and keep our community secure.
        </Text>

        <ExpoImage
          source={require("@/assets/global-icons/background-verified.svg")}
          style={styles.illustration}
          contentFit="contain"
        />

        <View style={styles.benefitsList}>
          {BENEFITS.map((item) => (
            <View key={item} style={styles.benefitRow}>
              <MaterialIcons
                name="verified-user"
                size={20}
                color={status.active}
              />
              <Text style={styles.benefitText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.acceptButton}
          activeOpacity={0.85}
          onPress={handleAccept}
        >
          <Text style={styles.acceptButtonText}>Accept and Proceed</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          By clicking on “Accept and Proceed”, you consent to provide us with
          the requested data.
        </Text>
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
    paddingTop: 12,
  },
  description: {
    fontSize: 15,
    color: text.primary,
    lineHeight: 22,
    letterSpacing: -0.408,
    marginTop: 24,
  },

  illustration: {
    alignSelf: "center",
    width: 160,
    height: 160,
    marginTop: 32,
    marginBottom: 28,
  },
  idCard: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 120,
    height: 140,
    borderRadius: 16,
    backgroundColor: neutral[100],
    paddingTop: 22,
    alignItems: "center",
  },
  idAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: neutral[300],
    marginBottom: 10,
  },
  idLineLong: {
    width: 64,
    height: 8,
    borderRadius: 4,
    backgroundColor: neutral[300],
    marginBottom: 6,
  },
  idLineMid: {
    width: 50,
    height: 8,
    borderRadius: 4,
    backgroundColor: neutral[300],
    marginBottom: 6,
  },
  idLineShort: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: neutral[300],
  },
  checkBadge: {
    position: "absolute",
    right: 0,
    bottom: 6,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: status.active,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: background.screen,
  },

  benefitsList: {
    marginTop: 4,
    gap: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: text.primary,
    lineHeight: 22,
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  acceptButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: primary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  disclaimer: {
    fontSize: 12,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: -0.408,
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
