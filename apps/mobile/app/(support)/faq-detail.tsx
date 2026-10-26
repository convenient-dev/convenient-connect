import { getSupportFaq, type SupportFaq } from "@/api/support";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, border } = Colors;

/**
 * One FAQ. The list passes the article it already has so the screen renders
 * at once; the detail endpoint is then called to count the view and pick up
 * the latest text.
 */
export default function FaqDetailScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const params = useLocalSearchParams<{
    id?: string;
    question?: string;
    answer?: string;
    topic?: string;
  }>();
  const [faq, setFaq] = useState<SupportFaq | null>(null);

  useEffect(() => {
    const id = Number(params.id);
    if (!params.id || !Number.isInteger(id)) return;
    let active = true;
    getSupportFaq(id)
      .then((detail) => {
        if (active) setFaq(detail);
      })
      .catch(() => {
        // Keep showing the article the list passed in.
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  const topic = faq?.topic_name ?? params.topic;
  const question = faq?.question ?? params.question;
  const answer = faq?.answer ?? params.answer;

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Customer Support" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {topic ? <Text style={styles.topic}>{topic}</Text> : null}
          <Text style={styles.question}>{question}</Text>
          <View style={styles.divider} />
          <Text style={styles.answer}>{answer}</Text>
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
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.default,
    backgroundColor: background.card,
    gap: 12,
  },
  topic: {
    fontSize: 11,
    fontWeight: "600",
    color: primary[600],
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  question: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
  },
  answer: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 21,
  },
});
