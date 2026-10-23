import { ApiError } from "@/api/client";
import {
  getServiceCategory,
  type ServiceCategoryInfo,
} from "@/api/service-management";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

/** Read-only: category and subcategory are fixed when the service is created. */
export default function EditServiceCategoryScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ServiceCategoryInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setInfo(await getServiceCategory(Number(id)));
      setLoadError(null);
    } catch (error) {
      setInfo(null);
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Couldn't load the service category.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Service Category" />

      {loading ? (
        <ActivityIndicator size="large" color={primary[400]} style={styles.loader} />
      ) : !info ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Button title="Try again" variant="primary" size="md" onPress={load} />
        </View>
      ) : (
        <View style={[styles.body, contentWidthStyle]}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Category</Text>
              <Text style={styles.rowValue}>{info.category?.name ?? "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Subcategory</Text>
              <Text style={styles.rowValue}>{info.subcategory?.name ?? "—"}</Text>
            </View>
          </View>
          <Text style={styles.hint}>
            The category can&apos;t be changed after a service is created. To
            offer a service in another category, create a new service.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.screen },
  loader: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: { fontSize: 14, color: neutral[400], textAlign: "center", lineHeight: 20 },
  body: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  card: {
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
    gap: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: "600", color: neutral[800] },
  rowValue: { fontSize: 14, color: neutral[500], flexShrink: 1, textAlign: "right" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: neutral[200] },
  hint: { fontSize: 12, color: neutral[400], lineHeight: 18, paddingHorizontal: 4 },
});
