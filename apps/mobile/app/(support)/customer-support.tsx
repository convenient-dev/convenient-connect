import {
  listSupportFaqs,
  listSupportTopics,
  searchSupportFaqs,
  type SupportFaq,
  type SupportTopic,
} from "@/api/support";
import { ApiError } from "@/api/client";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const SEARCH_DEBOUNCE_MS = 300;

export default function CustomerSupportScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [activeTopicId, setActiveTopicId] = useState<number | null>(null);
  // FAQs are fetched per topic the first time it is opened and kept.
  const [faqsByTopic, setFaqsByTopic] = useState<Record<number, SupportFaq[]>>({});
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SupportFaq[]>([]);
  const [searching, setSearching] = useState(false);
  const tabsRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);
  // Ignore search responses that a newer query has superseded.
  const searchId = useRef(0);

  useEffect(() => {
    let active = true;
    listSupportTopics()
      .then((list) => {
        if (!active) return;
        setTopics(list);
        setActiveTopicId(list[0]?.id ?? null);
      })
      .catch((error) => {
        if (!active) return;
        setTopicsError(
          error instanceof ApiError ? error.message : "Couldn't load help topics.",
        );
      })
      .finally(() => {
        if (active) setLoadingTopics(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTopicId === null || activeTopicId in faqsByTopic) return;
    let active = true;
    setLoadingFaqs(true);
    listSupportFaqs(activeTopicId)
      .then((faqs) => {
        if (active) setFaqsByTopic((prev) => ({ ...prev, [activeTopicId]: faqs }));
      })
      .catch(() => {
        // A failed topic shows as empty; switching back retries.
        if (active) setFaqsByTopic((prev) => ({ ...prev, [activeTopicId]: [] }));
      })
      .finally(() => {
        if (active) setLoadingFaqs(false);
      });
    return () => {
      active = false;
    };
  }, [activeTopicId, faqsByTopic]);

  const trimmedQuery = query.trim();

  useEffect(() => {
    const id = ++searchId.current;
    if (!searchActive || !trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchSupportFaqs(trimmedQuery)
        .then((faqs) => {
          if (id === searchId.current) setSearchResults(faqs);
        })
        .catch(() => {
          if (id === searchId.current) setSearchResults([]);
        })
        .finally(() => {
          if (id === searchId.current) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchActive, trimmedQuery]);

  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? null;
  const activeFaqs = activeTopicId !== null ? faqsByTopic[activeTopicId] : undefined;

  function handleSelectTopic(id: number) {
    setActiveTopicId(id);
    setExpandedFaqId(null);
  }

  function toggleFaq(id: number) {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  }

  function openSearch() {
    setSearchActive(true);
    setExpandedFaqId(null);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch() {
    setSearchActive(false);
    setQuery("");
    setExpandedFaqId(null);
  }

  function openFaq(faq: SupportFaq) {
    router.push({
      pathname: "/faq-detail",
      params: {
        id: faq.id !== undefined ? String(faq.id) : undefined,
        question: faq.question,
        answer: faq.answer,
        topic: faq.topic_name ?? activeTopic?.name,
      },
    });
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
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
              maxLength={100}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <MaterialIcons name="cancel" size={18} color={neutral[400]} />
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
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchActive && trimmedQuery ? (
          <View style={styles.questionsList}>
            {searching ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={primary[400]} />
              </View>
            ) : searchResults.length === 0 ? (
              <Text style={styles.emptyText}>
                No results for &ldquo;{trimmedQuery}&rdquo;
              </Text>
            ) : (
              searchResults.map((faq, i) => (
                <React.Fragment key={faq.id ?? `${faq.topic_id}:${faq.question}`}>
                  <TouchableOpacity
                    style={styles.questionRow}
                    activeOpacity={0.7}
                    onPress={() => openFaq(faq)}
                  >
                    <View style={styles.questionTextWrap}>
                      {faq.topic_name ? (
                        <Text style={styles.questionTopic}>{faq.topic_name}</Text>
                      ) : null}
                      <Text style={styles.questionText} numberOfLines={2}>
                        {faq.question}
                      </Text>
                    </View>
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

            {loadingTopics ? (
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={primary[400]} />
              </View>
            ) : topicsError ? (
              <Text style={styles.emptyText}>{topicsError}</Text>
            ) : topics.length === 0 ? (
              <Text style={styles.emptyText}>No help articles yet.</Text>
            ) : (
              <>
                <ScrollView
                  ref={tabsRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsContent}
                >
                  {topics.map((t) => {
                    const active = t.id === activeTopicId;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.tabPill, active && styles.tabPillActive]}
                        activeOpacity={0.8}
                        onPress={() => t.id !== undefined && handleSelectTopic(t.id)}
                      >
                        <Text
                          style={[
                            styles.tabPillText,
                            active && styles.tabPillTextActive,
                          ]}
                        >
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.questionsList}>
                  {loadingFaqs || !activeFaqs ? (
                    <View style={styles.loader}>
                      <ActivityIndicator size="small" color={primary[400]} />
                    </View>
                  ) : activeFaqs.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No articles in this topic yet.
                    </Text>
                  ) : (
                    activeFaqs.map((faq, i) => {
                      const expanded = expandedFaqId === faq.id;
                      return (
                        <React.Fragment key={faq.id ?? faq.question}>
                          <View>
                            <TouchableOpacity
                              style={styles.questionRow}
                              activeOpacity={0.7}
                              onPress={() => faq.id !== undefined && toggleFaq(faq.id)}
                            >
                              <Text
                                style={styles.questionText}
                                numberOfLines={expanded ? undefined : 2}
                              >
                                {faq.question}
                              </Text>
                              <MaterialIcons
                                name={expanded ? "expand-less" : "expand-more"}
                                size={22}
                                color={neutral[400]}
                              />
                            </TouchableOpacity>
                            {expanded && (
                              <Text style={styles.answerText}>{faq.answer}</Text>
                            )}
                          </View>
                          {i < activeFaqs.length - 1 && (
                            <View style={styles.divider} />
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </View>
              </>
            )}
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
  questionTextWrap: {
    flex: 1,
    gap: 2,
  },
  questionTopic: {
    fontSize: 11,
    fontWeight: "600",
    color: primary[600],
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
