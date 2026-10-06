import { listServiceCategories } from "@/api/service-management";
import { Button } from "@/components/Button";
import { IconGrid, type IconGridItem } from "@/components/IconGrid";
import { StepProgressHeader } from "@/components/StepProgressHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import {
  CREATE_SERVICE_DISPLAY_TOTAL_STEPS,
  type CreateServiceContextParams,
} from "@/constants/create-service";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background, status } = Colors;

const CURRENT_STEP = 2;
const DISPLAY_TOTAL_STEPS = CREATE_SERVICE_DISPLAY_TOTAL_STEPS;

export default function CreateServiceCategoryScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { providerType, businessId, businessName } =
    useLocalSearchParams<CreateServiceContextParams>();
  const [categories, setCategories] = useState<IconGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const businessIdNumber =
    providerType === "business" && businessId ? Number(businessId) : undefined;

  useEffect(() => {
    listServiceCategories(businessIdNumber)
      .then((data) =>
        setCategories(
          data
            .filter((c) => c.category_id !== undefined)
            .map((c) => ({
              id: c.category_id!,
              name: c.category_name ?? "",
              iconUrl: c.category_logo ?? null,
            })),
        ),
      )
      .catch(() => setError("Couldn't load categories."))
      .finally(() => setLoading(false));
  }, [businessIdNumber]);

  const canProceed = selected !== null;

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <StepProgressHeader step={CURRENT_STEP} totalSteps={DISPLAY_TOTAL_STEPS} />

      <View style={styles.titleBlock}>
        <Text style={styles.title}>Service Categories</Text>
        <Text style={styles.subtitle}>
          {providerType === "business" && businessName
            ? `Categories assigned to ${businessName}`
            : "Select a category that applies to your service"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      ) : error ? (
        <View style={styles.loader}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.loader}>
          <Text style={styles.emptyText}>
            No categories are available for this selection.
          </Text>
        </View>
      ) : (
        <IconGrid
          items={categories}
          selectedIds={selected === null ? [] : [selected]}
          onSelect={setSelected}
        />
      )}

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
            if (selected === null) return;
            const category = categories.find((c) => c.id === selected)!;
            router.push({
              pathname: "/create-service-subcategory",
              params: {
                categoryId: String(category.id),
                categoryName: category.name,
                providerType,
                businessId,
                businessName,
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
  titleBlock: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 6,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: neutral[800],
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    color: neutral[400],
    lineHeight: 20,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: status.error,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
