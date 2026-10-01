import { Button } from "@/components/Button";
import { useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { neutral, text } = Colors;

export default function WelcomeScreen() {
  const router = useRouter();
  const { screenPaddingStyle } = useResponsivePadding(32, 100);

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <View style={[styles.content, screenPaddingStyle]}>
        <View style={{ alignItems: "center", paddingTop: "40%" }}>
          <ExpoImage
            source={require("@/assets/ConnectApp-iOS.png")}
            style={styles.logo}
            contentFit="contain"
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
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: -0.408,
  },
});
