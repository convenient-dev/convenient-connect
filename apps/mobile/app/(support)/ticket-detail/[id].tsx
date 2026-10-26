import { ApiError } from "@/api/client";
import type { MultipartFile } from "@/api/multipart";
import {
  SUPPORT_ATTACHMENT_LIMIT,
  SUPPORT_ATTACHMENT_TYPES,
  attachmentProblem,
  closeSupportTicket,
  getSupportTicket,
  markSupportTicketRead,
  replyToSupportTicket,
  type SupportTicketAttachment,
  type SupportTicketDetail,
  type SupportTicketMessage,
  type SupportTicketStatus,
} from "@/api/support";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { pickDocuments } from "@/components/template-form/file-pickers";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import {
  formatSupportDate,
  formatSupportDateTime,
  formatSupportShortDateTime,
  formatSupportTime,
  isSameSupportDay,
  ticketStatusLabel,
} from "@/constants/support";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, border } = Colors;

const REPLY_MAX = 1000;

const TICKET_STATUS_DOT_COLOR: Record<SupportTicketStatus, string> = {
  open: "#B07A1A",
  in_progress: "#1F9897",
  resolved: "#1F7A3A",
  closed: "#6E6E6E",
};

/** One status change on a ticket, oldest first. */
interface TicketStatusEvent {
  key: string;
  status: SupportTicketStatus;
  at: string | undefined;
  note?: string | null;
}

type AttachmentTone = "default" | "onPrimary";

