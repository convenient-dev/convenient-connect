import { getBusinessForEdit } from "@/api/business";
import { getServiceCategories } from "@/api/services";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

const NUM_COLUMNS = 4;

interface Category {
  id: number;
  name: string;
  iconUrl: string | null;
}

function CategoryItem({
  item,
  selected,
  onSelect,
}: {
  item: Category;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.cell, selected && styles.cellSelected]}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconWrapper, selected && styles.iconWrapperSelected]}
      >
        {item.iconUrl && (
          <ExpoImage
            source={{ uri: item.iconUrl }}
            style={styles.icon}
            contentFit="contain"
          />
        )}
      </View>
      <Text
        style={[styles.cellLabel, selected && styles.cellLabelSelected]}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
}

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
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={[styles.grid, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CategoryItem
              item={item}
              selected={selected === item.id}
              onSelect={setSelected}
            />
          )}
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
  // Grid
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
    borderRadius: 10,
  },
  cellSelected: {
    backgroundColor: primary[50],
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: background.subtle,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrapperSelected: {
    backgroundColor: primary[50],
  },
  icon: {
    width: 44,
    height: 44,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: neutral[600],
    textAlign: "center",
    lineHeight: 14,
  },
  cellLabelSelected: {
    color: primary[500],
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
});
