import { listBusinesses, type ProviderBusinessListItem } from "@/api/business";
import { toAbsoluteUrl } from "@/api/client";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TabBar } from "@/components/TabBar";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { primary, neutral, text, background, status } = Colors;

type TabKey = "businesses" | "affiliations";

type CollapsingChipRowProps = {
  count: number;
  gap: number;
  renderChip: (index: number) => React.ReactNode;
  renderOverflow: (hidden: number) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-line chip row that never wraps: chips that don't fit are replaced by
 * a trailing "+N" pill. Chips and the pill are measured in a hidden layer so
 * the visible count can be computed from real widths.
 */
function CollapsingChipRow({
  count,
  gap,
  renderChip,
  renderOverflow,
  style,
}: CollapsingChipRowProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [chipWidths, setChipWidths] = useState<number[]>([]);
  const [overflowWidth, setOverflowWidth] = useState(0);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const onChipLayout = useCallback((index: number, width: number) => {
    setChipWidths((prev) => {
      if (prev[index] === width) return prev;
      const next = prev.slice();
      next[index] = width;
      return next;
    });
  }, []);

  if (count === 0) return null;

  const measured =
    containerWidth > 0 &&
    overflowWidth > 0 &&
    Array.from({ length: count }, (_, i) => chipWidths[i] ?? 0).every(
      (w) => w > 0,
    );

  let visible = count;
  if (measured) {
    const fits = (n: number, withOverflow: boolean) => {
      let w = 0;
      for (let i = 0; i < n; i++) w += chipWidths[i] + (i > 0 ? gap : 0);
      if (withOverflow) w += (n > 0 ? gap : 0) + overflowWidth;
      return w <= containerWidth + 0.5;
    };
    if (!fits(count, false)) {
      visible = count - 1;
      while (visible > 0 && !fits(visible, true)) visible--;
    }
  }
  const hidden = count - visible;

  return (
    <View style={[styles.collapsingRow, style]} onLayout={onContainerLayout}>
      <View style={[styles.collapsingVisible, { gap }]}>
        {Array.from({ length: visible }, (_, i) => renderChip(i))}
        {hidden > 0 && renderOverflow(hidden)}
      </View>
      <View
        style={[styles.collapsingMeasure, { gap }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            onLayout={(e) => onChipLayout(i, e.nativeEvent.layout.width)}
          >
            {renderChip(i)}
          </View>
        ))}
        <View
          onLayout={(e) => setOverflowWidth(e.nativeEvent.layout.width)}
        >
          {renderOverflow(count)}
        </View>
      </View>
    </View>
  );
}

/** One business in either tab: name with verification badge, service chips, chevron. */
function BusinessListRow({
  business,
  onPress,
}: {
  business: ProviderBusinessListItem;
  onPress: () => void;
}) {
  const services = business.services ?? [];
  return (
    <TouchableOpacity
      style={styles.businessRow}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.businessInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.businessName} numberOfLines={1}>
            {business.business_name}
          </Text>
          <MaterialIcons
            name={business.business_verification ? "check-circle" : "error"}
            size={14}
            color={
              business.business_verification ? status.active : status.error
            }
          />
        </View>
        <CollapsingChipRow
          count={services.length}
          gap={6}
          renderChip={(i) => {
            const service = services[i];
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
                <Text style={styles.chipText} numberOfLines={1}>
                  {service.sub_category_name}
                </Text>
              </View>
            );
          }}
          renderOverflow={(hidden) => (
            <View key="overflow" style={styles.chip}>
              <Text style={styles.chipText}>+{hidden}</Text>
            </View>
          )}
        />
      </View>
      <MaterialIcons name="chevron-right" size={26} color={neutral[800]} />
    </TouchableOpacity>
  );
}

export default function BusinessManagementScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>(
    tab === "affiliations" ? "affiliations" : "businesses",
  );
  const [allBusinesses, setAllBusinesses] = useState<ProviderBusinessListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // One list covers both tabs; reloaded on focus so a business created or
  // joined by invite code shows up right away.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      listBusinesses()
        .then((data) => setAllBusinesses(data ?? []))
        .catch(() => setAllBusinesses([]))
        .finally(() => setLoading(false));
    }, []),
  );

  // Items without a role predate the field and can only be owned businesses.
  const businesses = allBusinesses.filter((b) => b.membership_role !== "member");
  const affiliations = allBusinesses.filter(
    (b) => b.membership_role === "member",
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "businesses", label: "My Businesses" },
    { key: "affiliations", label: "My Collaborations" },
  ];

  return (
    <SafeAreaView
      style={[styles.container, screenPaddingStyle]}
      edges={["top", "bottom"]}
    >
      <StatusBar style="dark" />

      <ScreenHeader title="Business Management" />

      <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === "businesses" ? (
        <>
          {loading ? (
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
                <BusinessListRow
                  key={business.business_id}
                  business={business}
                  onPress={() =>
                    router.push({
                      pathname: "/business-management/[id]",
                      params: { id: String(business.business_id) },
                    })
                  }
                />
              ))}
            </ScrollView>
          )}

          <View style={[styles.footer, contentWidthStyle]}>
            <Button
              title="Create Business"
              variant="secondary"
              size="lg"
              onPress={() => router.push("/business-management/create")}
            />
          </View>
        </>
      ) : loading ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.affiliationListContent,
            contentWidthStyle,
          ]}
          showsVerticalScrollIndicator={false}
        >
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
              <BusinessListRow
                key={a.business_id}
                business={a}
                onPress={() =>
                  router.push({
                    pathname: "/business-management/collaboration/[id]",
                    params: { id: String(a.business_id) },
                  })
                }
              />
            ))
          )}
        </ScrollView>
      )}

      {activeTab === "affiliations" && !loading && (
        <View style={[styles.footer, contentWidthStyle]}>
          <Button
            title="Add Collaboration"
            variant="secondary"
            size="lg"
            onPress={() => router.push("/business-management/join")}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  businessName: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  collapsingRow: {
    alignSelf: "stretch",
    overflow: "hidden",
  },
  collapsingVisible: {
    flexDirection: "row",
    alignItems: "center",
  },
  collapsingMeasure: {
    position: "absolute",
    top: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    opacity: 0,
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
    fontSize: 12,
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
    paddingTop: 24,
    paddingBottom: 24,
    gap: 24,
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
});
