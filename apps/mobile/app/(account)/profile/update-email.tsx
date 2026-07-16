import { ApiError } from "@/api/client";
import { requestEmailOtp } from "@/api/profile";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, border } = Colors;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_EMAIL_MESSAGE = "Please enter a valid email address.";

export default function UpdateEmailScreen() {
  const router = useRouter();
  const { email: initial } = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState<string>(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = email.trim();
  const emailError =
    trimmed.length > 0 && !EMAIL_REGEX.test(trimmed)
      ? INVALID_EMAIL_MESSAGE
      : null;
  const isChanged =
    trimmed.toLowerCase() !== (initial ?? "").trim().toLowerCase();
  const canSave = trimmed.length > 0 && !emailError && isChanged && !saving;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await requestEmailOtp(trimmed);
      router.push({
        pathname: "/verify-email-otp",
        params: { email: trimmed },
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Failed to send OTP. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Update Email" />

        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor={neutral[400]}
              value={email}
              onChangeText={setEmail}
              editable={!saving}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
            />
            {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
          </View>
          <Text style={styles.subtitle}>
            If you wish to update your email address or no longer have access to
            the previous one, you can update it here. A verification code will
            be sent to your new email address for confirmation.
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          <Button
            title="Verify"
            variant="secondary"
            size="md"
            loading={saving}
            disabled={!canSave}
            onPress={handleSave}
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
    paddingTop: 8,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  inputError: {
    borderColor: secondary[500],
  },
  fieldError: {
    fontSize: 12,
    color: secondary[500],
    letterSpacing: -0.408,
  },
  subtitle: {
    fontSize: 14,
    color: neutral[400],
    letterSpacing: -0.408,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 13,
    color: secondary[500],
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
