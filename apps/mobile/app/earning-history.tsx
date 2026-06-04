import {
  EarningsCalendar,
  type CalendarEarningItem,
} from "@/components/EarningsCalendar";
import {
  FilterBottomSheet,
  type FilterSection,
  type FilterValues,
} from "@/components/FilterBottomSheet";
import { FilterButton } from "@/components/FilterButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TabBar } from "@/components/TabBar";
import { Colors } from "@/constants/theme";
import earningHistoryData from "@/assets/data/earning-history.json";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { brand, neutral, text, background, border, secondary, status } = Colors;

type TabKey = "earnings" | "pending";
type ViewMode = "calendar" | "list";

// TODO: Replace dummy data with backend earnings API.
interface EarningItem {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  listingPrice: number;
  convenientFee: number;
  payout: number;
  feeLabel?: string;
}

const DUMMY_EARNINGS: Record<TabKey, EarningItem[]> = {
  earnings: earningHistoryData.earnings,
  pending: earningHistoryData.pending,
};

function formatAmount(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function EarningHistoryScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("earnings");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    time: [],
    category: [],
  });
  const hasActiveFilters = Object.values(filterValues).some(
    (v) => v.length > 0,
  );

  // TODO: Implement actual filtering logic based on selected filter values.
  // TODO: category filter would be retrived from backend based on listing categories.
  const filterSections: FilterSection[] = [
    {
      key: "time",
      title: "Time",
      options: [
        { key: "today", label: "Today" },
        { key: "tomorrow", label: "Tomorrow" },
        { key: "this_week", label: "This week" },
        { key: "this_month", label: "This month" },
        { key: "this_year", label: "This year" },
      ],
    },
    {
      key: "category",
      title: "Categories",
      options: [
        { key: "pet_care", label: "Pet Care" },
        { key: "sanitation", label: "Sanitation" },
        { key: "it", label: "IT" },
      ],
    },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "earnings", label: "Earnings" },
    { key: "pending", label: "Pending Earnings" },
  ];

  const items = DUMMY_EARNINGS[activeTab];

  const calendarItems = useMemo<CalendarEarningItem[]>(() => {
    return [
      ...DUMMY_EARNINGS.earnings.map<CalendarEarningItem>((e) => ({
        id: e.id,
        type: "earning",
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        amount: e.payout,
        listingPrice: e.listingPrice,
        convenientFee: e.convenientFee,
        feeLabel: e.feeLabel,
      })),
      ...DUMMY_EARNINGS.pending.map<CalendarEarningItem>((e) => ({
        id: e.id,
        type: "pending",
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        amount: e.payout,
        listingPrice: e.listingPrice,
        convenientFee: e.convenientFee,
        feeLabel: e.feeLabel,
      })),
    ];
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Earning History"
        rightAccessory={
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                viewMode === "calendar" && styles.viewToggleButtonActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setViewMode("calendar")}
            >
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={18}
                color={viewMode === "calendar" ? neutral[0] : text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                viewMode === "list" && styles.viewToggleButtonActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setViewMode("list")}
            >
              <Feather
                name="list"
                size={18}
                color={viewMode === "list" ? neutral[0] : text.primary}
              />
            </TouchableOpacity>
          </View>
        }
      />

      {viewMode === "calendar" ? (
        <EarningsCalendar items={calendarItems} />
      ) : (
        <>
          <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

          <FilterButton
            onPress={() => setFilterVisible(true)}
            active={hasActiveFilters}
          />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, i) => (
              <View key={item.id}>
                <View style={styles.earningRow}>
                  <View style={styles.earningInfo}>
                    <Text style={styles.earningDate}>
                      {item.startDate} - {item.endDate}
                    </Text>
                    <Text style={styles.earningTitle}>{item.title}</Text>
                    <Text style={styles.earningListing}>
                      Listing Price: {formatAmount(item.listingPrice)}
                    </Text>
                    <Text style={styles.earningFee}>
                      {item.feeLabel ?? "Convenient Fee"}:{" "}
                      {formatAmount(item.convenientFee)}
                    </Text>
                  </View>
                  <Text style={styles.earningPayout}>
                    {formatAmount(item.payout)}
                  </Text>
                </View>
                {i < items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <FilterBottomSheet
        visible={filterVisible}
        sections={filterSections}
        initialValue={filterValues}
        onClose={() => setFilterVisible(false)}
        onApply={setFilterValues}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },

  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: neutral[50],
    borderRadius: 10,
    padding: 2,
  },
  viewToggleButton: {
    width: 40,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleButtonActive: {
    backgroundColor: brand.primary,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    gap: 12,
  },
  earningInfo: {
    flex: 1,
    gap: 2,
  },
  earningDate: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  earningTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 2,
  },
  earningListing: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
    marginTop: 4,
  },
  earningFee: {
    fontSize: 13,
    color: secondary[500],
    letterSpacing: -0.408,
    marginTop: 2,
  },
  earningPayout: {
    fontSize: 17,
    fontWeight: "600",
    color: status.active,
    letterSpacing: -0.408,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },
});
