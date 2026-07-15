import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import { emailSignup } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background } = Colors;

export default function SignupByEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Enter your email address</Text>

          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor={neutral[400]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!isValid || loading) && styles.continueDisabled,
            ]}
            activeOpacity={0.85}
            disabled={!isValid || loading}
            onPress={async () => {
              setLoading(true);
              try {
                await emailSignup({ email });
                router.push({
                  pathname: "/confirm-email-otp",
                  params: { email },
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
              <Text style={styles.continueText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
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
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 28,
  },
  input: {
    height: 56,
    backgroundColor: neutral[50],
    borderRadius: 12,
    paddingHorizontal: 18,
    fontSize: 17,
    color: text.primary,
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
