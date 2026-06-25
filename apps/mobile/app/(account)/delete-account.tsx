import { ApiError } from "@/api/client";
import {
  DeleteAccountChannel,
  sendDeleteAccountOtp,
} from "@/api/profile";
import { useAuth } from "@/auth/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background } = Colors;

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const last = digits.slice(-2);
  return `${"*".repeat(Math.max(0, digits.length - 2))}${last}`;
}

function maskEmail(email: string): string {
  return email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) =>
    a + "*".repeat(b.length) + c,
  );
}

interface ChannelOption {
  channel: DeleteAccountChannel;
  label: string;
  icon: "phone-iphone" | "mail-outline";
  destination: string;
}

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();

  const phone = authUser?.user.user_contact ?? "";
  const email = authUser?.user.user_email ?? "";

  const [selected, setSelected] = useState<DeleteAccountChannel | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: ChannelOption[] = [];
  if (phone) {
    options.push({
      channel: "phone",
      label: "Phone",
      icon: "phone-iphone",
      destination: maskPhone(phone),
    });
  }
  if (email) {
    options.push({
      channel: "email",
      label: "Email",
      icon: "mail-outline",
      destination: maskEmail(email),
    });
  }

  async function handleContinue() {
    if (!selected || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendDeleteAccountOtp(selected);
      router.push({
        pathname: "/verify-delete-account-otp",
        params: {
          channel: selected,
          destination: selected === "phone" ? maskPhone(phone) : maskEmail(email),
        },
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Failed to send code. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Delete Account" />

      <View style={styles.body}>
        <View style={styles.warningIcon}>
          <MaterialIcons name="warning-amber" size={40} color={secondary[500]} />
        </View>

        <Text style={styles.title}>Delete your account?</Text>
        <Text style={styles.subtitle}>
          This will permanently delete your account and all associated data.
          To continue, verify it&apos;s you by receiving a one-time code.
        </Text>

        <Text style={styles.sectionLabel}>Send code via</Text>
        <View style={styles.optionList}>
          {options.map((option) => {
            const isSelected = selected === option.channel;
            return (
              <TouchableOpacity
                key={option.channel}
                style={[styles.option, isSelected && styles.optionSelected]}
                activeOpacity={0.8}
                onPress={() => setSelected(option.channel)}
              >
                <View style={styles.optionIcon}>
                  <MaterialIcons
                    name={option.icon}
                    size={22}
                    color={isSelected ? primary[500] : neutral[500]}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDestination}>
                    {option.destination}
                  </Text>
                </View>
                <MaterialIcons
                  name={
                    isSelected
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={22}
                  color={isSelected ? primary[500] : neutral[300]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selected || sending) && styles.continueButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!selected || sending}
          onPress={handleContinue}
        >
          {sending ? (
            <ActivityIndicator color={neutral[0]} />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          activeOpacity={0.7}
          disabled={sending}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  warningIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: secondary[50],
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  subtitle: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.408,
    marginTop: 10,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    marginBottom: 10,
  },
  optionList: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: neutral[100],
    backgroundColor: neutral[50],
  },
  optionSelected: {
    borderColor: primary[400],
    backgroundColor: primary[50],
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: background.card,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  optionDestination: {
    fontSize: 13,
    color: neutral[400],
    marginTop: 2,
    letterSpacing: -0.408,
  },
  errorText: {
    fontSize: 13,
    color: secondary[500],
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  continueButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
});
