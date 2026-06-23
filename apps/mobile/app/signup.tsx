import { BackButton } from "@/components/BackButton";
import {
  buildFullPhone,
  Country,
  DEFAULT_COUNTRY,
  PhoneInput,
} from "@/components/PhoneInput";
import { Colors } from "@/constants/theme";
import { numberLogin } from "@/api/auth";
import { ApiError } from "@/api/client";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, border } = Colors;

interface SocialOption {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const SOCIAL_OPTIONS: SocialOption[] = [
  {
    key: "facebook",
    label: "Continue with Facebook",
    icon: <Ionicons name="logo-facebook" size={24} color="#1877F2" />,
  },
  {
    key: "gmail",
    label: "Continue with Gmail",
    icon: <MaterialCommunityIcons name="gmail" size={24} color="#EA4335" />,
  },
  {
    key: "email",
    label: "Continue with Email",
    icon: <MaterialIcons name="mail-outline" size={24} color={neutral[800]} />,
  },
  {
    key: "apple",
    label: "Continue with Apple",
    icon: <Ionicons name="logo-apple" size={24} color={neutral[900]} />,
  },
];

export default function SignupScreen() {
  const router = useRouter();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.back()} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Enter your phone number</Text>

          <View style={styles.phoneWrap}>
            <PhoneInput
              country={country}
              onCountryChange={setCountry}
              phone={phone}
              onPhoneChange={setPhone}
            />
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            activeOpacity={0.85}
            disabled={loading || !phone.trim()}
            onPress={async () => {
              const fullPhone = buildFullPhone(country, phone);
              setLoading(true);
              try {
                await numberLogin({ phone: fullPhone });
                router.push({
                  pathname: "/signup-by-phone",
                  params: { phone: fullPhone },
                });
              } catch (e) {
                const msg =
                  e instanceof ApiError ? e.message : "Failed to send OTP";
                Alert.alert("Error", msg);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <Text style={styles.verifyText}>Verify</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {SOCIAL_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.socialButton}
              activeOpacity={0.7}
              onPress={() => {
                if (option.key === "email") {
                  router.push("/signup-by-email");
                }
                // TODO: Wire facebook, gmail, apple social auth SDKs
              }}
            >
              <View style={styles.socialIcon}>{option.icon}</View>
              <Text style={styles.socialText}>{option.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.accountRow}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <MaterialIcons name="search" size={24} color={neutral[900]} />
            <Text style={styles.accountText}>Already have an account?</Text>
          </TouchableOpacity>

          <Text style={styles.consentText}>
            By proceeding, you consent to receiving phone calls, and messaging
            via SMS, WhatsApp and alternate platforms including by automated
            means from the Convenience App and its affiliates to the phone
            number provided
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  phoneWrap: {
    marginBottom: 16,
  },
  verifyButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },
  dividerText: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  socialButton: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: neutral[50],
    borderRadius: 999,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  socialIcon: {
    width: 28,
    alignItems: "center",
  },
  socialText: {
    flex: 1,
    textAlign: "center",
    marginRight: 28,
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  accountText: {
    fontSize: 17,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  consentText: {
    marginTop: 24,
    fontSize: 14,
    lineHeight: 21,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.2,
  },
});
