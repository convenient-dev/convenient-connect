import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { background, text, neutral, primary } = Colors;

export default function BackgroundCheck4Screen() {
  const router = useRouter();
  function handleDone() {
    // Pop the whole background-check stack so it can't be surfaced later,
    // then switch to the profile tab. The `from` param drives the custom
    // back behavior on /profile (back goes to home with SideMenu open).
    router.dismissAll();
    router.navigate("/profile?from=background-check");
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* <ScreenHeader title="Background Check Completed" /> */}

      <View style={styles.body}>
        <ExpoImage
          source={require("@/assets/global-icons/verified-success.png")}
          style={styles.illustration}
          contentFit="contain"
        />
        <Text style={styles.title}>Verified</Text>
        <Text style={styles.message}>Your background check is complete.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleDone}
        >
          <Text style={styles.primaryButtonText}>Done</Text>
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
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  illustration: {
    alignSelf: "center",
    width: 200,
    height: 200,
    marginTop: 56,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginBottom: 18,
  },
  message: {
    fontSize: 14,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.408,
    marginBottom: 14,
  },
  primaryButton: {
    height: 56,
    paddingHorizontal: 60,
    borderRadius: 999,
    backgroundColor: primary[300],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
