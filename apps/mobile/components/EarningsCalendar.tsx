import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

const { brand, neutral, text, border, secondary, primary } = Colors;

export type EarningType = "earning" | "pending";

export const TYPE_COLORS: Record<EarningType, string> = {
  earning: "#00b383",
  pending: "#f97316",
};

const TYPE_LABELS: Record<EarningType, string> = {
  earning: "Earning",
  pending: "Pending",
};

const TYPE_ORDER: EarningType[] = ["earning", "pending"];

export interface CalendarEarningItem {
  id: string;
  type: EarningType;
  title: string;
  startDate: string; // MM/DD/YYYY
  endDate: string; // MM/DD/YYYY
  amount: number;
  listingPrice?: number;
  convenientFee?: number;
  feeLabel?: string;
  subtitle?: string;
}

interface EarningsCalendarProps {
  items: CalendarEarningItem[];
}

function toISO(mdy: string): string {
  const [m, d, y] = mdy.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function eachDayISO(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function formatAmount(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatMonthYear(monthIso: string): string {
  const d = new Date(`${monthIso}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function mdyToYmd(mdy: string): string {
  const [m, d, y] = mdy.split("/");
  return `${y}/${m.padStart(2, "0")}/${d.padStart(2, "0")}`;
}

function formatDateRange(start: string, end: string): string {
  return start === end
    ? mdyToYmd(start)
    : `${mdyToYmd(start)} – ${mdyToYmd(end)}`;
}

export function EarningsCalendar({ items }: EarningsCalendarProps) {
  const [selected, setSelected] = useState<string>(todayISO());
  const [visibleMonth, setVisibleMonth] = useState<string>(
    monthKey(todayISO()),
  );

  const { rangeTypesByDay, endDayItems } = useMemo(() => {
    const rangeTypes: Record<string, Set<EarningType>> = {};
    const endItems: Record<string, CalendarEarningItem[]> = {};
    for (const item of items) {
      const days = eachDayISO(toISO(item.startDate), toISO(item.endDate));
      for (const day of days) {
        if (!rangeTypes[day]) rangeTypes[day] = new Set();
        rangeTypes[day].add(item.type);
      }
      const endISO = toISO(item.endDate);
      if (!endItems[endISO]) endItems[endISO] = [];
      endItems[endISO].push(item);
    }
    return { rangeTypesByDay: rangeTypes, endDayItems: endItems };
  }, [items]);

  const dayTotals = useMemo(() => {
    const out: Record<string, { total: number; types: Set<EarningType> }> = {};
    for (const [day, list] of Object.entries(endDayItems)) {
      const total = list.reduce((s, i) => s + i.amount, 0);
      const types = new Set(list.map((i) => i.type));
      out[day] = { total, types };
    }
    return out;
  }, [endDayItems]);

  const markedDates = useMemo(() => {
    const marked: Record<
      string,
      {
        dots?: { key: string; color: string }[];
        selected?: boolean;
        selectedColor?: string;
      }
    > = {};
    for (const [day, types] of Object.entries(rangeTypesByDay)) {
      marked[day] = {
        dots: TYPE_ORDER.filter((t) => types.has(t)).map((t) => ({
          key: t,
          color: TYPE_COLORS[t],
        })),
      };
    }
    marked[selected] = {
      ...(marked[selected] ?? {}),
      selected: true,
      selectedColor: brand.primary,
    };
    return marked;
  }, [rangeTypesByDay, selected]);

  const monthlyTotal = useMemo(() => {
    let sum = 0;
    for (const item of items) {
      if (monthKey(toISO(item.endDate)) === visibleMonth) sum += item.amount;
    }
    return sum;
  }, [items, visibleMonth]);

  const selectedItems = endDayItems[selected] ?? [];

  const presentTypes = useMemo(() => {
    const set = new Set<EarningType>();
    for (const item of items) set.add(item.type);
    return TYPE_ORDER.filter((t) => set.has(t));
  }, [items]);

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        {presentTypes.map((t) => (
          <View key={t} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: TYPE_COLORS[t] }]}
            />
            <Text style={styles.legendLabel}>{TYPE_LABELS[t]}</Text>
          </View>
        ))}
      </View>

      <Calendar
        initialDate={todayISO()}
        onDayPress={(day: DateData) => setSelected(day.dateString)}
        onMonthChange={(m: DateData) =>
          setVisibleMonth(m.dateString.slice(0, 7))
        }
        markedDates={markedDates}
        markingType="multi-dot"
        enableSwipeMonths
        hideExtraDays
        firstDay={0}
        renderHeader={() => (
          <View style={styles.calHeader}>
            <Text style={styles.headerMonth}>
              {formatMonthYear(visibleMonth)}
            </Text>
            <Text style={styles.headerTotal}>
              Total this month{" "}
              <Text style={styles.headerTotalAmount}>
                {formatAmount(monthlyTotal)}
              </Text>
            </Text>
          </View>
        )}
        renderArrow={(direction: "left" | "right") => (
          <MaterialIcons
            name={direction === "left" ? "chevron-left" : "chevron-right"}
            size={26}
            color={text.primary}
          />
        )}
        theme={{
          backgroundColor: "transparent",
          calendarBackground: "transparent",
          textSectionTitleColor: neutral[400],
          dayTextColor: text.primary,
          textDisabledColor: neutral[200],
          textMonthFontWeight: "600",
          textDayHeaderFontSize: 12,
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
            | {
                dots?: { key: string; color: string }[];
                selected?: boolean;
              }
            | undefined;
          if (!date) return null;
          const dateString: string = date.dateString;
          const isSelected = !!marking?.selected;
          const isToday = state === "today";
          const isDisabled = state === "disabled";
          const dots: { key: string; color: string }[] = marking?.dots ?? [];
          const hasActivity = dots.length > 0;
          const totalInfo = dayTotals[dateString];
          const amountColor =
            totalInfo && totalInfo.types.size === 1
              ? TYPE_COLORS[[...totalInfo.types][0]]
              : text.primary;

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelected(dateString)}
              disabled={isDisabled}
              style={styles.dayOuter}
            >
              <View
                style={[
                  styles.dayBox,
                  hasActivity && !isSelected && styles.dayBoxActive,
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
                {totalInfo ? (
                  <Text
                    style={[
                      styles.dayAmount,
                      { color: isSelected ? neutral[0] : amountColor },
                    ]}
                    numberOfLines={1}
                  >
                    {`$${Math.round(totalInfo.total)}`}
                  </Text>
                ) : null}
                {hasActivity ? (
                  <View style={styles.dayDots}>
                    {dots.map((d) => (
                      <View
                        key={d.key}
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor: isSelected ? neutral[0] : d.color,
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

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderTitle}>{formatDayShort(selected)}</Text>
          <Text style={styles.dayHeaderCount}>
            {selectedItems.length}{" "}
            {selectedItems.length === 1 ? "entry" : "entries"}
          </Text>
        </View>

        {selectedItems.length === 0 ? (
          <Text style={styles.empty}>No activity on this day</Text>
        ) : (
          selectedItems.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <TypeBadge type={item.type} />
                  <Text style={styles.cardDates}>
                    {item.subtitle ??
                      formatDateRange(item.startDate, item.endDate)}
                  </Text>
                </View>
                <Text
                  style={[styles.cardAmount, { color: TYPE_COLORS[item.type] }]}
                >
                  {formatAmount(item.amount)}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.listingPrice != null && (
                <Text style={styles.cardListing}>
                  Listing Price: {formatAmount(item.listingPrice)}
                </Text>
              )}
              {item.convenientFee != null && (
                <Text style={styles.cardFee}>
                  {item.feeLabel ?? "Convenient Fee"}:{" "}
                  {formatAmount(item.convenientFee)}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatDayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function TypeBadge({ type }: { type: EarningType }) {
  return (
    <View style={[styles.badge, { backgroundColor: TYPE_COLORS[type] }]}>
      <Text style={styles.badgeText}>{TYPE_LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    fontSize: 13,
    color: text.primary,
    letterSpacing: -0.408,
  },

  calHeader: {
    alignItems: "center",
    gap: 2,
  },
  headerMonth: {
    fontSize: 18,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  headerTotal: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  headerTotalAmount: {
    color: TYPE_COLORS.earning,
    fontWeight: "600",
  },

  dayOuter: {
    width: 44,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  dayBox: {
    width: 42,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 2,
  },
  dayBoxActive: {
    backgroundColor: primary[100],
  },
  dayBoxSelected: {
    backgroundColor: brand.primary,
  },
  dayBoxToday: {
    borderWidth: 1,
    borderColor: brand.primary,
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
  dayAmount: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.408,
  },
  dayDots: {
    flexDirection: "row",
    gap: 3,
    marginTop: 1,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  dayHeaderCount: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
  },

  empty: {
    fontSize: 13,
    color: neutral[400],
    letterSpacing: -0.408,
    paddingVertical: 16,
  },

  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: border.default,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: neutral[0],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardDates: {
    fontSize: 12,
    color: neutral[500],
    letterSpacing: -0.408,
    flexShrink: 1,
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.408,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
    marginTop: 8,
  },
  cardListing: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
    marginTop: 4,
  },
  cardFee: {
    fontSize: 13,
    color: secondary[500],
    letterSpacing: -0.408,
    marginTop: 2,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
