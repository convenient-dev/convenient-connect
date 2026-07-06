import { ApiError } from "@/api/client";
import {
  DeleteAccountChannel,
  deleteUserAccount,
  sendDeleteAccountOtp,
} from "@/api/profile";
import { useAuth } from "@/auth/AuthContext";
import { BackButton } from "@/components/BackButton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background } = Colors;

const CODE_LENGTH = 4;
const RESEND_SECONDS = 57;

interface ModalState {
  icon: "success" | "error";
  title: string;
  message: string;
  /** When set, runs after the modal is dismissed (e.g. navigate on success). */
  onConfirm?: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VerifyDeleteAccountOtpScreen() {
  const router = useRouter();
  const { channel, destination } = useLocalSearchParams<{
    channel?: DeleteAccountChannel;
    destination?: string;
  }>();
  const auth = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

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
    if (!channel || seconds > 0 || resending) return;
    setResending(true);
    try {
      await sendDeleteAccountOtp(channel);
      clearOtp();
      setSeconds(RESEND_SECONDS);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to resend code";
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

  async function handleVerify() {
    if (!channel) return;
    setLoading(true);
    try {
      console.log("[DELETE] Starting account deletion...");
      await deleteUserAccount(digits.join(""), channel);
      console.log("[DELETE] Account deletion API call succeeded");
      setModal({
        icon: "success",
        title: "Account Deleted",
        message: "Your account has been deleted successfully.",
        onConfirm: async () => {
          console.log("[DELETE] Modal confirmed, starting logout...");
          try {
            await auth.logout();
            console.log("[DELETE] Logout completed successfully");

            // Verify token was actually cleared
            const { getToken } = await import("@/auth/token-store");
            const remainingToken = await getToken();
            console.log("[DELETE] Token verification after logout:", remainingToken ? "STILL EXISTS!" : "cleared");

            console.log("[DELETE] Navigating to home...");
            router.replace("/");
            console.log("[DELETE] Navigation completed");
          } catch (error) {
            console.error("[DELETE] Logout failed:", error);
            router.replace("/");
          }
        },
      });
    } catch (e) {
      console.error("[DELETE] Account deletion failed:", e);
      const msg = e instanceof ApiError ? e.message : "Verification failed";
      setModal({
        icon: "error",
        title: "Error",
        message: msg,
        onConfirm: clearOtp,
      });
    } finally {
      setLoading(false);
    }
  }

  const isComplete = digits.every((d) => d.length === 1);
  const channelLabel = channel === "phone" ? "phone number" : "email";

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

        <View style={styles.body}>
          <Text style={styles.title}>
            Enter the 4-digit code sent to your {channelLabel}
            {destination ? ` ${destination}` : ""}
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
              <TouchableOpacity
                style={styles.resendButton}
                activeOpacity={0.7}
                disabled={resending}
                onPress={handleResend}
              >
                <Text style={styles.resendText}>
                  {resending ? "Sending..." : "Resend code"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              (!isComplete || loading) && styles.deleteButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={!isComplete || loading}
            onPress={handleVerify}
          >
            {loading ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <Text style={styles.deleteText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={modal !== null}
        icon={modal?.icon ?? "alert"}
        title={modal?.title ?? ""}
        message={modal?.message ?? ""}
        confirmLabel="Okay"
        onConfirm={async () => {
          const onConfirm = modal?.onConfirm;
          setModal(null);
          if (onConfirm) {
            await onConfirm();
          }
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
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
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
  resendButton: {
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 16,
    fontWeight: "600",
    color: primary[400],
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deleteButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
