import bookingsData from "@/assets/data/bookings.json";
import { BookingCard } from "@/components/BookingCard";
import {
  BookingRequestCard,
  type BookingRequest,
} from "@/components/BookingRequestCard";
import { CardGrid } from "@/components/CardGrid";
import {
  FilterBottomSheet,
  type FilterSection,
  type FilterValues,
} from "@/components/FilterBottomSheet";
import { FilterButton } from "@/components/FilterButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TabBar } from "@/components/TabBar";
import { useCurrentUser } from "@/constants/session";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

const { brand, primary, neutral, text, background } = Colors;

type ViewMode = "calendar" | "list";

type DayKey = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
const DAYS: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WeeklySlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface OverrideSlot {
  id: number;
  startTime: string;
  endTime: string;
}

interface OverrideDay {
  id: number;
  date: string;
  isAvailable: boolean;
  slots: OverrideSlot[];
}

interface AvailabilityResponse {
  availabilityEnabled: boolean;
  weeklyAvailabilitySlots: WeeklySlot[];
  availabilityOverrideDays: OverrideDay[];
}

type BookingStatus = "active" | "completed" | "pending" | "cancelled";

type Booking = {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  clientName: string;
  status: BookingStatus;
  bookingId?: string;
  category?: string;
  location?: string;
  clientType?: "repeat" | "new";
};

const BOOKINGS: Booking[] = bookingsData.bookings as Booking[];

function toBookingRequest(b: Booking): BookingRequest {
  return {
    id: b.id,
    bookingId: b.bookingId ?? b.id,
    serviceId: b.category ?? "",
    service: b.title,
    date: b.date,
    start: b.start,
    end: b.end,
    client: {
      name: b.clientName,
      location: b.location ?? "",
      type: b.clientType ?? "new",
    },
  };
}

const BOOKING_DOT_COLORS = [
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#EF4444",
  "#14B8A6",
  "#F97316",
];

function toDateKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return toDateKey(new Date().toISOString());
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Sunday–Saturday range containing today, as inclusive date keys.
function currentWeekRange(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: localDateKey(start), end: localDateKey(end) };
}

type ListTab = "new" | "today" | "thisWeek" | "all";

const LIST_TABS: { key: ListTab; label: string }[] = [
  { key: "new", label: "New" },
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This Week" },
  { key: "all", label: "All" },
];

const LIST_EMPTY_TEXT: Record<ListTab, string> = {
  new: "No new requests right now.",
  today: "Nothing scheduled for today.",
  thisWeek: "Nothing scheduled this week.",
  all: "No bookings yet.",
};

// Status filter for the "All" tab. Pending lives under "New", so it's omitted.
const STATUS_FILTER_SECTIONS: FilterSection[] = [
  {
    key: "status",
    title: "Status",
    multiSelect: true,
    options: [
      { key: "active", label: "Active" },
      { key: "completed", label: "Completed" },
      { key: "cancelled", label: "Cancelled" },
    ],
  },
];

