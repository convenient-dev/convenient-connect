import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { API_BASE_URL, useCurrentUser } from "@/constants/session";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background, border } = Colors;

const TOPIC_OPTIONS: { key: string; label: string }[] = [
  { key: "account", label: "Account & App Usages" },
  { key: "bookings", label: "Bookings" },
  { key: "payments", label: "Payments & Refunds" },
  { key: "membership", label: "Membership" },
  { key: "background-check", label: "Background Check" },
  { key: "other", label: "Other" },
];

const SUBJECT_MAX = 80;
const DESCRIPTION_MAX = 1000;

export default function SubmitTicketScreen() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [topicKey, setTopicKey] = useState<string>(TOPIC_OPTIONS[0].key);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();
  const canSubmit =
    trimmedSubject.length > 0 &&
    trimmedDescription.length > 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicKey,
          subject: trimmedSubject,
          description: trimmedDescription,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErrorMessage(data?.error ?? "Couldn't submit your ticket. Please try again.");
        return;
      }
      const data = (await res.json()) as { id: string };
      setSubmittedTicketId(data.id);
      setSubmitted(true);
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Submit a Ticket" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>Topic</Text>
            <View style={styles.topicWrap}>
              {TOPIC_OPTIONS.map((t) => {
                const active = t.key === topicKey;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.topicPill, active && styles.topicPillActive]}
                    activeOpacity={0.8}
                    onPress={() => setTopicKey(t.key)}
                  >
                    <Text
                      style={[
                        styles.topicPillText,
                        active && styles.topicPillTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Briefly describe the issue"
              placeholderTextColor={neutral[400]}
              value={subject}
              onChangeText={(v) => setSubject(v.slice(0, SUBJECT_MAX))}
              editable={!submitting}
              returnKeyType="next"
            />
            <Text style={styles.counter}>
              {subject.length}/{SUBJECT_MAX}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Tell us what happened, what you expected, and any steps to reproduce."
              placeholderTextColor={neutral[400]}
              value={description}
              onChangeText={(v) =>
                setDescription(v.slice(0, DESCRIPTION_MAX))
              }
              editable={!submitting}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.counter}>
              {description.length}/{DESCRIPTION_MAX}
            </Text>
          </View>

          <View style={styles.attachmentRow}>
            <TouchableOpacity
              style={styles.attachmentButton}
              activeOpacity={0.7}
              // TODO: wire up image/file picker for attachments.
              onPress={() => {}}
            >
              <MaterialIcons
                name="attach-file"
                size={18}
                color={text.primary}
              />
              <Text style={styles.attachmentText}>Add attachment</Text>
            </TouchableOpacity>
            <Text style={styles.attachmentHint}>Optional · up to 5 files</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !canSubmit && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={submitted}
        icon="success"
        title="Ticket submitted"
        message={
          submittedTicketId
            ? `Your ticket ${submittedTicketId} has been received. You can track its status in My Tickets.`
            : "We've received your request and will get back to you shortly. You can track its status in My Tickets."
        }
        confirmLabel="View My Tickets"
        cancelLabel="Back to Support"
        onConfirm={() => router.replace("/my-tickets")}
        onCancel={() => router.back()}
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 18,
  },

  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },

  topicWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topicPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
  },
  topicPillActive: {
    backgroundColor: primary[500],
    borderColor: primary[500],
  },
  topicPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  topicPillTextActive: {
    color: neutral[0],
    fontWeight: "600",
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  inputMultiline: {
    minHeight: 140,
    paddingTop: 12,
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  attachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
  },
  attachmentText: {
    fontSize: 13,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  attachmentHint: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    color: "#C0392B",
    textAlign: "center",
    letterSpacing: -0.408,
  },
  primaryButton: {
    height: 48,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },

});
