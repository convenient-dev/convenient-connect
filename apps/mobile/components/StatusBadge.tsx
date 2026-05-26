import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Tone {
  backgroundColor: string;
  color: string;
}

const YELLOW: Tone = { backgroundColor: "#FCE9B6", color: "#B07A1A" };
const TEAL: Tone = { backgroundColor: "#C7EAE8", color: "#1F9897" };
const GREEN: Tone = { backgroundColor: "#CDEBD6", color: "#1F7A3A" };
const GRAY: Tone = { backgroundColor: "#DCDCDC", color: "#6E6E6E" };

const TONE_BY_LABEL: Record<string, Tone> = {
  open: YELLOW,
  active: YELLOW,

  "in progress": TEAL,
  pending: TEAL,

  resolved: GREEN,
  completed: GREEN,
  earning: GREEN,
  earnings: GREEN,

  closed: GRAY,
  fail: GRAY,
  failed: GRAY,
  cancelled: GRAY,
};

interface Props {
  label: string;
}

export function StatusBadge({ label }: Props) {
  const tone = TONE_BY_LABEL[label.toLowerCase()] ?? GRAY;
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.label, { color: tone.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.408,
  },
});
