import { getSubcategories } from "@/api/legacy";
import { Button } from "@/components/Button";
import { getSubcategoryIcon } from "@/components/SubcategoryIcon";
import { Colors } from "@/constants/theme";
import { Image } from "expo-image";
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
const CURRENT_STEP = 2;
const PROGRESS = CURRENT_STEP / TOTAL_STEPS;
const NUM_COLUMNS = 4;

interface Subcategory {
  id: number;
  name: string;
  categoryId: number;
}

function SubcategoryItem({
  item,
  categorySlug,
  selected,
  onSelect,
}: {
  item: Subcategory;
  categorySlug: string;
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
        <Image
          source={getSubcategoryIcon(categorySlug, item.name)}
          style={styles.icon}
          contentFit="contain"
        />
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

export default function CreateServiceSubcategoryScreen() {
  const router = useRouter();
  const {
    categoryId,
    categorySlug,
    categoryName,
    serviceMode,
    businessAffiliationId,
    businessName,
  } = useLocalSearchParams<{
    categoryId: string;
    categorySlug: string;
    categoryName: string;
    serviceMode: string;
    businessAffiliationId: string;
    businessName: string;
  }>();

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    getSubcategories(categoryId)
      .then((data) => {
        setSubcategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [categoryId]);

  const canProceed = selected !== null;

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.title}>{categoryName}</Text>
        <Text style={styles.subtitle}>
          Which service are you providing your customers?
        </Text>
      </View>

      {/* Grid */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={primary[400]} />
        </View>
      ) : (
        <FlatList
          data={subcategories}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SubcategoryItem
              item={item}
              categorySlug={categorySlug ?? ""}
              selected={selected === item.id}
              onSelect={setSelected}
            />
          )}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
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
            const subcategory = subcategories.find((s) => s.id === selected)!;
            router.push({
              pathname: "/create-service-form",
              params: {
                subcategoryId: String(selected),
                subcategoryName: subcategory.name,
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
  row: {
    justifyContent: "flex-start",
  },
  cell: {
    width: "25%",
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
  // Footer
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
