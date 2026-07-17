import { Button } from "@/components/Button";
import { useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { neutral, text } = Colors;

export default function WelcomeScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { screenPaddingStyle } = useResponsivePadding(32, 100);

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <View style={[styles.content, screenPaddingStyle]}>
        <View style={{ alignItems: "center", paddingTop: "40%" }}>
          <LottieView
            source={require("@/assets/splash-screen-logo.json")}
            autoPlay={!reducedMotion}
            loop={false}
            resizeMode="contain"
            style={styles.logo}
          />
          <Text style={styles.title}>Welcome to ConvenientConnect</Text>
          <Text style={styles.subtitle}>
            Your Platform to Promote and Grow Your Services.
          </Text>
        </View>

        <Button
          style={{ maxWidth: 500 }}
          title="Get Started"
          variant="primary"
          size="lg"
          onPress={() => router.push("/signup")}
        />
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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 50,
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
});
