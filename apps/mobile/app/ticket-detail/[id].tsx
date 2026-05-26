import ticketsData from "@/assets/data/tickets.json";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background, border } = Colors;

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface StatusEvent {
  status: TicketStatus;
  at: string;
  note?: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  topicLabel: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  description: string;
  history: StatusEvent[];
}

// TODO: Replace dummy data with real ticket fetched from backend by id.
const TICKETS_BY_ID: Record<string, TicketDetail> = Object.fromEntries(
  (ticketsData.tickets as TicketDetail[]).map((t) => [t.id, t])
);

interface StatusVariant {
  label: string;
  backgroundColor: string;
  color: string;
}

const STATUS_VARIANTS: Record<TicketStatus, StatusVariant> = {
  open: { label: "Open", backgroundColor: "#FCE9B6", color: "#B07A1A" },
  in_progress: {
    label: "In Progress",
    backgroundColor: "#C7EAE8",
    color: "#1F9897",
  },
  resolved: {
    label: "Resolved",
    backgroundColor: "#CDEBD6",
    color: "#1F7A3A",
  },
  closed: { label: "Closed", backgroundColor: "#DCDCDC", color: "#6E6E6E" },
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const v = STATUS_VARIANTS[status];
  return (
    <View style={[styles.badge, { backgroundColor: v.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: v.color }]}>{v.label}</Text>
    </View>
  );
}

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticket = id ? TICKETS_BY_ID[id] : undefined;

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Ticket" />
        <View style={styles.missingWrap}>
          <View style={styles.missingIcon}>
            <MaterialIcons
              name="error-outline"
              size={36}
              color={neutral[400]}
            />
          </View>
          <Text style={styles.missingTitle}>Ticket not found</Text>
          <Text style={styles.missingSub}>
            We couldn&apos;t find a ticket with id {id ?? "—"}.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.replace("/my-tickets")}
          >
            <Text style={styles.primaryButtonText}>Back to My Tickets</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canReply = ticket.status !== "closed";

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Ticket Details" subtitle={ticket.id} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.topicLabel}>{ticket.topicLabel}</Text>
            <StatusBadge status={ticket.status} />
          </View>
          <Text style={styles.subject}>{ticket.subject}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Opened {ticket.createdAt}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>Updated {ticket.updatedAt}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your message</Text>
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{ticket.description}</Text>
        </View>

        <Text style={styles.sectionTitle}>Status history</Text>
        <View style={styles.card}>
          {ticket.history.map((event, i) => {
            const v = STATUS_VARIANTS[event.status];
            const isLast = i === ticket.history.length - 1;
            return (
              <View key={`${event.status}-${event.at}-${i}`} style={styles.timelineRow}>
                <View style={styles.timelineGutter}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: v.color },
                    ]}
                  />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeaderRow}>
                    <StatusBadge status={event.status} />
                    <Text style={styles.timelineDate}>{event.at}</Text>
                  </View>
                  {event.note && (
                    <Text style={styles.timelineNote}>{event.note}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {canReply && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            // TODO: wire up reply / message thread screen.
            onPress={() => {}}
          >
            <MaterialIcons name="reply" size={18} color={neutral[0]} />
            <Text style={styles.primaryButtonText}>Reply to Support</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
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
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: primary[600],
    letterSpacing: -0.408,
  },
  subject: {
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 22,
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 6,
  },

  descriptionText: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 20,
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

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.408,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  primaryButton: {
    flexDirection: "row",
    height: 48,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
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
