import { ApiError } from "@/api/client";
import { requestPhoneOtp } from "@/api/profile";
import {
  buildFullPhone,
  Country,
  DEFAULT_COUNTRY,
  parseInitialPhone,
  toCountry,
} from "@/components/PhoneInput";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CountryPicker, { CountryCode } from "react-native-country-picker-modal";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, border } = Colors;

const LOCAL_PHONE_REGEX = /^[\d\s\-()]+$/;
const INVALID_PHONE_MESSAGE = "Please enter a valid phone number.";

export default function UpdatePhoneScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { phoneNumber: initial } = useLocalSearchParams<{
    phoneNumber?: string;
  }>();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the stored number's country/local parts from the picker's offline
  // data once on mount (lookup is async).
  useEffect(() => {
    let active = true;
    parseInitialPhone(initial).then(({ country, local }) => {
      if (!active) return;
      setCountry(country);
      setPhone(local);
    });
    return () => {
      active = false;
    };
  }, [initial]);

  const trimmed = phone.trim();
  const digitCount = trimmed.replace(/\D/g, "").length;
  const phoneError =
    trimmed.length > 0 &&
    (!LOCAL_PHONE_REGEX.test(trimmed) || digitCount < 7 || digitCount > 15)
      ? INVALID_PHONE_MESSAGE
      : null;

  const fullNumber = buildFullPhone(country, trimmed);
  const initialFull = (initial ?? "").trim();
  const isChanged = fullNumber !== initialFull;
  const canSave = trimmed.length > 0 && !phoneError && isChanged && !saving;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await requestPhoneOtp(fullNumber);
      router.push({
        pathname: "/verify-phone-otp",
        params: { phone: fullNumber },
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
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Update Phone Number" />

        <View style={[styles.body, contentWidthStyle]}>
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <CountryPicker
                countryCode={country.code as CountryCode}
                withModal
                withFilter
                withFlag
                withEmoji
                withCallingCode
                withAlphaFilter={false}
                onSelect={(c) => setCountry(toCountry(c))}
                modalProps={{ animationType: "slide" }}
                renderFlagButton={({ onOpen }) => (
                  <TouchableOpacity
                    style={styles.codeButton}
                    activeOpacity={0.7}
                    onPress={saving ? undefined : onOpen}
                    disabled={saving}
                  >
                    <Text style={styles.codeFlag}>{country.flag}</Text>
                    <Text style={styles.codeDial}>{country.dial}</Text>
                    <MaterialIcons
                      name="arrow-drop-down"
                      size={20}
                      color={neutral[500]}
                    />
                  </TouchableOpacity>
                )}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.phoneInput,
                  phoneError && styles.inputError,
                ]}
                placeholder="(555) 123-4567"
                placeholderTextColor={neutral[400]}
                value={phone}
                onChangeText={setPhone}
                editable={!saving}
                autoCorrect={false}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>
            {phoneError && <Text style={styles.fieldError}>{phoneError}</Text>}
          </View>
          <Text style={styles.subtitle}>
            A verification code will be sent to this number.
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={[styles.footer, contentWidthStyle]}>
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
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
  },
  codeFlag: {
    fontSize: 18,
  },
  codeDial: {
    fontSize: 14,
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
  phoneInput: {
    flex: 1,
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
