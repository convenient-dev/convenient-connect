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
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatOverrideTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrideDays, setOverrideDays] = useState<OverrideDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetch(`${API_BASE_URL}/users/${USER_ID}/availability`)
        .then((res) => res.json())
        .then((data: AvailabilityResponse) => {
          setAvailable(data.availabilityEnabled);

          const days = new Set<DayKey>();
          for (const slot of data.weeklyAvailabilitySlots) {
            const key = DAYS[slot.dayOfWeek];
            if (key) days.add(key);
          }
          setSelectedDays(days);

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

          setOverrideDays(data.availabilityOverrideDays ?? []);
        })
        .catch(() => {
          setSelectedDays(new Set());
          setOverrideDays([]);
        })
        .finally(() => setLoading(false));
    }, []),
  );

  function toggleDay(day: DayKey) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function addRange() {
    setHourRanges((prev) => [
      ...prev,
      { id: String(Date.now()), start: DEFAULT_START, end: DEFAULT_END },
    ]);
  }

  function removeRange(id: string) {
    setHourRanges((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== id),
    );
  }

  function saveEditing(start: TimeValue, end: TimeValue) {
    if (editingId === null) return;
    setHourRanges((prev) =>
      prev.map((r) => (r.id === editingId ? { ...r, start, end } : r)),
    );
    setEditingId(null);
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
      for (const range of hourRanges) {
        slots.push({
          dayOfWeek,
          startTime: formatHHmm(range.start),
          endTime: formatHHmm(range.end),
        });
      }
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/users/${USER_ID}/availability/weekly`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert(
          "Couldn't save",
          data?.error ?? "Failed to save. Please try again.",
        );
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const editingRange = hourRanges.find((r) => r.id === editingId);

  const headerTitle = useMemo(() => "When are you available?", []);

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
            onValueChange={setAvailable}
            trackColor={{ false: neutral[200], true: secondary[500] }}
            thumbColor={neutral[0]}
            ios_backgroundColor={neutral[200]}
          />
        </View>

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
                    style={[styles.dayCircle, active && styles.dayCircleActive]}
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
                onValueChange={setSameHours}
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
              {hourRanges.map((range, idx) => (
                <View key={range.id} style={styles.hoursRow}>
                  {idx === 0 ? (
                    <Text style={styles.hoursLabel}>Hours</Text>
                  ) : (
                    <View style={styles.hoursLabelSpacer} />
                  )}
                  <TouchableOpacity
                    style={styles.hoursInput}
                    activeOpacity={0.85}
                    onPress={() => setEditingId(range.id)}
                  >
                    <Text style={styles.hoursInputText}>
                      {formatRange(range.start, range.end)}
                    </Text>
                  </TouchableOpacity>
                  {idx === 0 ? (
                    <TouchableOpacity
                      hitSlop={8}
                      activeOpacity={0.7}
                      onPress={addRange}
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
                    onPress={() => removeRange(range.id)}
                  >
                    <Feather name="trash-2" size={20} color={secondary[500]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.modifyList}
            showsVerticalScrollIndicator={false}
          >
            {overrideDays.length === 0 ? (
              <Text style={styles.emptyOverridesText}>
                No date-specific changes yet.
              </Text>
            ) : (
              overrideDays.map((day) => (
                <View key={day.id} style={styles.overrideCard}>
                  <View style={styles.overrideHeader}>
                    <Text style={styles.overrideDate}>
                      {formatOverrideDate(day.date)}
                    </Text>
                    <Text
                      style={[
                        styles.overrideStatus,
                        day.isAvailable
                          ? styles.overrideAvailable
                          : styles.overrideUnavailable,
                      ]}
                    >
                      {day.isAvailable ? "Available" : "Unavailable"}
                    </Text>
                  </View>
                  {day.isAvailable && day.slots.length > 0 && (
                    <View style={styles.overrideSlots}>
                      {day.slots.map((slot) => (
                        <Text key={slot.id} style={styles.overrideSlotText}>
                          {formatOverrideTime(slot.startTime)} –{" "}
                          {formatOverrideTime(slot.endTime)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
      )}

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

      <TimeRangePickerModal
        visible={editingRange !== undefined}
        initialStart={editingRange?.start ?? DEFAULT_START}
        initialEnd={editingRange?.end ?? DEFAULT_END}
        onCancel={() => setEditingId(null)}
        onSave={saveEditing}
      />
    </SafeAreaView>
  );
}

interface TimeRangePickerModalProps {
  visible: boolean;
  initialStart: TimeValue;
  initialEnd: TimeValue;
  onCancel: () => void;
  onSave: (start: TimeValue, end: TimeValue) => void;
}

function TimeRangePickerModal({
  visible,
  initialStart,
  initialEnd,
  onCancel,
  onSave,
}: TimeRangePickerModalProps) {
  const [startIdx, setStartIdx] = useState(() => timeToSlotIndex(initialStart));
  const [endIdx, setEndIdx] = useState(() => timeToSlotIndex(initialEnd));

  React.useEffect(() => {
    if (visible) {
      setStartIdx(timeToSlotIndex(initialStart));
      setEndIdx(timeToSlotIndex(initialEnd));
    }
  }, [visible, initialStart, initialEnd]);

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
                data={TIME_SLOTS}
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
                data={TIME_SLOTS}
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
  overrideSlots: {
    gap: 4,
  },
  overrideSlotText: {
    fontSize: 13,
    color: neutral[500],
    letterSpacing: -0.408,
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
