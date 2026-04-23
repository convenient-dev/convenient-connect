import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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

const { neutral, secondary, brand, background, border } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const REASONS = [
  "I'm no longer offering this service.",
  "I created this by mistake.",
  "Low demand / not getting bookings.",
  "Other",
] as const;

type Reason = (typeof REASONS)[number];

export default function DeleteServiceReasonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selected, setSelected] = useState<Reason | null>(null);
  const [otherText, setOtherText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete =
    selected !== null && (selected !== "Other" || otherText.trim().length > 0);

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    setError(null);
    try {
      const reason = selected === "Other" ? otherText.trim() : selected;
      const res = await fetch(`${API_BASE_URL}/users/1/services/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to delete. Please try again.");
        return;
      }
      router.replace("/(tabs)/services");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Delete Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.sectionHeading}>Tell us more</Text>

          <View style={styles.options}>
            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.optionRow,
                  selected === reason && styles.optionRowSelected,
                ]}
                onPress={() => setSelected(reason)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected === reason && styles.optionTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selected === "Other" && (
            <TextInput
              style={styles.otherInput}
              placeholder="Tell us what's going on..."
              placeholderTextColor={neutral[300]}
              value={otherText}
              onChangeText={setOtherText}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.deleteBtn, !canDelete && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={!canDelete || deleting}
            activeOpacity={0.85}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={neutral[0]} />
            ) : (
              <Text style={styles.deleteBtnText}>Delete this service</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.push("/services")}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelBtnText}>I don't want to delete</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: neutral[800],
  },
  headerSpacer: { width: 38 },

  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: brand.secondary,
    textAlign: "center",
  },
  options: {
    gap: 12,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  optionRowSelected: {
    borderColor: brand.secondary,
    backgroundColor: secondary[50],
  },
  optionText: {
    fontSize: 15,
    color: neutral[700],
  },
  optionTextSelected: {
    color: secondary[500],
    fontWeight: "500",
  },
  otherInput: {
    borderWidth: 1,
    borderColor: brand.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: neutral[800],
    minHeight: 100,
  },

  errorText: {
    fontSize: 13,
    color: secondary[500],
    textAlign: "center",
    paddingHorizontal: 24,
    paddingBottom: 6,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 12,
  },
  deleteBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: brand.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
  },
  cancelBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: neutral[1000],
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
  },
});
