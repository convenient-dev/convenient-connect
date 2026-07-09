import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useCurrentUser } from "@/constants/session";
import { getTickets } from "@/api/legacy";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background, border } = Colors;


type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  subject: string;
  topicLabel: string;
  status: TicketStatus;
  updatedAt: string;
  lastMessage: string;
  unread: boolean;
}

type FilterKey = "all" | TicketStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function MyTicketsScreen() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTickets(userId)
      .then((data: Ticket[]) => {
        setAllTickets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const tickets =
    filter === "all"
      ? allTickets
      : allTickets.filter((t) => t.status === filter);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="My Tickets"
        rightAccessory={
          <TouchableOpacity
            style={styles.headerActionButton}
            activeOpacity={0.7}
            hitSlop={8}
            onPress={() => router.push("/submit-ticket")}
          >
            <MaterialIcons name="add" size={22} color={text.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, active && styles.filterPillActive]}
              activeOpacity={0.8}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  active && styles.filterPillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <MaterialIcons
              name="support-agent"
              size={36}
              color={primary[500]}
            />
          </View>
          <Text style={styles.emptyTitle}>No tickets here</Text>
          <Text style={styles.emptySub}>
            When you submit a ticket, you&apos;ll see its status and replies
            here.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            activeOpacity={0.85}
            onPress={() => router.push("/submit-ticket")}
          >
            <Text style={styles.emptyButtonText}>Submit a Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tickets.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.ticketCard}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/ticket-detail/[id]",
                  params: { id: t.id },
                })
              }
            >
              <View style={styles.ticketHeaderRow}>
                <Text style={styles.ticketId}>{t.id}</Text>
                <StatusBadge label={TICKET_STATUS_LABEL[t.status]} />
              </View>

              <View style={styles.ticketSubjectRow}>
                <Text style={styles.ticketSubject} numberOfLines={2}>
                  {t.subject}
                </Text>
                {t.unread && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.ticketLastMessage} numberOfLines={2}>
                {t.lastMessage}
              </Text>

              <View style={styles.ticketMetaRow}>
                <Text style={styles.ticketTopic}>{t.topicLabel}</Text>
                <Text style={styles.ticketDate}>Updated {t.updatedAt}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },

  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    alignItems: "center",
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
  },
  filterPillActive: {
    backgroundColor: primary[500],
    borderColor: primary[500],
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  filterPillTextActive: {
    color: neutral[0],
    fontWeight: "600",
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },

  ticketCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
    gap: 8,
  },
  ticketHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketId: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[400],
    letterSpacing: 0.4,
  },
  ticketSubjectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  ticketSubject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: secondary[500],
  },
  ticketLastMessage: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
    lineHeight: 18,
  },
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  ticketTopic: {
    fontSize: 12,
    color: primary[600],
    letterSpacing: -0.408,
  },
  ticketDate: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  emptySub: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.408,
  },
  emptyButton: {
    marginTop: 18,
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
