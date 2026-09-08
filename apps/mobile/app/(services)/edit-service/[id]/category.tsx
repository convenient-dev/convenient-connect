import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { useCurrentUser } from "@/constants/session";
import { Colors } from "@/constants/theme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;


interface ServiceCategory {
  subcategory: {
    name: string;
    category: { name: string };
  } | null;
}

export default function EditServiceCategoryScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    // TODO: legacy API removed — implement getService via Laravel API
    console.log("TODO: implement getService via Laravel API", { userId, id });
    const data = null as ServiceCategory | null;
    setSubcategoryName(data?.subcategory?.name ?? null);
    setCategoryName(data?.subcategory?.category.name ?? null);
    setLoading(false);
  }, [id, userId]);

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Service Category" />

      {loading ? (
        <ActivityIndicator size="large" color={primary[400]} style={styles.loader} />
      ) : (
        <View style={[styles.card, contentWidthStyle]}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Category</Text>
            <Text style={styles.rowValue}>{categoryName ?? "—"}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Subcategory</Text>
            <Text style={styles.rowValue}>{subcategoryName ?? "—"}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.screen },
  loader: { flex: 1 },
  card: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: background.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: neutral[200],
    paddingHorizontal: 16,
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  rowLabel: { fontSize: 14, fontWeight: "600", color: "neutral[800]" },
  rowValue: { fontSize: 14, color: neutral[500] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: neutral[200] },
});
