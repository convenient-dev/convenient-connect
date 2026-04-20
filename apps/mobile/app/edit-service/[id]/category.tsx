import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, background } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

interface ServiceCategory {
  subcategory: {
    name: string;
    category: { name: string };
  } | null;
}

export default function EditServiceCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/services/${id}`)
      .then((r) => r.json())
      .then((data: ServiceCategory) => {
        setSubcategoryName(data.subcategory?.name ?? null);
        setCategoryName(data.subcategory?.category.name ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={8}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back-ios" size={18} color={neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Category</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={primary[400]} style={styles.loader} />
      ) : (
        <View style={styles.card}>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: neutral[200],
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#222b45" },
  headerSpacer: { width: 38 },
  card: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: background.card,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: neutral[200],
    paddingHorizontal: 16,
    shadowColor: "#000",
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
  rowLabel: { fontSize: 14, fontWeight: "600", color: "#222b45" },
  rowValue: { fontSize: 14, color: neutral[500] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: neutral[200] },
});
