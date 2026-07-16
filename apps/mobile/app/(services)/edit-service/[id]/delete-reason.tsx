import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { legacyFetch } from "@/api/client";
import { useCurrentUser } from "@/constants/session";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
  const { userId } = useCurrentUser();
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
      await legacyFetch(`/users/${userId}/services/${id}`, {
        method: "DELETE",
        body: { reason },
      });
      router.replace("/(tabs)/services");
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Delete Service" />

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
          <Button
            title="Delete this service"
            variant="secondary"
            size="lg"
            disabled={!canDelete}
            loading={deleting}
            onPress={handleDelete}
          />

          <Button
            title="I don't want to delete"
            variant="dark"
            size="lg"
            onPress={() => router.push("/services")}
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
});
