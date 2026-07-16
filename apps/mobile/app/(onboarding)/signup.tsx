import { facebookLogin, googleLogin, numberLogin } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import {
  facebookSignOutQuietly,
  signInWithFacebook,
} from "@/auth/facebook";
import { googleSignOutQuietly, signInWithGoogle } from "@/auth/google";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  buildFullPhone,
  Country,
  DEFAULT_COUNTRY,
  PhoneInput,
} from "@/components/PhoneInput";
import { Colors } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
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

const { neutral, text, background, border } = Colors;

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
    icon: (
      <ExpoImage
        source={require("@/assets/global-icons/gmail-logo.svg")}
        style={{ width: 18, height: 18 }}
        contentFit="contain"
      />
    ),
  },
  // {
  //   key: "apple",
  //   label: "Continue with Apple",
  //   icon: <Ionicons name="logo-apple" size={24} color={neutral[900]} />,
  // },
  {
    key: "email",
    label: "Continue with Email",
    icon: <MaterialIcons name="mail-outline" size={24} color={neutral[800]} />,
  },
];

export default function SignupScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (socialLoading) return;
    setSocialLoading("gmail");
    try {
      const google = await signInWithGoogle();
      if (google.status === "cancelled") return;
      if (google.status === "error") {
        Alert.alert("Error", google.message);
        return;
      }
      const result = await googleLogin({
        email: google.email,
        firstName: google.firstName,
        lastName: google.lastName,
      });
      await login(result.accessToken, {
        user: result.user,
        providerType: result.providerType,
        profileImage: result.profileImage,
        backgroundVerification: result.backgroundVerification,
        businessVerification: result.businessVerification,
      });
      if (result.providerType) {
        router.replace("/home");
      } else {
        router.replace({
          pathname: "/enter-personal-details",
          params: { method: "email" },
        });
      }
    } catch (e) {
      await googleSignOutQuietly();
      const msg = e instanceof ApiError ? e.message : "Google sign-in failed";
      Alert.alert("Error", msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    if (socialLoading) return;
    setSocialLoading("facebook");
    try {
      const facebook = await signInWithFacebook();
      if (facebook.status === "cancelled") return;
      if (facebook.status === "error") {
        Alert.alert("Error", facebook.message);
        return;
      }
      const result = await facebookLogin({
        email: facebook.email,
        firstName: facebook.firstName,
        lastName: facebook.lastName,
      });
      await login(result.accessToken, {
        user: result.user,
        providerType: result.providerType,
        profileImage: result.profileImage,
        backgroundVerification: result.backgroundVerification,
        businessVerification: result.businessVerification,
      });
      if (result.providerType) {
        router.replace("/home");
      } else {
        router.replace({
          pathname: "/enter-personal-details",
          params: { method: "email" },
        });
      }
    } catch (e) {
      await facebookSignOutQuietly();
      const msg = e instanceof ApiError ? e.message : "Facebook sign-in failed";
      Alert.alert("Error", msg);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader />

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

          <Button
            title="Verify"
            variant="secondary"
            size="lg"
            loading={loading}
            disabled={!phone.trim()}
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
          />

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
              disabled={socialLoading !== null}
              onPress={() => {
                if (option.key === "email") {
                  router.push("/signup-by-email");
                }
                if (option.key === "gmail") {
                  handleGoogleLogin();
                }
                if (option.key === "facebook") {
                  handleFacebookLogin();
                }
                // TODO: Wire apple social auth SDK
              }}
            >
              <View style={styles.socialIcon}>{option.icon}</View>
              {socialLoading === option.key ? (
                <ActivityIndicator
                  style={styles.socialSpinner}
                  color={neutral[800]}
                />
              ) : (
                <Text style={styles.socialText}>{option.label}</Text>
              )}
            </TouchableOpacity>
          ))}

          <Text style={styles.consentText}>
            By proceeding, you consent to receiving phone calls, and messaging
            via SMS, WhatsApp, and platforms, including by automated means, from
            the CONVENIENT App and its affiliates to the phone number provided.
            By continuing, you agree to our Terms of Service and Privacy Policy.
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
  socialSpinner: {
    flex: 1,
    marginRight: 28,
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
    fontSize: 12,
    lineHeight: 18,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.2,
  },
});
