import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

interface Affiliation {
  id: number;
  name: string;
  joinedAt: string;
  categories: { id: number; name: string }[];
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function titleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(" ");
}

export default function AffiliationsScreen() {
  const router = useRouter();
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetch(`${API_BASE_URL}/users/1/affiliations`)
        .then((res) => res.json())
        .then((data: Affiliation[]) => setAffiliations(data ?? []))
        .catch(() => setAffiliations([]))
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>My Affiliations</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Businesses you&apos;re currently affiliated with
          </Text>
          {affiliations.length === 0 ? (
            <Text style={styles.emptyText}>No affiliations yet.</Text>
          ) : (
            affiliations.map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.iconTile}>
                  <ExpoImage
                    source={require("@/assets/global-icons/company.svg")}
                    style={styles.icon}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.businessName}>{a.name}</Text>
                  <Text style={styles.joinDate}>
                    Join {formatJoinDate(a.joinedAt)}
                  </Text>
                  {a.categories.length > 0 && (
                    <View style={styles.chipsRow}>
                      {a.categories.map((c) => (
                        <View key={c.id} style={styles.chip}>
                          <Text style={styles.chipText}>
                            {titleCase(c.name)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const ICON_TILE_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  loader: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerSpacer: { width: 40 },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  subtitle: {
    fontSize: 14,
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginBottom: 18,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: neutral[400],
    textAlign: "center",
    paddingTop: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: neutral[50],
  },
  iconTile: {
    width: ICON_TILE_SIZE,
    height: ICON_TILE_SIZE,
    borderRadius: 8,
    backgroundColor: primary[100],
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 22,
    height: 22,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  joinDate: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: neutral[300],
  },
  chipText: {
    fontSize: 12,
    color: neutral[800],
    letterSpacing: -0.408,
  },
});
