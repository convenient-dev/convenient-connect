import { emailSignup, numberLogin } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  contentWidthStyle,
  SCREEN_PADDING,
  useResponsivePadding,
} from "@/constants/layout";
import { Colors } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { neutral, text, background, border, brand } = Colors;

function maskPhone(phone: string): string {
  const parsed = parsePhoneNumberFromString(phone);
  if (parsed) {
    const national = parsed.nationalNumber.toString();
    return `+${parsed.countryCallingCode} ${national.slice(0, 3)} *** ${national.slice(-3)}`;
  }
  return phone;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

export default function RestoreAccountScreen() {
  const router = useRouter();
  const { screenPaddingStyle } = useResponsivePadding();
  const params = useLocalSearchParams<{
    method: "phone" | "email";
    identifier: string;
    requestDeletionDate: string;
    permanentDeletionDate: string;
  }>();

  const isEmail = params.method === "email";
  const identifier = params.identifier ?? "";
  const maskedIdentifier = isEmail
    ? maskEmail(identifier)
    : maskPhone(identifier);

  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    try {
      if (isEmail) {
        await emailSignup({ email: identifier, restore: true });
        router.replace({
          pathname: "/confirm-email-otp",
          params: { email: identifier },
        });
      } else {
        await numberLogin({ phone: identifier, restore: true });
        router.replace({
          pathname: "/signup-by-phone",
          params: { phone: identifier },
        });
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Failed to restore account";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScreenHeader />

      <View style={[styles.body, contentWidthStyle]}>
        <Text style={styles.title}>This account has been deleted</Text>

        <Text style={styles.description}>
          The account for <Text style={styles.bold}>{maskedIdentifier}</Text>{" "}
          is in a 30-day grace period. You can still restore it and pick up
          right where you left off.
        </Text>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-clear-outline"
            size={22}
            color={neutral[400]}
          />
          <Text style={styles.dateLabel}>Deletion requested</Text>
          <Text style={styles.dateValue}>{params.requestDeletionDate}</Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-clear-outline"
            size={22}
            color={brand.secondary}
          />
          <Text style={styles.dateLabel}>Permanent deletion</Text>
          <Text style={styles.dateValue}>{params.permanentDeletionDate}</Text>
        </View>
      </View>

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Restore my account"
          variant="secondary"
          size="lg"
          loading={loading}
          onPress={handleRestore}
        />
        <Button
          title="Cancel"
          variant="ghost"
          disabled={loading}
          onPress={() => router.back()}
          textStyle={styles.cancelText}
        />
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
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 20,
  },
  description: {
    fontSize: 17,
    lineHeight: 26,
    color: text.primary,
    letterSpacing: -0.408,
    marginBottom: 32,
  },
  bold: {
    fontWeight: "700",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    height: 64,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 999,
    marginBottom: 14,
  },
  dateLabel: {
    flex: 1,
    fontSize: 16,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  dateValue: {
    fontSize: 17,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
    gap: 18,
  },
  cancelText: {
    color: text.primary,
    fontSize: 17,
    fontWeight: "500",
  },
});
