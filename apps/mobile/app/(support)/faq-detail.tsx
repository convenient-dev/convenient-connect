import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, border } = Colors;

export default function FaqDetailScreen() {
  const { question, answer, topic } = useLocalSearchParams<{
    question: string;
    answer: string;
    topic?: string;
  }>();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Customer Support" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {topic && <Text style={styles.topic}>{topic}</Text>}
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
