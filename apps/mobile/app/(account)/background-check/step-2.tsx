import { ScreenHeader } from "@/components/ScreenHeader";
import { SwipeButton } from "@/components/SwipeButton";
import { Colors } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, status, border, overlay } = Colors;

const FEE = "$19.99";

interface Feature {
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  image?: number;
  label: string;
}

const FEATURES: Feature[] = [
  {
    image: require("@/assets/global-icons/valid.svg"),
    label: "Pay once, no\nrecurring charges",
  },
  {
    image: require("@/assets/global-icons/unlock.svg"),
    label: "Unlocks full\naccess to publish\nyour services",
  },
  {
    image: require("@/assets/global-icons/good-person.svg"),
    label: "Get Verified &\nBuild Trust",
  },
];

function FeatureCard({ image, label }: Feature) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconWrap}>
        <ExpoImage
          source={image}
          style={styles.featureImage}
          contentFit="contain"
        />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

export default function BackgroundCheck2Screen() {
  const router = useRouter();
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  function openPaymentSheet() {
    setPaymentSheetVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closePaymentSheet(callback?: () => void) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPaymentSheetVisible(false);
      callback?.();
    });
  }

  function handleSelectMethod(_method: "apple-pay" | "cash-app" | "add-card") {
    // TODO: Integrate the real payment provider for the selected method
    // (Apple Pay, Cash App, or a newly added card) and only navigate forward
    // once the charge succeeds. For now we just continue the flow.
    closePaymentSheet(() => {
      router.push("/background-check/step-3");
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`${FEE} One Time Sign up Fee`} />

      <View style={styles.body}>
        <Text style={styles.description}>
          This one-time fee helps verify your profile and keep our platform
          running smoothly.
        </Text>

        <ExpoImage
          source={require("@/assets/global-icons/businessman.png")}
          style={styles.illustration}
          contentFit="contain"
        />

        <View style={styles.featuresRow}>
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.label} {...feature} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <SwipeButton
          label={`Slide to pay ${FEE}`}
          onComplete={openPaymentSheet}
        />
      </View>

      <Modal
        visible={paymentSheetVisible}
        transparent
        animationType="none"
        onRequestClose={() => closePaymentSheet()}
      >
        <Animated.View
          style={[styles.sheetBackdrop, { opacity: backdropAnim }]}
        >
          <Pressable style={{ flex: 1 }} onPress={() => closePaymentSheet()} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Make Payment</Text>
          <View style={styles.sheetDivider} />

          <View style={styles.sheetBody}>
            <Text style={styles.sheetSectionLabel}>Primary Method</Text>

            <TouchableOpacity
              style={[styles.payOption, styles.applePayOption]}
              activeOpacity={0.85}
              onPress={() => handleSelectMethod("apple-pay")}
            >
              <Ionicons name="logo-apple" size={22} color={neutral[0]} />
              <Text style={[styles.payOptionText, styles.applePayText]}>
                Pay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payOption, styles.cashAppOption]}
              activeOpacity={0.85}
              onPress={() => handleSelectMethod("cash-app")}
            >
              <View style={styles.cashAppBadge}>
                <Text style={styles.cashAppBadgeText}>$</Text>
              </View>
              <Text style={[styles.payOptionText, styles.cashAppText]}>
                Cash App
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payOption, styles.addCardOption]}
              activeOpacity={0.85}
              onPress={() => handleSelectMethod("add-card")}
            >
              <MaterialIcons name="add" size={22} color={neutral[0]} />
              <Text style={[styles.payOptionText, styles.addCardText]}>
                Add Another Card
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 32,
    marginTop: 16,
  },
  feeAmount: {
    fontWeight: "700",
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
  avatarCircle: {
    position: "absolute",
    top: 0,
    left: 70,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: primary[200],
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coin: {
    position: "absolute",
    bottom: 12,
    left: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3c14a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#e8a93a",
  },
  coinText: {
    fontSize: 22,
    fontWeight: "700",
    color: neutral[700],
  },
  chart: {
    position: "absolute",
    right: 6,
    bottom: 8,
  },

  featuresRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  featureCard: {
    flex: 1,
    backgroundColor: neutral[50],
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureImage: {
    width: 36,
    height: 36,
  },
  featureCheck: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: status.active,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: neutral[50],
  },
  featureLabel: {
    fontSize: 13,
    color: text.primary,
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlay.light,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: background.screen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[300],
    alignSelf: "center",
    marginTop: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: neutral[700],
    textAlign: "center",
    paddingVertical: 14,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: border.default,
    marginHorizontal: 20,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  sheetSectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
  },

  payOption: {
    height: 64,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payOptionText: {
    fontSize: 22,
    fontWeight: "700",
    color: neutral[0],
  },
  applePayOption: {
    backgroundColor: neutral[1000],
  },
  applePayText: {
    fontSize: 22,
    fontWeight: "600",
    marginLeft: 2,
  },
  cashAppOption: {
    backgroundColor: "#00d54b",
  },
  cashAppBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: neutral[0],
    alignItems: "center",
    justifyContent: "center",
  },
  cashAppBadgeText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#00d54b",
    lineHeight: 24,
  },
  cashAppText: {
    fontSize: 22,
    fontWeight: "700",
  },
  addCardOption: {
    backgroundColor: "#7dcdd6",
  },
  addCardText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
