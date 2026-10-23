import { Colors } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const { primary, neutral } = Colors;

interface Props {
  step: number;
  totalSteps: number;
  /**
   * Position within the current step, for steps made of several pages (e.g.
   * the template-driven form). Keeps the label at "Step N of M" while the bar
   * advances from the end of step N-1 towards the end of step N.
   */
  substep?: number;
  substepCount?: number;
}

/** "Step N of M" label with a progress bar, shared by the create-service wizard. */
export function StepProgressHeader({ step, totalSteps, substep, substepCount }: Props) {
  const withinStep =
    substep !== undefined && substepCount ? Math.min(Math.max(substep / substepCount, 0), 1) : 1;
  const progress = Math.min(Math.max((step - 1 + withinStep) / totalSteps, 0), 1);
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepRow}>
        <Text style={styles.stepLabel}>
          Step {step} of {totalSteps}
        </Text>
        <Text style={styles.stepPercent}>{Math.round(progress * 100)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[500],
  },
  stepPercent: {
    fontSize: 13,
    fontWeight: "600",
    color: primary[400],
  },
  progressTrack: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[100],
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: primary[400],
    borderRadius: 2,
  },
});
