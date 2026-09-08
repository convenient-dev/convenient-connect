import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { confirmEmail, resendOtpEmail } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

const CODE_LENGTH = 4;
const RESEND_SECONDS = 57;

interface ModalState {
  icon: "success" | "error";
  title: string;
  message: string;
  /** When set, runs after the modal is dismissed (e.g. clear the OTP input). */
  onConfirm?: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ConfirmEmailOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { login } = useAuth();
  const { screenPaddingStyle } = useResponsivePadding();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  function handleChange(value: string, index: number) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function clearOtp() {
    setDigits(Array(CODE_LENGTH).fill(""));
    inputs.current[0]?.focus();
  }

  async function handleResend() {
    if (!email || seconds > 0 || resending) return;
    setResending(true);
    try {
      await resendOtpEmail(email);
      clearOtp();
      setSeconds(RESEND_SECONDS);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to resend OTP";
      setModal({
        icon: "error",
        title: "Error",
        message: msg,
        onConfirm: clearOtp,
      });
    } finally {
      setResending(false);
    }
  }

  const isComplete = digits.every((d) => d.length === 1);

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) =>
        a + "*".repeat(b.length) + c,
      )
    : "";

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
          <Text style={styles.title}>
            Enter the 4-digit code sent to {maskedEmail}
          </Text>

          <View style={styles.codeRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={[styles.codeBox, digit ? styles.codeBoxFilled : null]}
                value={digit}
                onChangeText={(value) => handleChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                returnKeyType="done"
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            {seconds > 0 ? (
              <Text style={styles.timer}>
                Resend code in {formatTimer(seconds)}
              </Text>
            ) : (
              <Button
                title={resending ? "Sending..." : "Resend code"}
                variant="ghost"
                disabled={resending}
                onPress={handleResend}
              />
            )}
          </View>
        </View>

        <View style={[styles.footer, contentWidthStyle]}>
          <Button
            title="Continue"
            variant="secondary"
            size="lg"
            loading={loading}
            disabled={!isComplete}
            onPress={async () => {
              if (!email) return;
              setLoading(true);
              try {
                const result = await confirmEmail(email, digits.join(""));
                await login(result.accessToken, {
                  user: result.user,
                  profileImage: result.profileImage,
                  backgroundVerification: result.backgroundVerification,
                });

                // Check if user has completed profile by checking if they have both names.
                const hasCompletedProfile =
                  !!result.user.user_fname?.trim() &&
                  !!result.user.user_lname?.trim();

                if (hasCompletedProfile) {
                  router.replace("/home");
                } else {
                  router.replace({
                    pathname: "/enter-personal-details",
                    params: { method: "email" },
                  });
                }
              } catch (e) {
                const msg =
                  e instanceof ApiError ? e.message : "Verification failed";
                setModal({
                  icon: "error",
                  title: "Error",
                  message: msg,
                  onConfirm: clearOtp,
                });
              } finally {
                setLoading(false);
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={modal !== null}
        icon={modal?.icon ?? "warning"}
        title={modal?.title ?? ""}
        message={modal?.message ?? ""}
        confirmLabel="Okay"
        onConfirm={() => {
          const onConfirm = modal?.onConfirm;
          setModal(null);
          onConfirm?.();
        }}
      />
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
    marginBottom: 40,
  },
  codeRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  codeBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: neutral[200],
    backgroundColor: background.card,
    fontSize: 26,
    fontWeight: "600",
    color: text.primary,
  },
  codeBoxFilled: {
    borderColor: primary[300],
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timer: {
    fontSize: 16,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
