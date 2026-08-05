import { Button } from "@/components/Button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getServiceCategories } from "@/api/business";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
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

const { primary, neutral, background } = Colors;

const TOTAL_STEPS = 5;
const CURRENT_STEP = 1;
const PROGRESS = CURRENT_STEP / TOTAL_STEPS;
const NUM_COLUMNS = 4;

interface Category {
  id: number;
  name: string;
  iconUrl: string;
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
        <CategoryIcon name={item.name} size={44} />
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

export default function CreateServiceCategoryScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { serviceMode, businessAffiliationId, businessName } =
    useLocalSearchParams<{
      serviceMode: string;
      businessAffiliationId: string;
      businessName: string;
    }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    getServiceCategories()
      .then((data) => {
        setCategories(
          data.map((cat) => ({
            id: cat.category_id,
            name: cat.category_name,
            iconUrl: cat.category_logo ?? "",
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Service Categories</Text>
        <Text style={styles.subtitle}>
          Select a category that applies to your service
        </Text>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
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
            if (!canProceed) return;
            const category = categories.find((c) => c.id === selected)!;
            const categorySlug = category.name
              .toLowerCase()
              .replace(/\.$/, "")
              .replace(/\s+/g, "-");
            router.push({
              pathname: "/create-service-subcategory",
              params: {
                categoryId: String(category.id),
                categorySlug,
                categoryName: category.name,
                serviceMode,
                businessAffiliationId,
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
  // Title
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
  // Loader
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    // borderWidth: 2,
    // borderColor: primary[400],
    backgroundColor: primary[50],
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
  // Footer
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
