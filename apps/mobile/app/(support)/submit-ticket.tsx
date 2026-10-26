import { ApiError } from "@/api/client";
import type { MultipartFile } from "@/api/multipart";
import {
  SUPPORT_ATTACHMENT_LIMIT,
  SUPPORT_ATTACHMENT_TYPES,
  attachmentProblem,
  createSupportTicket,
  isBookingTopic,
  listSupportTopics,
  newIdempotencyKey,
  type SupportTopic,
} from "@/api/support";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { pickDocuments } from "@/components/template-form/file-pickers";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const { primary, neutral, text, background, border, status } = Colors;

const SUBJECT_MAX = 80;
const DESCRIPTION_MAX = 1000;
const BOOKING_ID_MAX = 50;

export default function SubmitTicketScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [attachments, setAttachments] = useState<MultipartFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // One key per ticket attempt: a retry after a network failure returns the
  // ticket the first attempt may already have created.
  const idempotencyKey = useRef(newIdempotencyKey());

  useEffect(() => {
    let active = true;
    listSupportTopics()
      .then((list) => {
        if (!active) return;
        setTopics(list);
        setTopicId(list[0]?.id ?? null);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof ApiError ? error.message : "Couldn't load support topics.",
        );
      })
      .finally(() => {
        if (active) setLoadingTopics(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedTopic = topics.find((t) => t.id === topicId) ?? null;
  const showBookingId = isBookingTopic(selectedTopic);

  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();
  const canSubmit =
    topicId !== null &&
    trimmedSubject.length > 0 &&
    trimmedDescription.length > 0 &&
    !submitting;

  async function handleAddAttachment() {
    const remaining = SUPPORT_ATTACHMENT_LIMIT - attachments.length;
    if (remaining <= 0) return;
    const picked = await pickDocuments(SUPPORT_ATTACHMENT_TYPES, remaining > 1);
    if (!picked.length) return;
    const problem = attachmentProblem(picked, attachments.length);
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    setErrorMessage(null);
    setAttachments((prev) => [...prev, ...picked].slice(0, SUPPORT_ATTACHMENT_LIMIT));
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit || topicId === null) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const ticket = await createSupportTicket({
        topicId,
        subject: trimmedSubject,
        description: trimmedDescription,
        bookingId: showBookingId ? bookingId.trim() || null : null,
        idempotencyKey: idempotencyKey.current,
        attachments,
      });
      setSubmittedTicketNumber(ticket.ticket_number ?? null);
      idempotencyKey.current = newIdempotencyKey();
    } catch (error) {
      // Keep the form as typed; the API message names the problem (too many
      // open tickets, a rejected file, a validation error).
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Network error. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Submit a Ticket" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>Topic</Text>
            {loadingTopics ? (
              <ActivityIndicator size="small" color={primary[400]} style={styles.topicsLoader} />
            ) : topics.length === 0 ? (
              <Text style={styles.hint}>Support topics are unavailable right now.</Text>
            ) : (
              <View style={styles.topicWrap}>
                {topics.map((t) => {
                  const active = t.id === topicId;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.topicPill, active && styles.topicPillActive]}
                      activeOpacity={0.8}
                      disabled={submitting}
                      onPress={() => t.id !== undefined && setTopicId(t.id)}
                    >
                      <Text
                        style={[
                          styles.topicPillText,
                          active && styles.topicPillTextActive,
                        ]}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {showBookingId && (
            <View style={styles.field}>
              <Text style={styles.label}>Booking ID (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. BK-20261022-001"
                placeholderTextColor={neutral[400]}
                value={bookingId}
                onChangeText={(v) => setBookingId(v.slice(0, BOOKING_ID_MAX))}
                editable={!submitting}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          )}

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
              style={[
                styles.attachmentButton,
                attachments.length >= SUPPORT_ATTACHMENT_LIMIT && styles.attachmentButtonDisabled,
              ]}
              activeOpacity={0.7}
              disabled={submitting || attachments.length >= SUPPORT_ATTACHMENT_LIMIT}
              onPress={handleAddAttachment}
            >
              <MaterialIcons
                name="attach-file"
                size={18}
                color={text.primary}
              />
              <Text style={styles.attachmentText}>Add attachment</Text>
            </TouchableOpacity>
            <Text style={styles.attachmentHint}>
              {attachments.length
                ? `${attachments.length}/${SUPPORT_ATTACHMENT_LIMIT} files`
                : `Optional · up to ${SUPPORT_ATTACHMENT_LIMIT} files`}
            </Text>
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachmentList}>
              {attachments.map((file, index) => (
                <View key={`${file.uri}-${index}`} style={styles.attachmentChip}>
                  <MaterialIcons
                    name={file.type === "application/pdf" ? "picture-as-pdf" : "image"}
                    size={16}
                    color={neutral[500]}
                  />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <TouchableOpacity
                    hitSlop={8}
                    disabled={submitting}
                    onPress={() => removeAttachment(index)}
                  >
                    <MaterialIcons name="close" size={16} color={neutral[500]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.hint}>JPG, PNG or PDF, 10 MB each.</Text>
        </ScrollView>

        <View style={[styles.footer, contentWidthStyle]}>
          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          <Button
            title="Submit Ticket"
            variant="secondary"
            size="md"
            loading={submitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={submittedTicketNumber !== null}
        icon="success"
        title="Ticket submitted"
        message={
          submittedTicketNumber
            ? `Your ticket ${submittedTicketNumber} has been received. You can track its status in My Tickets.`
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
  hint: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  topicsLoader: {
    alignSelf: "flex-start",
    paddingVertical: 8,
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
  attachmentButtonDisabled: {
    opacity: 0.5,
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
  attachmentList: {
    gap: 8,
    marginTop: -8,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    color: text.primary,
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
    color: status.error,
    textAlign: "center",
    letterSpacing: -0.408,
  },
});
