import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { useCurrentUser } from "@/constants/session";
import { Button } from "@/components/Button";
import { Colors } from "@/constants/theme";
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

const { primary, neutral, background } = Colors;

const TOTAL_STEPS = 5;
const CURRENT_STEP = 1;
const PROGRESS = CURRENT_STEP / TOTAL_STEPS;

interface Option {
  id: string;
  label: string;
}

const INDIVIDUAL_OPTIONS: Option[] = [
  { id: "freelance", label: "Freelance work" },
];

function RadioOption({
  option,
  selected,
  onSelect,
}: {
  option: Option;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
      onPress={() => onSelect(option.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.radioCircle, selected && styles.radioCircleFilled]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{option.label}</Text>
    </TouchableOpacity>
  );
}

export default function CreateServiceScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const [selected, setSelected] = useState<string | null>(null);
  const [businessOptions, setBusinessOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: legacy API removed — implement getUserAffiliations via Laravel API
    console.log("TODO: implement getUserAffiliations via Laravel API", {
      userId,
    });
    setBusinessOptions([]);
    setLoading(false);
  }, [userId]);

  const canProceed = selected !== null;

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      {/* Step indicator + progress bar */}
      <View style={styles.stepHeader}>
        <View style={styles.stepRow}>
          <Text style={styles.stepLabel}>
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </Text>
          <Text style={styles.stepPercent}>{Math.round(PROGRESS * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: PROGRESS }]} />
          <View style={{ flex: 1 - PROGRESS }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>How You Want to Offer This Service</Text>
        <Text style={styles.subtitle}>
          Select a business you&apos;re affiliated with, or choose to work
          independently.
        </Text>

        {/* Individual provider section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>As an individual provider</Text>
          <Text style={styles.sectionDescription}>
            Create and manage this service on your own
          </Text>
          <View style={styles.optionsGroup}>
            {INDIVIDUAL_OPTIONS.map((opt) => (
              <RadioOption
                key={opt.id}
                option={opt}
                selected={selected === opt.id}
                onSelect={setSelected}
              />
            ))}
          </View>
        </View>

        {/* Business member section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>As a member of a business</Text>
          <Text style={styles.sectionDescription}>
            Services provided under a business will be limited to their rules,
            pricing structure, or service guidelines
          </Text>
          <View style={styles.optionsGroup}>
            {loading ? (
              <ActivityIndicator size="small" color={primary[400]} />
            ) : businessOptions.length === 0 ? (
              <Text style={styles.emptyText}>No affiliated businesses</Text>
            ) : (
              businessOptions.map((opt) => (
                <RadioOption
                  key={opt.id}
                  option={opt}
                  selected={selected === opt.id}
                  onSelect={setSelected}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Back"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          onPress={() => router.back()}
        />
        <Button
          title="Next"
          variant="primary"
          size="md"
          style={{ flex: 1 }}
          disabled={!canProceed}
          onPress={() => {
            if (!canProceed || !selected) return;
            const isFreelance = selected === "freelance";
            const businessOption = businessOptions.find((o) => o.id === selected);
            router.push({
              pathname: "/create-service-category",
              params: {
                serviceMode: isFreelance ? "freelance" : "business",
                businessAffiliationId: isFreelance ? undefined : selected,
                businessName: isFreelance ? undefined : businessOption?.label,
              },
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  // Step header
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
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
  // Title
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: neutral[800],
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  // Section
  section: {
    marginBottom: 28,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[700],
  },
  sectionDescription: {
    fontSize: 12,
    color: neutral[400],
    lineHeight: 18,
    marginBottom: 10,
  },
  optionsGroup: {
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: neutral[400],
    fontStyle: "italic",
  },
  // Radio option
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: neutral[200],
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: background.card,
  },
  radioOptionSelected: {
    borderColor: primary[400],
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: neutral[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleFilled: {
    borderColor: primary[400],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: primary[400],
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: neutral[700],
  },
  // Footer
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
