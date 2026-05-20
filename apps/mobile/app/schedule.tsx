import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Colors } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import WheelPicker from "@quidone/react-native-wheel-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, type DateData } from "react-native-calendars";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { primary, secondary, neutral, text, background, border, overlay } =
  Colors;

interface TimeValue {
  hour: number;
  minute: number;
}

const STEP_MINUTES = 30;
const TIME_SLOTS = (() => {
  const slots: { value: number; label: string; time: TimeValue }[] = [];
  for (let i = 0; i < (24 * 60) / STEP_MINUTES; i++) {
    const minutes = i * STEP_MINUTES;
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const period = hour24 < 12 ? "AM" : "PM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    slots.push({
      value: i,
      label: `${hour12}:${minute === 0 ? "00" : "30"} ${period}`,
      time: { hour: hour24, minute },
    });
  }
  return slots;
})();

function timeToSlotIndex(v: TimeValue): number {
  const i = TIME_SLOTS.findIndex(
    (s) => s.time.hour === v.hour && s.time.minute === v.minute,
  );
  return i >= 0 ? i : 0;
}

function formatRange(start: TimeValue, end: TimeValue): string {
  return `${TIME_SLOTS[timeToSlotIndex(start)].label} - ${TIME_SLOTS[timeToSlotIndex(end)].label}`;
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";
const USER_ID = 1;

type DayKey = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
const DAYS: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Tab = "days" | "modify";

type HourRange = { id: string; start: TimeValue; end: TimeValue };

const DEFAULT_START: TimeValue = { hour: 9, minute: 0 };
const DEFAULT_END: TimeValue = { hour: 17, minute: 0 };

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

function parseHHmm(s: string): TimeValue {
  const [h, m] = s.split(":").map(Number);
  return { hour: h, minute: m };
}

function formatHHmm(v: TimeValue): string {
  return `${String(v.hour).padStart(2, "0")}:${String(v.minute).padStart(2, "0")}`;
}

function formatOverrideDate(iso: string): string {
  const localIso = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;
  return new Date(localIso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

function parseAnyTime(s: string): TimeValue {
  if (s.includes("T")) {
    const d = new Date(s);
    return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
  }
  return parseHHmm(s);
}

export default function ScheduleScreen() {
  const router = useRouter();

  const [available, setAvailable] = useState(true);
  const [tab, setTab] = useState<Tab>("days");
  const [selectedDays, setSelectedDays] = useState<Set<DayKey>>(new Set());
  const [sameHours, setSameHours] = useState(true);
  const [hourRanges, setHourRanges] = useState<HourRange[]>([
    { id: "0", start: DEFAULT_START, end: DEFAULT_END },
  ]);
  const [dayRanges, setDayRanges] = useState<Record<DayKey, HourRange[]>>(
    () => {
      const obj = {} as Record<DayKey, HourRange[]>;
      for (const d of DAYS) obj[d] = [];
      return obj;
    },
  );
  const [editing, setEditing] = useState<{
    day: DayKey | null;
    date?: string;
    id: string;
  } | null>(null);
  const [overrideDays, setOverrideDays] = useState<OverrideDay[]>([]);
  const [overrideRangesByDate, setOverrideRangesByDate] = useState<
    Record<string, HourRange[]>
  >({});
  const [lastOverrideDate, setLastOverrideDate] = useState<string | null>(null);
  const [selectedModifyDate, setSelectedModifyDate] =
    useState<string>(todayKey());
  const [visibleMonth, setVisibleMonth] = useState<string>(() =>
    todayKey().slice(0, 7),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    "Your weekly availability has been updated.",
  );
  const [confirmOffVisible, setConfirmOffVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetch(`${API_BASE_URL}/users/${USER_ID}/availability`)
        .then((res) => res.json())
        .then((data: AvailabilityResponse) => {
          setAvailable(data.availabilityEnabled);

          const days = new Set<DayKey>();
          const map: Record<DayKey, HourRange[]> = {} as Record<
            DayKey,
            HourRange[]
          >;
          for (const d of DAYS) map[d] = [];
          for (const slot of data.weeklyAvailabilitySlots) {
            const key = DAYS[slot.dayOfWeek];
            if (!key) continue;
            days.add(key);
            map[key].push({
              id: `${key}-${slot.id}`,
              start: parseHHmm(slot.startTime),
              end: parseHHmm(slot.endTime),
            });
          }
          setSelectedDays(days);
          setDayRanges(map);

          const seen = new Set<string>();
          const ranges: HourRange[] = [];
          for (const slot of data.weeklyAvailabilitySlots) {
            const key = `${slot.startTime}-${slot.endTime}`;
            if (seen.has(key)) continue;
            seen.add(key);
            ranges.push({
              id: String(slot.id),
              start: parseHHmm(slot.startTime),
              end: parseHHmm(slot.endTime),
            });
          }
          setHourRanges(
            ranges.length > 0
              ? ranges
              : [{ id: "0", start: DEFAULT_START, end: DEFAULT_END }],
          );

          // Same hours when every selected day shares an identical range set.
          const sel = Array.from(days);
          let same = true;
          if (sel.length > 1) {
            const sig = (rs: HourRange[]) =>
              rs
                .map((r) => `${formatHHmm(r.start)}-${formatHHmm(r.end)}`)
                .sort()
                .join("|");
            const first = sig(map[sel[0]]);
            for (let i = 1; i < sel.length; i++) {
              if (sig(map[sel[i]]) !== first) {
                same = false;
                break;
              }
            }
          }
          setSameHours(same);

          setOverrideDays(data.availabilityOverrideDays ?? []);

          const overrideMap: Record<string, HourRange[]> = {};
          for (const od of data.availabilityOverrideDays ?? []) {
            if (!od.isAvailable) continue;
            overrideMap[toDateKey(od.date)] = od.slots.map((s) => ({
              id: `od-${od.id}-${s.id}`,
              start: parseAnyTime(s.startTime),
              end: parseAnyTime(s.endTime),
            }));
          }
          setOverrideRangesByDate(overrideMap);
        })
        .catch(() => {
          setSelectedDays(new Set());
          setOverrideDays([]);
          setOverrideRangesByDate({});
        })
        .finally(() => setLoading(false));
    }, []),
  );

  function toggleDay(day: DayKey) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
        if (!sameHours) seedDayRanges(day);
      }
      return next;
    });
  }

  function seedDayRanges(day: DayKey) {
    setDayRanges((prev) => {
      if ((prev[day] ?? []).length > 0) return prev;
      return {
        ...prev,
        [day]: hourRanges.map((r, i) => ({
          id: `${day}-seed-${i}-${Date.now()}`,
          start: r.start,
          end: r.end,
        })),
      };
    });
  }

  function handleSameHoursChange(value: boolean) {
    if (!value) {
      // Seed each selected day from the shared hours, but preserve any
      // existing per-day edits the user has already made.
      setDayRanges((prev) => {
        const next = { ...prev };
        for (const day of selectedDays) {
          if (!next[day] || next[day].length === 0) {
            next[day] = hourRanges.map((r, i) => ({
              id: `${day}-seed-${i}-${Date.now()}`,
              start: r.start,
              end: r.end,
            }));
          }
        }
        return next;
      });
    }
    setSameHours(value);
  }

  function addRange(day: DayKey | null) {
    setEditing({ day, id: `new-${Date.now()}` });
  }

  function removeRange(day: DayKey | null, id: string) {
    if (day !== null) {
      const ranges = dayRanges[day] ?? [];
      if (ranges.length === 1 && ranges[0].id === id) {
        setSelectedDays((prev) => {
          const next = new Set(prev);
          next.delete(day);
          return next;
        });
        setDayRanges((prev) => ({ ...prev, [day]: [] }));
        return;
      }
    }
    updateRanges(day, (prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== id),
    );
  }

  function addOverrideRange(dateKey: string) {
    setEditing({ day: null, date: dateKey, id: `new-${Date.now()}` });
  }

  function removeOverrideRange(dateKey: string, id: string) {
    modifyOverrideRanges(dateKey, (prev) =>
      prev.length === 0 ? prev : prev.filter((r) => r.id !== id),
    );
    setLastOverrideDate(dateKey);
  }

  function modifyOverrideRanges(
    dateKey: string,
    updater: (prev: HourRange[]) => HourRange[],
  ) {
    setOverrideRangesByDate((prev) => {
      const current = prev[dateKey] ?? weeklyRangesForDate(dateKey);
      return { ...prev, [dateKey]: updater(current) };
    });
  }

  function saveEditing(start: TimeValue, end: TimeValue) {
    if (editing === null) return;
    const { day, date, id } = editing;
    const apply = (prev: HourRange[]) => {
      const exists = prev.some((r) => r.id === id);
      if (exists)
        return prev.map((r) => (r.id === id ? { ...r, start, end } : r));
      return [...prev, { id, start, end }];
    };
    if (date) {
      modifyOverrideRanges(date, apply);
      setLastOverrideDate(date);
    } else {
      updateRanges(day, apply);
    }
    setEditing(null);
  }

  function updateRanges(
    day: DayKey | null,
    updater: (prev: HourRange[]) => HourRange[],
  ) {
    if (day === null) {
      setHourRanges(updater);
    } else {
      setDayRanges((prev) => ({ ...prev, [day]: updater(prev[day] ?? []) }));
    }
  }

  function weeklyRangesForDate(dateKey: string): HourRange[] {
    const dow = new Date(`${dateKey}T00:00:00`).getDay();
    const dayKey = DAYS[dow];
    if (!selectedDays.has(dayKey)) return [];
    const base = sameHours ? hourRanges : (dayRanges[dayKey] ?? []);
    return base.map((r, i) => ({
      id: `${dateKey}-w-${i}`,
      start: r.start,
      end: r.end,
    }));
  }

  async function handleSave() {
    const slots: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }[] = [];
    for (const day of selectedDays) {
      const dayOfWeek = DAYS.indexOf(day);
      if (dayOfWeek < 0) continue;
      const ranges = sameHours ? hourRanges : (dayRanges[day] ?? []);
      for (const range of ranges) {
        slots.push({
          dayOfWeek,
          startTime: formatHHmm(range.start),
          endTime: formatHHmm(range.end),
        });
      }
    }

    const overrides: {
      date: string;
      isAvailable: boolean;
      slots: { startTime: string; endTime: string }[];
    }[] = [];
    const explicitOverrideDates = new Set<string>();
    for (const [date, ranges] of Object.entries(overrideRangesByDate)) {
      explicitOverrideDates.add(date);
      overrides.push({
        date,
        isAvailable: ranges.length > 0,
        slots: ranges.map((r) => ({
          startTime: formatHHmm(r.start),
          endTime: formatHHmm(r.end),
        })),
      });
    }
    // Preserve any pre-loaded unavailable overrides the user didn't touch.
    for (const od of overrideDays) {
      if (od.isAvailable) continue;
      const key = toDateKey(od.date);
      if (explicitOverrideDates.has(key)) continue;
      overrides.push({ date: key, isAvailable: false, slots: [] });
    }

    setSaving(true);
    try {
      const weeklyRes = await fetch(
        `${API_BASE_URL}/users/${USER_ID}/availability/weekly`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots }),
        },
      );
      if (!weeklyRes.ok) {
        const data = await weeklyRes.json().catch(() => ({}));
        Alert.alert(
          "Couldn't save",
          data?.error ?? "Failed to save. Please try again.",
        );
        return;
      }

      const overrideRes = await fetch(
        `${API_BASE_URL}/users/${USER_ID}/availability/overrides`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overrides }),
        },
      );
      if (!overrideRes.ok) {
        const data = await overrideRes.json().catch(() => ({}));
        Alert.alert(
          "Couldn't save",
          data?.error ?? "Failed to save overrides. Please try again.",
        );
        return;
      }

      const latest =
        (lastOverrideDate &&
          overrides.find((o) => o.date === lastOverrideDate)) ||
        null;
      if (!latest) {
        setSuccessMessage("Your weekly availability has been updated.");
      } else if (!latest.isAvailable) {
        setSuccessMessage(
          `Marked ${formatOverrideDate(latest.date)} as unavailable.`,
        );
      } else {
        const n = latest.slots.length;
        setSuccessMessage(
          `Updated ${formatOverrideDate(latest.date)} with ${n} ${n === 1 ? "slot" : "slots"}.`,
        );
      }
      setSuccessVisible(true);
    } finally {
      setSaving(false);
    }
  }

  function handleSuccessConfirm() {
    setSuccessVisible(false);
  }

  function handleAvailableChange(value: boolean) {
    if (!value) {
      setConfirmOffVisible(true);
    } else {
      setAvailable(true);
    }
  }

  async function confirmTurnOff() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/users/${USER_ID}/availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availabilityEnabled: false }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert(
          "Couldn't update",
          data?.error ?? "Failed to update. Please try again.",
        );
        return;
      }
      setAvailable(false);
    } finally {
      setConfirmOffVisible(false);
    }
  }

  function cancelTurnOff() {
    setConfirmOffVisible(false);
  }

  const editingList = editing?.date
    ? (overrideRangesByDate[editing.date] ?? weeklyRangesForDate(editing.date))
    : editing?.day != null
      ? (dayRanges[editing.day] ?? [])
      : hourRanges;
  const editingRange = editingList.find((r) => r.id === editing?.id);
  const otherRanges = useMemo(
    () =>
      editingList
        .filter((r) => r.id !== editing?.id)
        .map((r) => ({ start: r.start, end: r.end })),
    [editingList, editing?.id],
  );

  const headerTitle = useMemo(() => "When are you available?", []);

  const overridesByDate = useMemo(() => {
    const map: Record<string, OverrideDay> = {};
    for (const d of overrideDays) map[toDateKey(d.date)] = d;
    return map;
  }, [overrideDays]);

  type DateAvailability = {
    isAvailable: boolean;
    isOverride: boolean;
    slots: { id: string; label: string }[];
  };

  const getDateAvailability = useCallback(
    (dateKey: string): DateAvailability => {
      const overrideRanges = overrideRangesByDate[dateKey];
      if (overrideRanges) {
        return {
          isAvailable: overrideRanges.length > 0,
          isOverride: true,
          slots: overrideRanges.map((r) => ({
            id: r.id,
            label: formatRange(r.start, r.end),
          })),
        };
      }
      const override = overridesByDate[dateKey];
      if (override && !override.isAvailable) {
        return { isAvailable: false, isOverride: true, slots: [] };
      }
      const dow = new Date(`${dateKey}T00:00:00`).getDay();
      const dayKey = DAYS[dow];
      if (!selectedDays.has(dayKey)) {
        return { isAvailable: false, isOverride: false, slots: [] };
      }
      const ranges = sameHours ? hourRanges : (dayRanges[dayKey] ?? []);
      return {
        isAvailable: ranges.length > 0,
        isOverride: false,
        slots: ranges.map((r) => ({
          id: r.id,
          label: formatRange(r.start, r.end),
        })),
      };
    },
    [
      overrideRangesByDate,
      overridesByDate,
      selectedDays,
      sameHours,
      hourRanges,
      dayRanges,
    ],
  );

  const modifyMarkedDates = useMemo(() => {
    const marked: Record<
      string,
      {
        selected?: boolean;
        selectedColor?: string;
        dots?: { key: string; color: string }[];
      }
    > = {};
    const [y, m] = visibleMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const info = getDateAvailability(key);
      const dots: { key: string; color: string }[] = [];
      if (info.isOverride) {
        dots.push({
          key: "override",
          color: info.isAvailable ? secondary[500] : neutral[400],
        });
      } else if (info.isAvailable) {
        dots.push({ key: "weekly", color: primary[400] });
      }
      if (dots.length > 0) marked[key] = { dots };
    }
    marked[selectedModifyDate] = {
      ...(marked[selectedModifyDate] ?? {}),
      selected: true,
      selectedColor: primary[300],
    };
    return marked;
  }, [visibleMonth, getDateAvailability, selectedModifyDate]);

  const selectedDateRanges =
    overrideRangesByDate[selectedModifyDate] ??
    weeklyRangesForDate(selectedModifyDate);
  const selectedIsExplicitlyUnavailable =
    !!overridesByDate[selectedModifyDate] &&
    !overridesByDate[selectedModifyDate].isAvailable &&
    !overrideRangesByDate[selectedModifyDate];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={headerTitle} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={primary[400]}
          style={styles.loader}
        />
      ) : (
        <View style={styles.body}>
          <View style={styles.availableCard}>
            <View style={styles.availableTextWrap}>
              <Text style={styles.availableTitle}>I&apos;m Available</Text>
              <Text style={styles.availableSubtitle}>
                Once turned off, your services will be hidden from the public.
              </Text>
            </View>
            <Switch
              value={available}
              onValueChange={handleAvailableChange}
              trackColor={{ false: neutral[200], true: secondary[500] }}
              thumbColor={neutral[0]}
              ios_backgroundColor={neutral[200]}
            />
          </View>

          <View style={[styles.disableable, !available && styles.disabled]}>
          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segment, tab === "days" && styles.segmentActive]}
              activeOpacity={0.85}
              onPress={() => setTab("days")}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "days" && styles.segmentTextActive,
                ]}
              >
                Days & Hours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, tab === "modify" && styles.segmentActive]}
              activeOpacity={0.85}
              onPress={() => setTab("modify")}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "modify" && styles.segmentTextActive,
                ]}
              >
                Modify
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "days" ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.daysRow}>
                {DAYS.map((day) => {
                  const active = selectedDays.has(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCircle,
                        active && styles.dayCircleActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleDay(day)}
                    >
                      <Text
                        style={[styles.dayText, active && styles.dayTextActive]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Use same hours for all days</Text>
                <Switch
                  value={sameHours}
                  onValueChange={handleSameHoursChange}
                  trackColor={{ false: neutral[200], true: primary[400] }}
                  thumbColor={neutral[0]}
                  ios_backgroundColor={neutral[200]}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.timezoneRow}>
                <Text style={styles.timezoneLabel}>Eastern Time (EST)</Text>
                <TouchableOpacity hitSlop={8} activeOpacity={0.7}>
                  <Feather name="edit-2" size={16} color={primary[400]} />
                </TouchableOpacity>
              </View>

              <View style={styles.hoursSection}>
                {sameHours
                  ? hourRanges.map((range, idx) => (
                      <View key={range.id} style={styles.hoursRow}>
                        {idx === 0 ? (
                          <Text style={styles.hoursLabel}>Hours</Text>
                        ) : (
                          <View style={styles.hoursLabelSpacer} />
                        )}
                        <TouchableOpacity
                          style={styles.hoursInput}
                          activeOpacity={0.85}
                          onPress={() =>
                            setEditing({ day: null, id: range.id })
                          }
                        >
                          <Text style={styles.hoursInputText}>
                            {formatRange(range.start, range.end)}
                          </Text>
                        </TouchableOpacity>
                        {idx === 0 ? (
                          <TouchableOpacity
                            hitSlop={8}
                            activeOpacity={0.7}
                            onPress={() => addRange(null)}
                          >
                            <Feather
                              name="plus-circle"
                              size={22}
                              color={primary[400]}
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.iconSpacer} />
                        )}
                        <TouchableOpacity
                          hitSlop={8}
                          activeOpacity={0.7}
                          onPress={() => removeRange(null, range.id)}
                        >
                          <Feather
                            name="trash-2"
                            size={20}
                            color={secondary[500]}
                          />
                        </TouchableOpacity>
                      </View>
                    ))
                  : DAYS.filter((d) => selectedDays.has(d)).map((day) => {
                      const ranges = dayRanges[day] ?? [];
                      return (
                        <View key={day} style={styles.dayHoursBlock}>
                          {ranges.map((range, idx) => (
                            <View key={range.id} style={styles.hoursRow}>
                              {idx === 0 ? (
                                <Text style={styles.hoursLabel}>{day}</Text>
                              ) : (
                                <View style={styles.hoursLabelSpacer} />
                              )}
                              <TouchableOpacity
                                style={styles.hoursInput}
                                activeOpacity={0.85}
                                onPress={() =>
                                  setEditing({ day, id: range.id })
                                }
                              >
                                <Text style={styles.hoursInputText}>
                                  {formatRange(range.start, range.end)}
                                </Text>
                              </TouchableOpacity>
                              {idx === 0 ? (
                                <TouchableOpacity
                                  hitSlop={8}
                                  activeOpacity={0.7}
                                  onPress={() => addRange(day)}
                                >
                                  <Feather
                                    name="plus-circle"
                                    size={22}
                                    color={primary[400]}
                                  />
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.iconSpacer} />
                              )}
                              <TouchableOpacity
                                hitSlop={8}
                                activeOpacity={0.7}
                                onPress={() => removeRange(day, range.id)}
                              >
                                <Feather
                                  name="trash-2"
                                  size={20}
                                  color={secondary[500]}
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      );
                    })}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.modifyList}
              showsVerticalScrollIndicator={false}
            >
              <Calendar
                initialDate={selectedModifyDate}
                current={selectedModifyDate}
                onDayPress={(day: DateData) =>
                  setSelectedModifyDate(day.dateString)
                }
                onMonthChange={(m: DateData) =>
                  setVisibleMonth(m.dateString.slice(0, 7))
                }
                markedDates={modifyMarkedDates}
                markingType="dot"
                enableSwipeMonths
                hideExtraDays
                firstDay={0}
                renderArrow={(direction: "left" | "right") => (
                  <MaterialIcons
                    name={
                      direction === "left" ? "chevron-left" : "chevron-right"
                    }
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
                  if (!date) return null;
                  const dateString = date.dateString;
                  const info = getDateAvailability(dateString);
                  const hasSlots = info.slots.length > 0;
                  const isSelected = dateString === selectedModifyDate;
                  const isToday = state === "today";
                  const isDisabled = state === "disabled";
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setSelectedModifyDate(dateString)}
                      disabled={isDisabled}
                      style={styles.dayOuter}
                    >
                      <View
                        style={[
                          styles.dayBox,
                          hasSlots && !isSelected && styles.dayBoxActive,
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
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={styles.selectedDaySection}>
                <View style={styles.overrideHeader}>
                  <Text style={styles.overrideDate}>
                    {formatOverrideDate(selectedModifyDate)}
                  </Text>
                  <Text
                    style={[
                      styles.overrideStatus,
                      selectedDateRanges.length > 0
                        ? styles.overrideAvailable
                        : styles.overrideUnavailable,
                    ]}
                  >
                    {selectedDateRanges.length}{" "}
                    {selectedDateRanges.length === 1 ? "slot" : "slots"}
                  </Text>
                </View>

                <View style={styles.hoursSection}>
                  {selectedDateRanges.map((range, idx) => (
                    <View key={range.id} style={styles.hoursRow}>
                      {idx === 0 ? (
                        <Text style={styles.hoursLabel}>Hours</Text>
                      ) : (
                        <View style={styles.hoursLabelSpacer} />
                      )}
                      <TouchableOpacity
                        style={styles.hoursInput}
                        activeOpacity={0.85}
                        onPress={() =>
                          setEditing({
                            day: null,
                            date: selectedModifyDate,
                            id: range.id,
                          })
                        }
                      >
                        <Text style={styles.hoursInputText}>
                          {formatRange(range.start, range.end)}
                        </Text>
                      </TouchableOpacity>
                      {idx === 0 ? (
                        <TouchableOpacity
                          hitSlop={8}
                          activeOpacity={0.7}
                          onPress={() => addOverrideRange(selectedModifyDate)}
                        >
                          <Feather
                            name="plus-circle"
                            size={22}
                            color={primary[400]}
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.iconSpacer} />
                      )}
                      <TouchableOpacity
                        hitSlop={8}
                        activeOpacity={0.7}
                        onPress={() =>
                          removeOverrideRange(selectedModifyDate, range.id)
                        }
                      >
                        <Feather
                          name="trash-2"
                          size={20}
                          color={secondary[500]}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {selectedDateRanges.length === 0 && (
                    <View style={styles.hoursRow}>
                      <Text style={styles.hoursLabel}>Hours</Text>
                      <TouchableOpacity
                        style={styles.hoursInput}
                        activeOpacity={0.85}
                        onPress={() => addOverrideRange(selectedModifyDate)}
                      >
                        <Text
                          style={[styles.hoursInputText, styles.hoursInputEmpty]}
                        >
                          {selectedIsExplicitlyUnavailable
                            ? "Marked unavailable — tap to add"
                            : "No hours — tap to add"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        hitSlop={8}
                        activeOpacity={0.7}
                        onPress={() => addOverrideRange(selectedModifyDate)}
                      >
                        <Feather
                          name="plus-circle"
                          size={22}
                          color={primary[400]}
                        />
                      </TouchableOpacity>
                      <View style={styles.iconSpacer} />
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
          </View>
        </View>
      )}

      {available && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelButton]}
            activeOpacity={0.85}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.footerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.saveButton,
              saving && styles.saveButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <Text style={styles.footerButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TimeRangePickerModal
        visible={editing !== null}
        initialStart={editingRange?.start ?? DEFAULT_START}
        initialEnd={editingRange?.end ?? DEFAULT_END}
        excludeRanges={otherRanges}
        onCancel={() => setEditing(null)}
        onSave={saveEditing}
      />

      <ConfirmModal
        visible={successVisible}
        icon="success"
        title="Success"
        message={successMessage}
        confirmLabel="Done"
        onConfirm={handleSuccessConfirm}
      />

      <ConfirmModal
        visible={confirmOffVisible}
        title="Turn off availability?"
        message="Turning this off will hide your service from customers. Are you sure you want to continue?"
        confirmLabel="Yes, turn off"
        cancelLabel="Cancel"
        onConfirm={confirmTurnOff}
        onCancel={cancelTurnOff}
      />
    </SafeAreaView>
  );
}

interface TimeRangePickerModalProps {
  visible: boolean;
  initialStart: TimeValue;
  initialEnd: TimeValue;
  excludeRanges: { start: TimeValue; end: TimeValue }[];
  onCancel: () => void;
  onSave: (start: TimeValue, end: TimeValue) => void;
}

// Returns disjoint slot-index intervals [p, q) representing free half-hours.
// Existing ranges occupy slot indices [startIdx, endIdx) — the end is exclusive,
// so adjacent ranges (one ending where the next starts) are not merged.
function computeFreeSegments(
  excludeRanges: { start: TimeValue; end: TimeValue }[],
): [number, number][] {
  const sorted = excludeRanges
    .map((r) => [timeToSlotIndex(r.start), timeToSlotIndex(r.end)] as const)
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  const segs: [number, number][] = [];
  let cursor = 0;
  for (const [a, b] of sorted) {
    if (a > cursor) segs.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < TIME_SLOTS.length) segs.push([cursor, TIME_SLOTS.length]);
  return segs;
}

function findSegment(
  segments: [number, number][],
  slot: number,
): [number, number] | undefined {
  return segments.find(([p, q]) => slot >= p && slot < q);
}

function TimeRangePickerModal({
  visible,
  initialStart,
  initialEnd,
  excludeRanges,
  onCancel,
  onSave,
}: TimeRangePickerModalProps) {
  const freeSegments = useMemo(
    () => computeFreeSegments(excludeRanges),
    [excludeRanges],
  );

  // Start-time data: every free slot that has at least one half-hour after it
  // (so an end can be picked). The last slot of the day (23:30) is never a
  // valid start because there's no representable end after it.
  const startData = useMemo(() => {
    const result: typeof TIME_SLOTS = [];
    for (const [p, q] of freeSegments) {
      const maxStart = q < TIME_SLOTS.length ? q - 1 : TIME_SLOTS.length - 2;
      for (let s = p; s <= maxStart; s++) result.push(TIME_SLOTS[s]);
    }
    return result;
  }, [freeSegments]);

  const initialStartIdx = useMemo(() => {
    const i = timeToSlotIndex(initialStart);
    return startData.some((s) => s.value === i)
      ? i
      : (startData[0]?.value ?? 0);
  }, [initialStart, startData]);

  const [startIdx, setStartIdx] = useState(initialStartIdx);

  // End-time data: must lie strictly after start and within the same free
  // segment as start. End can equal the start of the next existing range
  // (adjacent, not overlapping).
  const endData = useMemo(() => {
    const seg = findSegment(freeSegments, startIdx);
    if (!seg) return [];
    const [, q] = seg;
    const maxEnd = q < TIME_SLOTS.length ? q : TIME_SLOTS.length - 1;
    const result: typeof TIME_SLOTS = [];
    for (let e = startIdx + 1; e <= maxEnd; e++) result.push(TIME_SLOTS[e]);
    return result;
  }, [startIdx, freeSegments]);

  const [endIdx, setEndIdx] = useState(() => {
    const i = timeToSlotIndex(initialEnd);
    return i > initialStartIdx ? i : initialStartIdx + 1;
  });

  // Reset to initial values whenever the modal is reopened
  React.useEffect(() => {
    if (visible) setStartIdx(initialStartIdx);
  }, [visible, initialStartIdx]);

  // Clamp end whenever start (or its segment) changes
  React.useEffect(() => {
    if (endData.length === 0) return;
    const stillValid = endData.some((s) => s.value === endIdx);
    if (!stillValid) setEndIdx(endData[0].value);
  }, [endData, endIdx]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.pickerBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.pickerCard}>
          <View style={styles.pickerRow}>
            <View style={styles.pickerCol}>
              <Text style={styles.pickerColTitle}>Start Time</Text>
              <WheelPicker
                data={startData}
                value={startIdx}
                itemHeight={36}
                visibleItemCount={5}
                width="100%"
                overlayItemStyle={styles.wheelOverlayItem}
                itemTextStyle={styles.wheelItemText}
                onValueChanged={({ item }) => setStartIdx(item.value)}
              />
            </View>
            <View style={styles.pickerCol}>
              <Text style={styles.pickerColTitle}>End Time</Text>
              <WheelPicker
                data={endData}
                value={endIdx}
                itemHeight={36}
                visibleItemCount={5}
                width="100%"
                overlayItemStyle={styles.wheelOverlayItem}
                itemTextStyle={styles.wheelItemText}
                onValueChanged={({ item }) => setEndIdx(item.value)}
              />
            </View>
          </View>

          <View style={styles.pickerActions}>
            <TouchableOpacity
              style={[styles.pickerButton, styles.pickerCancelButton]}
              activeOpacity={0.85}
              onPress={onCancel}
            >
              <Text style={styles.pickerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerButton, styles.pickerSaveButton]}
              activeOpacity={0.85}
              disabled={endData.length === 0}
              onPress={() =>
                onSave(TIME_SLOTS[startIdx].time, TIME_SLOTS[endIdx].time)
              }
            >
              <Text style={styles.pickerButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  availableCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: secondary[50],
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  availableTextWrap: {
    flex: 1,
    gap: 2,
  },
  availableTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  availableSubtitle: {
    fontSize: 12,
    color: neutral[500],
    letterSpacing: -0.408,
    lineHeight: 16,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: neutral[50],
    borderRadius: 999,
    padding: 4,
    marginTop: 20,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: primary[300],
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[400],
    letterSpacing: -0.408,
  },
  segmentTextActive: {
    color: neutral[0],
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: neutral[200],
    backgroundColor: background.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: primary[300],
    borderColor: primary[300],
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: neutral[500],
    letterSpacing: -0.408,
  },
  dayTextActive: {
    color: neutral[0],
  },
  divider: {
    height: 1,
    backgroundColor: border.default,
    marginVertical: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  timezoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timezoneLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  hoursSection: {
    marginTop: 18,
    gap: 12,
  },
  dayHoursBlock: {
    gap: 12,
  },
  disableable: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
    pointerEvents: "none",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  hoursLabel: {
    width: 56,
    fontSize: 15,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  hoursLabelSpacer: {
    width: 56,
  },
  hoursInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hoursInputText: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  hoursInputEmpty: {
    color: neutral[400],
    fontWeight: "500",
  },
  iconSpacer: {
    width: 22,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: secondary[500],
  },
  saveButton: {
    backgroundColor: primary[300],
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  loader: {
    flex: 1,
  },
  modifyList: {
    marginTop: 4,
  },
  emptyOverridesText: {
    fontSize: 14,
    color: neutral[500],
    textAlign: "center",
    paddingVertical: 32,
    letterSpacing: -0.408,
  },
  overrideCard: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
    backgroundColor: background.card,
  },
  overrideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overrideDate: {
    fontSize: 14,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  overrideStatus: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.408,
  },
  overrideAvailable: {
    color: primary[400],
  },
  overrideUnavailable: {
    color: secondary[500],
  },
  selectedDaySection: {
    marginTop: 16,
    gap: 12,
  },
  dayOuter: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  pickerBackdrop: {
    flex: 1,
    backgroundColor: overlay.medium,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: background.card,
    borderRadius: 18,
    padding: 20,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerCol: {
    flex: 1,
    alignItems: "center",
  },
  pickerColTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
    marginBottom: 10,
  },
  wheelOverlayItem: {
    backgroundColor: neutral[50],
    borderRadius: 8,
  },
  wheelItemText: {
    fontSize: 16,
    color: text.primary,
    letterSpacing: -0.408,
  },
  pickerActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  pickerButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCancelButton: {
    backgroundColor: secondary[500],
  },
  pickerSaveButton: {
    backgroundColor: primary[300],
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
