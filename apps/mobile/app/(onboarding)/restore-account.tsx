import {
  emailSignup,
  facebookLogin,
  googleLogin,
  isRestoreRequired,
  numberLogin,
  sendPermanentDeleteOtp,
} from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
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
  const { login } = useAuth();
  const { screenPaddingStyle } = useResponsivePadding();
  const params = useLocalSearchParams<{
    method: "phone" | "email" | "google" | "facebook";
    identifier: string;
    firstName?: string;
    lastName?: string;
    requestDeletionDate: string;
    permanentDeletionDate: string;
  }>();

  const method = params.method ?? "phone";
  const identifier = params.identifier ?? "";
  const maskedIdentifier =
    method === "phone" ? maskPhone(identifier) : maskEmail(identifier);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // The permanent-delete endpoints only accept an email, so the option is
  // hidden when the account was looked up by phone number.
  const canDeletePermanently = method !== "phone";

  const handlePermanentDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await sendPermanentDeleteOtp(identifier);
      router.push({
        pathname: "/permanent-delete-otp",
        params: { email: identifier },
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to send OTP";
      Alert.alert("Error", msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      if (method === "google" || method === "facebook") {
        const socialLogin = method === "google" ? googleLogin : facebookLogin;
        const result = await socialLogin({
          email: identifier,
          firstName: params.firstName ?? "",
          lastName: params.lastName ?? "",
          restore: true,
        });
        if (isRestoreRequired(result)) {
          Alert.alert("Error", "Failed to restore account");
          return;
        }
        await login(result.accessToken, {
          user: result.user,
          profileImage: result.profileImage,
          backgroundVerification: result.backgroundVerification,
        });
        const hasCompletedProfile =
          !!result.user.user_fname?.trim() && !!result.user.user_lname?.trim();
        if (hasCompletedProfile) {
          router.replace("/home");
        } else {
          router.replace({
            pathname: "/enter-personal-details",
            params: { method: "email" },
          });
        }
      } else if (method === "email") {
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
          disabled={deleting}
          onPress={handleRestore}
        />
        {canDeletePermanently && (
          <Button
            title={deleting ? "Sending code..." : "Delete permanently"}
            variant="ghost"
            disabled={loading || deleting}
            onPress={() => setShowDeleteConfirm(true)}
            textStyle={styles.deleteText}
          />
        )}
        <Button
          title="Cancel"
          variant="ghost"
          disabled={loading || deleting}
          onPress={() => router.back()}
          textStyle={styles.cancelText}
        />
      </View>

      <ConfirmModal
        visible={showDeleteConfirm}
        type="warning"
        title="Delete account permanently?"
        message={`We will send a verification code to ${maskedIdentifier}. Once confirmed, your account and its data are permanently deleted and cannot be restored.`}
        confirmLabel="Send code"
        cancelLabel="Keep my account"
        onConfirm={handlePermanentDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
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
  deleteText: {
    color: brand.secondary,
    fontSize: 17,
    fontWeight: "500",
  },
  cancelText: {
    color: text.primary,
    fontSize: 17,
    fontWeight: "500",
  },
});
