import { listBusinesses, type ProviderBusinessListItem } from "@/api/business";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/Button";
import { StepProgressHeader } from "@/components/StepProgressHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { CREATE_SERVICE_DISPLAY_TOTAL_STEPS } from "@/constants/create-service";
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

const { primary, neutral, background, status } = Colors;

const CURRENT_STEP = 1;
const DISPLAY_TOTAL_STEPS = CREATE_SERVICE_DISPLAY_TOTAL_STEPS;

const INDIVIDUAL_ID = "individual";

interface Option {
  id: string;
  label: string;
}

function RadioOption({
  option,
  selected,
  disabled = false,
  onSelect,
}: {
  option: Option;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.radioOption,
        selected && styles.radioOptionSelected,
        disabled && styles.radioOptionDisabled,
      ]}
      onPress={() => onSelect(option.id)}
      activeOpacity={0.7}
      disabled={disabled}
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
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<ProviderBusinessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The backend rejects individual creation unless the provider is verified.
  const isVerified = user?.backgroundVerification === "Verified";

  useEffect(() => {
    listBusinesses()
      .then((list) => setBusinesses(list.filter((b) => b.status !== false)))
      .catch(() => setLoadError("Couldn't load your businesses."))
      .finally(() => setLoading(false));
  }, []);

  const canProceed = selected !== null;

  function handleNext() {
    if (!selected) return;
    if (selected === INDIVIDUAL_ID) {
      router.push({
        pathname: "/create-service-category",
        params: { providerType: "individual" },
      });
      return;
    }
    const business = businesses.find((b) => String(b.business_id) === selected);
    router.push({
      pathname: "/create-service-category",
      params: {
        providerType: "business",
        businessId: selected,
        businessName: business?.business_name ?? "",
      },
    });
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <StepProgressHeader step={CURRENT_STEP} totalSteps={DISPLAY_TOTAL_STEPS} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentWidthStyle]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How You Want to Offer This Service</Text>
        <Text style={styles.subtitle}>
          Select a business you&apos;re affiliated with, or choose to work
          independently.
        </Text>

        {/* Individual provider */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>As an individual provider</Text>
          <Text style={styles.sectionDescription}>
            Create and manage this service on your own
          </Text>
          <View style={styles.optionsGroup}>
            <RadioOption
              option={{ id: INDIVIDUAL_ID, label: "Freelance work" }}
              selected={selected === INDIVIDUAL_ID}
              disabled={!isVerified}
              onSelect={setSelected}
            />
            {!isVerified ? (
              <Text style={styles.hintText}>
                Complete your background check to offer services as an
                individual.
              </Text>
            ) : null}
          </View>
        </View>

        {/* Business member */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>As a member of a business</Text>
          <Text style={styles.sectionDescription}>
            Services provided under a business will be limited to their rules,
            pricing structure, or service guidelines
          </Text>
          <View style={styles.optionsGroup}>
            {loading ? (
              <ActivityIndicator size="small" color={primary[400]} />
            ) : loadError ? (
              <Text style={styles.errorText}>{loadError}</Text>
            ) : businesses.length === 0 ? (
              <Text style={styles.emptyText}>No active businesses</Text>
            ) : (
              businesses.map((business) => (
                <RadioOption
                  key={business.business_id}
                  option={{
                    id: String(business.business_id),
                    label: business.business_name ?? "Business",
                  }}
                  selected={selected === String(business.business_id)}
                  onSelect={setSelected}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

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
          onPress={handleNext}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
  },
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
  hintText: {
    fontSize: 12,
    color: neutral[400],
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: status.error,
  },
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
  radioOptionDisabled: {
    opacity: 0.5,
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
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