export default function CalendarScreen() {
  const { userId } = useCurrentUser();
  const { screenPaddingStyle } = useResponsivePadding();

  const [selectedDays, setSelectedDays] = useState<Set<DayKey>>(new Set());
  const [unavailableOverrides, setUnavailableOverrides] = useState<Set<string>>(
    new Set(),
  );
  const [availableOverrides, setAvailableOverrides] = useState<Set<string>>(
    new Set(),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [listTab, setListTab] = useState<ListTab>("new");
  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterValues>({
    status: [],
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [acceptedRequests] = useState<Set<string>>(
    new Set(),
  );
  const [visibleMonth, setVisibleMonth] = useState<string>(() =>
    todayKey().slice(0, 7),
  );
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      // TODO: legacy API removed — implement getAvailability via Laravel API
      console.log("TODO: implement getAvailability via Laravel API", { userId });
      Promise.resolve<AvailabilityResponse | null>(null)
        .then((data) => {
          if (!data) return;
          const days = new Set<DayKey>();
          for (const slot of data.weeklyAvailabilitySlots) {
            const key = DAYS[slot.dayOfWeek];
            if (key) days.add(key);
          }
          setSelectedDays(days);

          const overrides = data.availabilityOverrideDays ?? [];
          const unavailable = new Set<string>();
          const available = new Set<string>();
          for (const od of overrides) {
            const key = toDateKey(od.date);
            if (od.isAvailable && od.slots.length > 0) available.add(key);
            else unavailable.add(key);
          }
          setUnavailableOverrides(unavailable);
          setAvailableOverrides(available);
        })
        .catch(() => {
          setSelectedDays(new Set());
          setUnavailableOverrides(new Set());
          setAvailableOverrides(new Set());
        })
        .finally(() => setLoading(false));
    }, [userId]),
  );

  const isDateAvailable = useCallback(
    (dateKey: string): boolean => {
      if (availableOverrides.has(dateKey)) return true;
      if (unavailableOverrides.has(dateKey)) return false;
      const dow = new Date(`${dateKey}T00:00:00`).getDay();
      return selectedDays.has(DAYS[dow]);
    },
    [availableOverrides, unavailableOverrides, selectedDays],
  );

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of BOOKINGS) {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, []);

  const markedDates = useMemo(() => {
    const marked: Record<string, { dots?: { key: string; color: string }[] }> =
      {};
    const [y, m] = visibleMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayBookings = bookingsByDate[key] ?? [];
      if (dayBookings.length === 0) continue;
      marked[key] = {
        dots: dayBookings.map((b, idx) => ({
          key: `booking-${b.id}`,
          color: BOOKING_DOT_COLORS[idx % BOOKING_DOT_COLORS.length],
        })),
      };
    }
    return marked;
  }, [visibleMonth, bookingsByDate]);

  const allBookingsSorted = useMemo(
    () =>
      [...BOOKINGS].sort((a, b) =>
        a.date === b.date
          ? a.start.localeCompare(b.start)
          : a.date.localeCompare(b.date),
      ),
    [],
  );

  // Calendar view scopes to the tapped day; list view shows everything.
  // Calendar view: scoped to the tapped day.
  const selectedDateBookings = bookingsByDate[selectedDate] ?? [];
  const newRequests = selectedDateBookings.filter(
    (b) => b.status === "pending" && !acceptedRequests.has(b.id),
  );
  const confirmedBookings = selectedDateBookings.filter(
    (b) => b.status !== "pending",
  );

  // List view: filtered by the active tab. "New" holds pending requests; the
  // date-scoped tabs show confirmed bookings.
  const weekRange = useMemo(() => currentWeekRange(), []);
  const listBookings = useMemo(() => {
    switch (listTab) {
      case "new":
        return allBookingsSorted.filter(
          (b) => b.status === "pending" && !acceptedRequests.has(b.id),
        );
      case "today":
        return allBookingsSorted.filter(
          (b) => b.status !== "pending" && b.date === todayKey(),
        );
      case "thisWeek":
        return allBookingsSorted.filter(
          (b) =>
            b.status !== "pending" &&
            b.date >= weekRange.start &&
            b.date <= weekRange.end,
        );
      case "all": {
        const selectedStatuses = statusFilter.status ?? [];
        return allBookingsSorted.filter(
          (b) =>
            b.status !== "pending" &&
            (selectedStatuses.length === 0 ||
              selectedStatuses.includes(b.status)),
        );
      }
    }
  }, [listTab, allBookingsSorted, acceptedRequests, weekRange, statusFilter]);

  const activeStatusCount = statusFilter.status?.length ?? 0;

  function acceptRequest(id: string) {
    // TODO: API call to accept the request
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader
        title="Calendar"
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

      {loading ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : viewMode === "calendar" ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={contentWidthStyle}
          showsVerticalScrollIndicator={false}
        >
          <Calendar
            initialDate={selectedDate}
            current={selectedDate}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(m: DateData) =>
              setVisibleMonth(m.dateString.slice(0, 7))
            }
            markedDates={markedDates}
            markingType="multi-dot"
            enableSwipeMonths
            hideExtraDays
            firstDay={0}
            renderArrow={(direction: "left" | "right") => (
              <MaterialIcons
                name={direction === "left" ? "chevron-left" : "chevron-right"}
                size={24}
                color={text.primary}
              />
            )}
            theme={{
              backgroundColor: "transparent",
              calendarBackground: "transparent",
              textSectionTitleColor: neutral[400],
              dayTextColor: text.primary,
              textDisabledColor: neutral[200],
              monthTextColor: text.primary,
              textMonthFontWeight: "700",
              textDayHeaderFontSize: 12,
              selectedDayBackgroundColor: primary[300],
              selectedDayTextColor: neutral[0],
              todayTextColor: primary[400],
              arrowColor: text.primary,
            }}
            dayComponent={(props) => {
              const date = props.date as DateData | undefined;
              const state = props.state as
                | ""
                | "selected"
                | "disabled"
                | "today"
                | "inactive"
                | undefined;
              const marking = props.marking as
                | { dots?: { key: string; color: string }[] }
                | undefined;
              if (!date) return null;
              const dateString = date.dateString;
              const available = isDateAvailable(dateString);
              const isSelected = dateString === selectedDate;
              const isToday = state === "today";
              const isDisabled = state === "disabled";
              const dots = marking?.dots ?? [];
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setSelectedDate(dateString)}
                  disabled={isDisabled}
                  style={styles.dayOuter}
                >
                  <View
                    style={[
                      styles.dayBox,
                      available && !isSelected && styles.dayBoxActive,
                      isSelected && styles.dayBoxSelected,
                      isToday && !isSelected && styles.dayBoxToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isDisabled && styles.dayNumberDisabled,
                        isSelected && styles.dayNumberSelected,
                      ]}
                    >
                      {date.day}
                    </Text>
                    {dots.length > 0 ? (
                      <View style={styles.dayDots}>
                        {dots.slice(0, 4).map((d) => (
                          <View
                            key={d.key}
                            style={[
                              styles.dayDot,
                              {
                                backgroundColor: isSelected
                                  ? neutral[0]
                                  : d.color,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {newRequests.length > 0 && (
            <View style={styles.scheduleSection}>
              <View style={styles.scheduleSectionHeader}>
                <Text style={styles.scheduleSectionTitle}>
                  New Request ({newRequests.length})
                </Text>
              </View>
              <CardGrid gap={16}>
                {newRequests.map((b) => (
                  <BookingRequestCard
                    key={b.id}
                    request={toBookingRequest(b)}
                    onAccept={() => acceptRequest(b.id)}
                  />
                ))}
              </CardGrid>
            </View>
          )}

          <View style={styles.scheduleSection}>
            <View style={styles.scheduleSectionHeader}>
              <Text style={styles.scheduleSectionTitle}>
                Bookings ({confirmedBookings.length})
              </Text>
            </View>
            {confirmedBookings.length > 0 ? (
              <CardGrid>
                {confirmedBookings.map((b, idx) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    dotColor={
                      BOOKING_DOT_COLORS[idx % BOOKING_DOT_COLORS.length]
                    }
                  />
                ))}
              </CardGrid>
            ) : (
              <View style={styles.bookingEmpty}>
                <ExpoImage
                  source={require("@/assets/global-icons/coffee-cup.png")}
                  style={styles.bookingEmptyIcon}
                  contentFit="contain"
                />
                <Text style={styles.bookingEmptyText}>
                  You are free for the day. Enjoy your time off!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <>
          <TabBar tabs={LIST_TABS} activeKey={listTab} onChange={setListTab} />
          {listTab === "all" && (
            <FilterButton
              onPress={() => setFilterVisible(true)}
              active={activeStatusCount > 0}
              accessibilityLabel="Filter bookings by status"
            />
          )}
          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.listContent, contentWidthStyle]}
            showsVerticalScrollIndicator={false}
          >
            {listBookings.length > 0 ? (
              listTab === "new" ? (
                <CardGrid gap={16}>
                  {listBookings.map((b) => (
                    <BookingRequestCard
                      key={b.id}
                      request={toBookingRequest(b)}
                      onAccept={() => acceptRequest(b.id)}
                    />
                  ))}
                </CardGrid>
              ) : (
                <CardGrid>
                  {listBookings.map((b, idx) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      dotColor={
                        BOOKING_DOT_COLORS[idx % BOOKING_DOT_COLORS.length]
                      }
                    />
                  ))}
                </CardGrid>
              )
            ) : (
              <View style={styles.bookingEmpty}>
                <ExpoImage
                  source={require("@/assets/global-icons/coffee-cup.png")}
                  style={styles.bookingEmptyIcon}
                  contentFit="contain"
                />
                <Text style={styles.bookingEmptyText}>
                  {LIST_EMPTY_TEXT[listTab]}
                </Text>
              </View>
            )}
          </ScrollView>
        </>
      )}

      <FilterBottomSheet
        visible={filterVisible}
        title="Filter bookings"
        sections={STATUS_FILTER_SECTIONS}
        initialValue={statusFilter}
        onClose={() => setFilterVisible(false)}
        onApply={setStatusFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  loader: {
    flex: 1,
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
  scheduleSection: {
    marginTop: 16,
    gap: 10,
  },
  scheduleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  scheduleSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  bookingEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 12,
  },
  bookingEmptyIcon: {
    width: 80,
    height: 80,
  },
  bookingEmptyText: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
    textAlign: "center",
  },
  dayOuter: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBox: {
    width: 40,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 3,
    gap: 2,
  },
  dayDots: {
    flexDirection: "row",
    gap: 2,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayBoxActive: {
    backgroundColor: primary[100],
  },
  dayBoxSelected: {
    backgroundColor: primary[300],
  },
  dayBoxToday: {
    borderWidth: 1,
    borderColor: primary[400],
  },
  dayNumber: {
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
  },
  dayNumberDisabled: {
    color: neutral[200],
  },
  dayNumberSelected: {
    color: neutral[0],
    fontWeight: "600",
  },
});
