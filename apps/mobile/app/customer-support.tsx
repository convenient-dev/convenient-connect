import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, secondary, neutral, text, background, border } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

interface FaqItem {
  question: string;
  answer: string;
}

interface Topic {
  key: string;
  label: string;
  questions: FaqItem[];
}

export default function CustomerSupportScreen() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState("");
  const tabsRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/frequent-questions`)
      .then((r) => r.json())
      .then((data: { topics: Topic[] }) => {
        setTopics(data.topics);
        setActiveKey(data.topics[0]?.key ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeTopic =
    topics.find((t) => t.key === activeKey) ?? topics[0] ?? null;

  function handleSelectTopic(key: string) {
    setActiveKey(key);
    setExpandedQuestion(null);
  }

  function toggleQuestion(question: string) {
    setExpandedQuestion((prev) => (prev === question ? null : question));
  }

  function openSearch() {
    setSearchActive(true);
    setExpandedQuestion(null);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch() {
    setSearchActive(false);
    setQuery("");
    setExpandedQuestion(null);
  }

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    const matches: { topicLabel: string; faq: FaqItem }[] = [];
    for (const topic of topics) {
      for (const faq of topic.questions) {
        if (
          faq.question.toLowerCase().includes(trimmedQuery) ||
          faq.answer.toLowerCase().includes(trimmedQuery)
        ) {
          matches.push({ topicLabel: topic.label, faq });
        }
      }
    }
    return matches;
  }, [topics, trimmedQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Customer Support"
        rightAccessory={
          <TouchableOpacity
            style={styles.headerSearchButton}
            activeOpacity={0.7}
            hitSlop={8}
            onPress={openSearch}
          >
            <MaterialIcons name="search" size={22} color={text.primary} />
          </TouchableOpacity>
        }
      />

      {searchActive && (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color={neutral[400]} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search help articles"
              placeholderTextColor={neutral[400]}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="cancel"
                  size={18}
                  color={neutral[400]}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={closeSearch}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.searchCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {searchActive && trimmedQuery ? (
          <View style={styles.questionsList}>
            {searchResults.length === 0 ? (
              <Text style={styles.emptyText}>
                No results for &ldquo;{query.trim()}&rdquo;
              </Text>
            ) : (
              searchResults.map((m, i) => (
                <React.Fragment key={`${m.topicLabel}:${m.faq.question}`}>
                  <TouchableOpacity
                    style={styles.questionRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/faq-detail",
                        params: {
                          question: m.faq.question,
                          answer: m.faq.answer,
                          topic: m.topicLabel,
                        },
                      })
                    }
                  >
                    <Text style={styles.questionText} numberOfLines={2}>
                      {m.faq.question}
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={22}
                      color={neutral[400]}
                    />
                  </TouchableOpacity>
                  {i < searchResults.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        ) : (
          <>
        <View style={styles.selfServiceRow}>
          <TouchableOpacity
            style={styles.selfServiceCard}
            activeOpacity={0.85}
            onPress={() => router.push("/my-tickets")}
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
            onPress={() => router.push("/submit-ticket")}
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

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={primary[400]} />
          </View>
        ) : activeTopic ? (
          <>
            <ScrollView
              ref={tabsRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              {topics.map((t) => {
                const active = t.key === activeKey;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tabPill, active && styles.tabPillActive]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectTopic(t.key)}
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
              {activeTopic.questions.map((q, i) => {
                const expanded = expandedQuestion === q.question;
                return (
                  <React.Fragment key={q.question}>
                    <View>
                      <TouchableOpacity
                        style={styles.questionRow}
                        activeOpacity={0.7}
                        onPress={() => toggleQuestion(q.question)}
                      >
                        <Text
                          style={styles.questionText}
                          numberOfLines={expanded ? undefined : 2}
                        >
                          {q.question}
                        </Text>
                        <MaterialIcons
                          name={expanded ? "expand-less" : "expand-more"}
                          size={22}
                          color={neutral[400]}
                        />
                      </TouchableOpacity>
                      {expanded && (
                        <Text style={styles.answerText}>{q.answer}</Text>
                      )}
                    </View>
                    {i < activeTopic.questions.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        ) : null}
          </>
        )}
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

  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    padding: 0,
  },
  searchCancel: {
    fontSize: 14,
    fontWeight: "500",
    color: primary[500],
    letterSpacing: -0.408,
  },
  emptyText: {
    paddingVertical: 18,
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.408,
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

  loader: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
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
  answerText: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
    lineHeight: 19,
    paddingBottom: 14,
    paddingRight: 32,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
  },
});
