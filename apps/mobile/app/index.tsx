import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text } = Colors;

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <ExpoImage
          source={require("@/assets/cc_logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.title}>Welcome to ConvenientConnect</Text>
        <Text style={styles.subtitle}>
          Book trusted local services and grow your business — all in one place.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          activeOpacity={0.85}
          onPress={() => router.push("/signup")}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.screen,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  subtitle: {
    fontSize: 15,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  getStartedButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: primary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
