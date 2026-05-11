import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background, border } = Colors;

interface Topic {
  key: string;
  label: string;
  questions: string[];
}

const TOPICS: Topic[] = [
  {
    key: "account",
    label: "Account & App Usages",
    questions: [
      "How do I reset my password?",
      "How can I update my email or phone number?",
      "Why am I being asked to verify my identity?",
      "How do I delete my account?",
      "Why is the app not loading on my device?",
    ],
  },
  {
    key: "bookings",
    label: "Bookings",
    questions: [
      "How do I book a service?",
      "Can I reschedule or cancel a booking?",
      "What happens if a provider is late or no-shows?",
      "How do I leave a review after a booking?",
      "Where do I find my upcoming bookings?",
    ],
  },
  {
    key: "payments",
    label: "Payments & Refunds",
    questions: [
      "What payment methods are accepted?",
      "When am I charged for a booking?",
      "How do I request a refund?",
      "Why was my card declined?",
      "How long do refunds take to process?",
    ],
  },
  {
    key: "membership",
    label: "Membership",
    questions: [
      "What's included in each membership tier?",
      "How do I upgrade or downgrade my plan?",
      "Can I cancel my membership at any time?",
      "Do unused benefits roll over?",
      "How are membership perks applied at checkout?",
    ],
  },
  {
    key: "background-check",
    label: "Background Check",
    questions: [
      "Why do I need a background check?",
      "How long does the background check take?",
      "What information is reviewed?",
      "Is the background-check fee refundable?",
      "What happens if my check is flagged?",
    ],
  },
];

export default function CustomerSupportScreen() {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState<string>(TOPICS[0].key);
  const tabsRef = useRef<ScrollView>(null);

  const activeTopic = TOPICS.find((t) => t.key === activeKey) ?? TOPICS[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Customer Support"
        rightAccessory={
          <TouchableOpacity
            style={styles.headerSearchButton}
            activeOpacity={0.7}
            hitSlop={8}
            onPress={() =>
              router.push({
                pathname: "/customer-support",
                params: { action: "search" },
              })
            }
          >
            <MaterialIcons name="search" size={22} color={text.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.selfServiceRow}>
          <TouchableOpacity
            style={styles.selfServiceCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/customer-support",
                params: { view: "tickets" },
              })
            }
          >
            <View style={styles.selfServiceIconTile}>
              <MaterialIcons
                name="support-agent"
                size={22}
                color={primary[500]}
              />
            </View>
            <Text style={styles.selfServiceLabel}>My Tickets</Text>
            <Text style={styles.selfServiceSub}>View status & replies</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selfServiceCard}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/customer-support",
                params: { action: "new-ticket" },
              })
            }
          >
            <View
              style={[
                styles.selfServiceIconTile,
                styles.selfServiceIconTileAccent,
              ]}
            >
              <MaterialIcons
                name="add-comment"
                size={22}
                color={secondary[500]}
              />
            </View>
            <Text style={styles.selfServiceLabel}>Submit a Ticket</Text>
            <Text style={styles.selfServiceSub}>
              We&apos;ll get back to you
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Frequent Questions</Text>

        <ScrollView
          ref={tabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TOPICS.map((t) => {
            const active = t.key === activeKey;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                activeOpacity={0.8}
                onPress={() => setActiveKey(t.key)}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    active && styles.tabPillTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.questionsList}>
          {activeTopic.questions.map((q, i) => (
            <React.Fragment key={q}>
              <TouchableOpacity
                style={styles.questionRow}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/customer-support",
                    params: { topic: activeTopic.key, question: q },
                  })
                }
              >
                <Text style={styles.questionText} numberOfLines={2}>
                  {q}
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={neutral[300]}
                />
              </TouchableOpacity>
              {i < activeTopic.questions.length - 1 && (
                <View style={styles.divider} />
              )}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
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
    paddingBottom: 32,
  },

  headerSearchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 18,
    marginBottom: 10,
  },

  selfServiceRow: {
    flexDirection: "row",
    gap: 12,
  },
  selfServiceCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
    gap: 8,
  },
  selfServiceIconTile: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  selfServiceIconTileAccent: {
    backgroundColor: secondary[50],
  },
  selfServiceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  selfServiceSub: {
    fontSize: 12,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  tabsContent: {
    gap: 8,
    paddingRight: 4,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
  },
  tabPillActive: {
    backgroundColor: primary[500],
    borderColor: primary[500],
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  tabPillTextActive: {
    color: neutral[0],
    fontWeight: "600",
  },

  questionsList: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
    paddingHorizontal: 14,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
  },
});
