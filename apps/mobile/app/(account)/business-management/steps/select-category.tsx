import { getBusinessForEdit } from "@/api/business";
import { getServiceCategories } from "@/api/services";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { IconGrid, type IconGridItem } from "@/components/IconGrid";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, text, background } = Colors;

type Category = IconGridItem;

export default function SelectCategoryScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const params = useLocalSearchParams<{ flow?: string; businessId?: string }>();
  // Editing an existing business's services: preselect its current category.
  const isEditMode = params.flow === "edit-business" && !!params.businessId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getServiceCategories();
        console.log(`[SelectCategory] Received ${data.length} categories from API`);

        // Log first category details for debugging
        if (data.length > 0) {
          console.log(`[SelectCategory] First category:`, {
            id: data[0].category_id,
            name: data[0].category_name,
            subCount: data[0].sub_category_list?.length || 0
          });
        }

        setCategories(
          data.map((cat) => ({
            id: cat.category_id,
            name: cat.category_name,
            iconUrl: cat.category_logo,
          }))
        );

        if (isEditMode) {
          // The edit response only carries subcategory ids, so find the
          // category that owns them.
          const business = await getBusinessForEdit(Number(params.businessId));
          const currentIds: number[] = business.service_sub_category_ids ?? [];
          const currentCategory = data.find((cat) =>
            cat.sub_category_list.some((sub) =>
              currentIds.includes(sub.sub_category_id),
            ),
          );
          if (currentCategory) setSelected(currentCategory.category_id);
        }
      } catch (error) {
        console.error("[SelectCategory] Error loading categories:", error);
        setLoadError("Failed to load categories");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEditMode, params.businessId]);

  const canProceed = selected !== null;

  function handleContinue() {
    if (!canProceed) return;
    const category = categories.find((c) => c.id === selected)!;
    const categorySlug = category.name
      .toLowerCase()
      .replace(/\.$/, "")
      .replace(/\s+/g, "-");

    router.push({
      pathname: "/business-management/steps/select-subcategories",
      params: {
        ...params,
        categoryId: String(category.id),
        categorySlug,
        categoryName: category.name,
      },
    });
  }

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      <ScreenHeader title="Select Category" />

      <Text style={styles.subtitle}>Please select a service category</Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : (
        <IconGrid
          items={categories}
          selectedIds={selected === null ? [] : [selected]}
          onSelect={setSelected}
        />
      )}

      <View style={[styles.footer, contentWidthStyle]}>
        <Button
          title="Continue"
          variant="secondary"
          size="lg"
          disabled={!canProceed}
          onPress={handleContinue}
        />
      </View>

      <ConfirmModal
        visible={loadError !== null}
        type="error"
        title="Error"
        message={loadError ?? ""}
        confirmLabel="OK"
        onConfirm={() => {
          setLoadError(null);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  subtitle: {
    fontSize: 16,
    color: text.primary,
    letterSpacing: -0.408,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    alignSelf: "center",
  },
  loader: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
});
