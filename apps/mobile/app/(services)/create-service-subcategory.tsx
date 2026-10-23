import { listServiceSubcategories } from "@/api/service-management";
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

const CURRENT_STEP = 3;
const DISPLAY_TOTAL_STEPS = CREATE_SERVICE_DISPLAY_TOTAL_STEPS;

type Params = CreateServiceContextParams & {
  categoryId: string;
  categoryName: string;
};

export default function CreateServiceSubcategoryScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { categoryId, categoryName, providerType, businessId, businessName } =
    useLocalSearchParams<Params>();

  const [subcategories, setSubcategories] = useState<IconGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const businessIdNumber =
    providerType === "business" && businessId ? Number(businessId) : undefined;

  useEffect(() => {
    if (!categoryId) return;
    listServiceSubcategories(Number(categoryId), businessIdNumber)
      .then((data) =>
        setSubcategories(
          data
            .filter((s) => s.sub_category_id !== undefined)
            .map((s) => ({
              id: s.sub_category_id!,
              name: s.sub_category_name ?? "",
              iconUrl: s.sub_category_logo ?? null,
            })),
        ),
      )
      .catch(() => setError("Couldn't load services for this category."))
      .finally(() => setLoading(false));
  }, [categoryId, businessIdNumber]);

  const canProceed = selected !== null;

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <StepProgressHeader step={CURRENT_STEP} totalSteps={DISPLAY_TOTAL_STEPS} />

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{categoryName}</Text>
        <Text style={styles.subtitle}>
          Which service are you providing your customers?
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
      ) : subcategories.length === 0 ? (
        <View style={styles.loader}>
          <Text style={styles.emptyText}>
            No services are available in this category for your selection.
          </Text>
        </View>
      ) : (
        <IconGrid
          items={subcategories}
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
            const subcategory = subcategories.find((s) => s.id === selected)!;
            router.push({
              pathname: "/create-service-form",
              params: {
                categoryId,
                categoryName,
                subcategoryId: String(subcategory.id),
                subcategoryName: subcategory.name,
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
