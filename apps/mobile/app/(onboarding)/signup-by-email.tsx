import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { emailSignup } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { neutral, text, background } = Colors;

export default function SignupByEmailScreen() {
  const router = useRouter();
  const { screenPaddingStyle } = useResponsivePadding();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader />

        <View style={[styles.body, contentWidthStyle]}>
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

        <View style={[styles.footer, contentWidthStyle]}>
          <Button
            title="Continue"
            variant="secondary"
            size="lg"
            loading={loading}
            disabled={!isValid}
            onPress={async () => {
              setLoading(true);
              try {
                const result = await emailSignup({ email });
                if (result?.restore_required) {
                  router.push({
                    pathname: "/restore-account",
                    params: {
                      method: "email",
                      identifier: email,
                      requestDeletionDate: result.request_deletion_date ?? "",
                      permanentDeletionDate:
                        result.permanent_deletion_date ?? "",
                    },
                  });
                  return;
                }
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
          />
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
});