function AttachmentLinks({
  files,
  tone = "default",
}: {
  files: SupportTicketAttachment[] | undefined;
  tone?: AttachmentTone;
}) {
  if (!files?.length) return null;
  const onPrimary = tone === "onPrimary";
  const iconColor = onPrimary ? neutral[0] : primary[600];
  return (
    <View style={styles.attachmentList}>
      {files.map((file, index) => (
        <TouchableOpacity
          key={file.id ?? `${file.url}-${index}`}
          style={[styles.attachmentChip, onPrimary && styles.attachmentChipOnPrimary]}
          activeOpacity={0.7}
          onPress={() => file.url && Linking.openURL(file.url).catch(() => {})}
        >
          <MaterialIcons
            name={file.mime_type === "application/pdf" ? "picture-as-pdf" : "image"}
            size={16}
            color={iconColor}
          />
          <Text
            style={[styles.attachmentName, onPrimary && styles.attachmentNameOnPrimary]}
            numberOfLines={1}
          >
            {file.file_name ?? "Attachment"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Status changes oldest first. Falls back to the ticket's own timestamps when
 * the API returns no history, so the line never reads empty.
 */
function buildStatusEvents(ticket: SupportTicketDetail): TicketStatusEvent[] {
  const history = ticket.status_history ?? [];
  if (history.length > 0) {
    return history.map((event, i) => ({
      key: String(event.id ?? `${event.to_status}-${event.created_at}-${i}`),
      status: (event.to_status ?? "open") as SupportTicketStatus,
      at: event.created_at,
      note: event.note,
    }));
  }
  const events: TicketStatusEvent[] = [
    { key: "opened", status: "open", at: ticket.opened_at },
  ];
  if (ticket.resolved_at) {
    events.push({ key: "resolved", status: "resolved", at: ticket.resolved_at });
  }
  if (ticket.closed_at) {
    events.push({ key: "closed", status: "closed", at: ticket.closed_at });
  }
  return events;
}

/**
 * "Open 5:45 PM → Closed 6:37 PM". Times alone are used while consecutive
 * events share a day; the date is added whenever the day changes.
 */
function formatStatusLine(events: TicketStatusEvent[]): string {
  return events
    .map((event, i) => {
      const previous = i === 0 ? new Date() : events[i - 1].at;
      const when = isSameSupportDay(event.at, previous)
        ? formatSupportTime(event.at)
        : formatSupportShortDateTime(event.at);
      return `${ticketStatusLabel(event.status)} ${when}`.trim();
    })
    .join(" → ");
}

function sortByCreatedAt(messages: SupportTicketMessage[]): SupportTicketMessage[] {
  return [...messages].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
}

function StatusTimeline({ events }: { events: TicketStatusEvent[] }) {
  return (
    <View>
      {events.map((event, i) => {
        const dotColor = TICKET_STATUS_DOT_COLOR[event.status] ?? neutral[400];
        const isLast = i === events.length - 1;
        return (
          <View key={event.key} style={styles.timelineRow}>
            <View style={styles.timelineGutter}>
              <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
              {!isLast && <View style={styles.timelineLine} />}
            </View>
            <View
              style={[styles.timelineContent, isLast && styles.timelineContentLast]}
            >
              <View style={styles.timelineHeaderRow}>
                <StatusBadge label={ticketStatusLabel(event.status)} />
                <Text style={styles.timelineDate}>
                  {formatSupportDateTime(event.at)}
                </Text>
              </View>
              {event.note ? (
                <Text style={styles.timelineNote}>{event.note}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MessageBubble({
  mine,
  body,
  time,
  attachments,
}: {
  mine: boolean;
  body: string | undefined;
  time: string | undefined;
  attachments?: SupportTicketAttachment[];
}) {
  return (
    <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{body}</Text>
        <AttachmentLinks files={attachments} tone={mine ? "onPrimary" : "default"} />
      </View>
      <Text style={[styles.bubbleMeta, mine && styles.bubbleMetaMine]}>
        {mine ? "You" : "Support"}
        {time ? ` · ${formatSupportDateTime(time)}` : ""}
      </Text>
    </View>
  );
}

/**
 * One support ticket keyed by its ticket number (`P-10001`). Opening it clears
 * the unread flag. The summary card (topic, title, status, one-line status
 * history) stays fixed at the top; tapping it expands the dates, attachments
 * and full status timeline in place. Only the conversation scrolls, newest at
 * the bottom next to the reply box. Public messages are shown as You / Support;
 * internal notes are never rendered. Replies and closing are available until
 * the ticket is closed; a reply on a resolved ticket reopens it.
 */
export default function TicketDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const conversationRef = useRef<ScrollView>(null);

  const [reply, setReply] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<MultipartFile[]>([]);
  const [sending, setSending] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const detail = await getSupportTicket(id);
      setTicket(detail);
      if (detail.provider_unread) {
        // Best effort: the list refetches on focus, so a failed mark-read
        // only leaves the dot one visit longer.
        markSupportTicketRead(id).catch(() => {});
      }
    } catch (error) {
      setTicket(null);
      if (error instanceof ApiError && error.statusCode === 404) setNotFound(true);
      else {
        setLoadError(
          error instanceof ApiError ? error.message : "Couldn't load this ticket.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const messages = useMemo(
    () => sortByCreatedAt((ticket?.messages ?? []).filter((m) => !m.is_internal_note)),
    [ticket],
  );
  const statusEvents = useMemo(
    () => (ticket ? buildStatusEvents(ticket) : []),
    [ticket],
  );

  async function handleAddAttachment() {
    const remaining = SUPPORT_ATTACHMENT_LIMIT - replyAttachments.length;
    if (remaining <= 0) return;
    const picked = await pickDocuments(SUPPORT_ATTACHMENT_TYPES, remaining > 1);
    if (!picked.length) return;
    const problem = attachmentProblem(picked, replyAttachments.length);
    if (problem) {
      setDialog({ title: "Attachment not allowed", message: problem });
      return;
    }
    setReplyAttachments((prev) =>
      [...prev, ...picked].slice(0, SUPPORT_ATTACHMENT_LIMIT),
    );
  }

  async function handleSend() {
    const body = reply.trim();
    if (!id || !body || sending) return;
    setSending(true);
    try {
      await replyToSupportTicket(id, { body, attachments: replyAttachments });
      setReply("");
      setReplyAttachments([]);
      // Re-read so the new message, its attachments and any status change
      // (resolved -> in_progress) come from the server.
      setTicket(await getSupportTicket(id));
    } catch (error) {
      setDialog({
        title: "Couldn't send reply",
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    setConfirmClose(false);
    if (!id || closing) return;
    setClosing(true);
    try {
      setTicket(await closeSupportTicket(id));
    } catch (error) {
      setDialog({
        title: "Couldn't close ticket",
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Ticket" />
        <View style={styles.missingWrap}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.container, screenPaddingStyle]}>
        <ScreenHeader title="Ticket" />
        <View style={styles.missingWrap}>
          <View style={styles.missingIcon}>
            <MaterialIcons
              name="error-outline"
              size={36}
              color={neutral[400]}
            />
          </View>
          <Text style={styles.missingTitle}>
            {notFound ? "Ticket not found" : "Couldn't load ticket"}
          </Text>
          <Text style={styles.missingSub}>
            {notFound
              ? `We couldn't find a ticket with number ${id ?? "—"}.`
              : loadError}
          </Text>
          {!notFound && (
            <Button title="Try again" variant="primary" size="md" onPress={load} />
          )}
          <Button
            title="Back to My Tickets"
            variant="secondary"
            size="md"
            onPress={() => router.replace("/my-tickets")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const ticketStatus = ticket.status ?? "open";
  const canReply = ticketStatus !== "closed";

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Ticket Details" subtitle={ticket.ticket_number} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Fixed summary: tap anywhere on the card to expand details and the timeline. */}
        <View style={[styles.summaryWrap, contentWidthStyle]}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => setDetailsOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
            accessibilityLabel="Ticket summary, tap to show details and status history"
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.topicLabel} numberOfLines={1}>
                {ticket.topic}
              </Text>
              <StatusBadge label={ticketStatusLabel(ticketStatus)} />
            </View>

            <View style={styles.subjectRow}>
              <Text style={styles.subject} numberOfLines={detailsOpen ? undefined : 2}>
                {ticket.subject}
              </Text>
              <MaterialIcons
                name={detailsOpen ? "expand-less" : "expand-more"}
                size={22}
                color={neutral[400]}
              />
            </View>

            {detailsOpen ? (
              <ScrollView
                style={{ maxHeight: windowHeight * 0.4 }}
                contentContainerStyle={styles.detailsWrap}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {ticket.booking_id ? (
                  <Text style={styles.metaText}>Booking {ticket.booking_id}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    Opened {formatSupportDate(ticket.opened_at)}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>
                    Updated {formatSupportDate(ticket.updated_at)}
                  </Text>
                </View>
                {ticket.attachments?.length ? (
                  <AttachmentLinks files={ticket.attachments} />
                ) : (
                  <Text style={styles.metaText}>No attachments</Text>
                )}

                <View style={styles.cardDivider} />
                <Text style={styles.detailsSectionTitle}>Status history</Text>
                <StatusTimeline events={statusEvents} />
              </ScrollView>
            ) : (
              <View style={styles.statusLineRow}>
                <MaterialIcons name="history" size={16} color={neutral[400]} />
                <Text style={styles.statusLineText} numberOfLines={1}>
                  {formatStatusLine(statusEvents)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Only the conversation scrolls; newest message sits at the bottom. */}
        <ScrollView
          ref={conversationRef}
          style={styles.scroll}
          contentContainerStyle={[styles.conversation, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            conversationRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.length === 0 ? (
            <MessageBubble
              mine
              body={ticket.description}
              time={ticket.opened_at}
              attachments={ticket.attachments}
            />
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={m.id ?? `${m.sender_type}-${m.created_at}-${i}`}
                mine={m.sender_type === "provider"}
                body={m.body}
                time={m.created_at}
                attachments={m.attachments}
              />
            ))
          )}
        </ScrollView>

        {canReply ? (
          <View style={[styles.footer, contentWidthStyle]}>
            {ticketStatus === "resolved" && (
              <Text style={styles.footerHint}>
                This ticket is resolved. Replying will reopen it.
              </Text>
            )}
            {replyAttachments.length > 0 && (
              <View style={styles.attachmentList}>
                {replyAttachments.map((file, index) => (
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
                      disabled={sending}
                      onPress={() =>
                        setReplyAttachments((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <MaterialIcons name="close" size={16} color={neutral[500]} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.composerRow}>
              <TouchableOpacity
                style={styles.composerIconButton}
                hitSlop={8}
                disabled={sending || replyAttachments.length >= SUPPORT_ATTACHMENT_LIMIT}
                onPress={handleAddAttachment}
              >
                <MaterialIcons
                  name="attach-file"
                  size={22}
                  color={
                    replyAttachments.length >= SUPPORT_ATTACHMENT_LIMIT
                      ? neutral[300]
                      : neutral[500]
                  }
                />
              </TouchableOpacity>
              <TextInput
                style={styles.composerInput}
                placeholder="Write a reply to support"
                placeholderTextColor={neutral[400]}
                value={reply}
                onChangeText={(v) => setReply(v.slice(0, REPLY_MAX))}
                editable={!sending}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!reply.trim() || sending) && styles.sendButtonDisabled,
                ]}
                disabled={!reply.trim() || sending}
                onPress={handleSend}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={neutral[0]} />
                ) : (
                  <MaterialIcons name="send" size={18} color={neutral[0]} />
                )}
              </TouchableOpacity>
            </View>
            <Button
              title="Close ticket"
              variant="ghost"
              size="sm"
              loading={closing}
              disabled={sending}
              onPress={() => setConfirmClose(true)}
            />
          </View>
        ) : (
          <View style={[styles.footer, contentWidthStyle]}>
            <Text style={styles.footerHint}>
              This ticket is closed. Open a new ticket if you need further help.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmClose}
        title="Close this ticket?"
        message="Once closed, neither you nor support can reply. You can open a new ticket at any time."
        confirmLabel="Close ticket"
        onCancel={() => setConfirmClose(false)}
        onConfirm={handleClose}
      />

      <ConfirmModal
        visible={dialog !== null}
        type="error"
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        confirmLabel="OK"
        onConfirm={() => setDialog(null)}
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

  summaryWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  topicLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: primary[600],
    letterSpacing: -0.408,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  subject: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 22,
  },
  detailsWrap: {
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  metaDot: {
    fontSize: 12,
    color: neutral[300],
  },
  statusLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[100],
  },
  statusLineText: {
    flex: 1,
    fontSize: 12,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
    marginTop: 2,
  },
  detailsSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },

  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineGutter: {
    width: 12,
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -2,
    backgroundColor: neutral[100],
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
    gap: 6,
  },
  timelineContentLast: {
    paddingBottom: 0,
  },
  timelineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineDate: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  timelineNote: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
    lineHeight: 18,
  },

  conversation: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  bubbleWrap: {
    maxWidth: "82%",
    gap: 4,
  },
  bubbleWrapMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubbleWrapTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
  },
  bubbleMine: {
    backgroundColor: primary[500],
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: background.card,
    borderWidth: 1,
    borderColor: border.default,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: neutral[0],
  },
  bubbleMeta: {
    fontSize: 11,
    color: neutral[400],
    letterSpacing: -0.408,
    paddingHorizontal: 4,
  },
  bubbleMetaMine: {
    textAlign: "right",
  },

  attachmentList: {
    gap: 6,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
  },
  attachmentChipOnPrimary: {
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    color: text.primary,
    letterSpacing: -0.408,
  },
  attachmentNameOnPrimary: {
    color: neutral[0],
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: neutral[100],
  },
  footerHint: {
    fontSize: 12,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.408,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  composerIconButton: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: neutral[300],
  },

  missingWrap: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  missingIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  missingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  missingSub: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.408,
    marginBottom: 18,
  },
});
