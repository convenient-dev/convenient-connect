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
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, status } = Colors;

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
      label: "Phone Number",
      destination: maskPhone(phone),
    });
  }
  if (email) {
    options.push({
      channel: "email",
      label: "Email",
      destination: maskEmail(email),
    });
  }

  async function handleSendOtp() {
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
      <ScreenHeader title="Verify Account" />

      <View style={styles.body}>
        <Text style={styles.subtitle}>
          Choose how you want to receive the OTP
        </Text>

        <Image
          source={require("@/assets/global-icons/phone.png")}
          style={styles.illustration}
          resizeMode="contain"
        />

        <View style={styles.optionList}>
          {options.map((option, index) => {
            const isSelected = selected === option.channel;
            return (
              <TouchableOpacity
                key={option.channel}
                style={[styles.option, index > 0 && styles.optionDivider]}
                activeOpacity={0.7}
                onPress={() => setSelected(option.channel)}
              >
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <View style={styles.destinationRow}>
                    <Text style={styles.optionDestination}>
                      {option.destination}
                    </Text>
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={status.active}
                    />
                  </View>
                </View>
                <MaterialIcons
                  name={
                    isSelected
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={24}
                  color={isSelected ? secondary[500] : neutral[600]}
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
            styles.sendButton,
            (!selected || sending) && styles.sendButtonDisabled,
          ]}
          activeOpacity={0.85}
          disabled={!selected || sending}
          onPress={handleSendOtp}
        >
          {sending ? (
            <ActivityIndicator color={neutral[0]} />
          ) : (
            <Text style={styles.sendText}>Send OTP</Text>
          )}
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
  subtitle: {
    fontSize: 17,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.408,
    marginTop: 16,
  },
  illustration: {
    alignSelf: "center",
    width: 240,
    height: 160,
    marginTop: 36,
    marginBottom: 24,
  },
  optionList: {
    marginHorizontal: -20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  optionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[200],
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionDestination: {
    fontSize: 16,
    color: neutral[400],
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
  },
  sendButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
