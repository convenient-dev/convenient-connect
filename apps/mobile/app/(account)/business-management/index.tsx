import { listBusinesses, type ProviderBusinessListItem } from "@/api/business";
import { toAbsoluteUrl } from "@/api/client";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TabBar } from "@/components/TabBar";
import { useCurrentUser } from "@/constants/session";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background } = Colors;

type TabKey = "businesses" | "affiliations";

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

export default function BusinessManagementScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { userId } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabKey>(
    tab === "affiliations" ? "affiliations" : "businesses",
  );
  const [businesses, setBusinesses] = useState<ProviderBusinessListItem[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loadingAffiliations, setLoadingAffiliations] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoadingBusinesses(true);
      listBusinesses()
        .then((data) => setBusinesses(data ?? []))
        .catch(() => setBusinesses([]))
        .finally(() => setLoadingBusinesses(false));

      setLoadingAffiliations(true);
      // TODO: legacy API removed — implement getUserAffiliations via Laravel API
      console.log("TODO: implement getUserAffiliations via Laravel API", {
        userId,
      });
      Promise.resolve<Affiliation[]>([])
        .then((data: Affiliation[]) => setAffiliations(data ?? []))
        .catch(() => setAffiliations([]))
        .finally(() => setLoadingAffiliations(false));
    }, [userId]),
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "businesses", label: "My Businesses" },
    { key: "affiliations", label: "My Affiliations" },
  ];

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <ScreenHeader title="Business Management" />

      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === "businesses" ? (
        <>
          {loadingBusinesses ? (
            <ActivityIndicator
              size="large"
              color={primary[400]}
              style={styles.loader}
            />
          ) : businesses.length === 0 ? (
            <View style={styles.emptyBody}>
              <ExpoImage
                source={require("@/assets/global-icons/create-business-icon.png")}
                style={styles.illustration}
                contentFit="contain"
              />
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={[styles.listContent, contentWidthStyle]}
              showsVerticalScrollIndicator={false}
            >
              {businesses.map((business) => (
                <TouchableOpacity
                  key={business.business_id}
                  style={styles.businessRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/business-management/[id]",
                      params: { id: String(business.business_id) },
                    })
                  }
                >
                  <View style={styles.businessInfo}>
                    <Text style={styles.businessName} numberOfLines={1}>
                      {business.business_name}
                    </Text>
                    <View style={styles.chipRow}>
                      {(business.services ?? []).map((service) => {
                        const logo = toAbsoluteUrl(service.sub_category_logo);
                        return (
                          <View key={service.sub_category_id} style={styles.chip}>
                            {logo && (
                              <ExpoImage
                                source={{ uri: logo }}
                                style={styles.chipIcon}
                                contentFit="contain"
                              />
                            )}
                            <Text style={styles.chipText}>
                              {service.sub_category_name}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={26}
                    color={neutral[800]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={[styles.footer, contentWidthStyle]}>
            <Button
              title="Create Business"
              variant="secondary"
              size="lg"
              icon={<MaterialIcons name="add" size={22} color={Colors.neutral[0]} />}
              onPress={() =>
                router.push("/business-management/business-details")
              }
            />
          </View>
        </>
      ) : loadingAffiliations ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.affiliationListContent, contentWidthStyle]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Businesses you&apos;re currently affiliated with
          </Text>
          {affiliations.length === 0 ? (
            <View style={styles.emptyState}>
              <ExpoImage
                source={require("@/assets/global-icons/embarrassed.svg")}
                style={styles.emptyIcon}
                contentFit="contain"
              />
              <Text style={styles.emptyText}>
                You are not affiliate with any business yet
              </Text>
            </View>
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
                  <Text style={styles.affiliationName}>{a.name}</Text>
                  <Text style={styles.joinDate}>
                    Join {formatJoinDate(a.joinedAt)}
                  </Text>
                  {a.categories.length > 0 && (
                    <View style={styles.affiliationChipsRow}>
                      {a.categories.map((c) => (
                        <View key={c.id} style={styles.affiliationChip}>
                          <Text style={styles.affiliationChipText}>
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
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: 180,
    height: 180,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  businessInfo: {
    flex: 1,
    gap: 10,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: primary[50],
  },
  chipIcon: {
    width: 18,
    height: 18,
  },
  chipText: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loader: { flex: 1 },
  subtitle: {
    fontSize: 14,
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginBottom: 18,
  },
  affiliationListContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 100,
    height: 100,
  },
  emptyText: {
    fontSize: 12,
    color: neutral[400],
    textAlign: "center",
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
  affiliationName: {
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
  affiliationChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  affiliationChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: neutral[300],
  },
  affiliationChipText: {
    fontSize: 12,
    color: neutral[800],
    letterSpacing: -0.408,
  },
});
