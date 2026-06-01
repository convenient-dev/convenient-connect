import { ScreenHeader } from "@/components/ScreenHeader";
import { API_BASE_URL, useCurrentUser } from "@/constants/session";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, border, overlay } = Colors;


interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
];
const DEFAULT_COUNTRY = COUNTRIES[0];

const LOCAL_PHONE_REGEX = /^[\d\s\-()]+$/;
const INVALID_PHONE_MESSAGE = "Please enter a valid phone number.";

function parseInitial(initial: string | undefined): {
  country: Country;
  local: string;
} {
  if (!initial) return { country: DEFAULT_COUNTRY, local: "" };
  const trimmed = initial.trim();
  if (trimmed.startsWith("+")) {
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    const match = sorted.find((c) => trimmed.startsWith(c.dial));
    if (match) {
      return { country: match, local: trimmed.slice(match.dial.length).trim() };
    }
  }
  return { country: DEFAULT_COUNTRY, local: trimmed };
}

export default function UpdatePhoneScreen() {
  const router = useRouter();
  const { phoneNumber: initial } = useLocalSearchParams<{
    phoneNumber?: string;
  }>();
  const { userId } = useCurrentUser();

  const initialParsed = useMemo(() => parseInitial(initial), [initial]);

  const [country, setCountry] = useState<Country>(initialParsed.country);
  const [phone, setPhone] = useState<string>(initialParsed.local);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [search]);

  function openPicker() {
    setSearch("");
    setPickerVisible(true);
  }

  function closePicker() {
    setPickerVisible(false);
    setSearch("");
  }

  const trimmed = phone.trim();
  const digitCount = trimmed.replace(/\D/g, "").length;
  const phoneError =
    trimmed.length > 0 &&
    (!LOCAL_PHONE_REGEX.test(trimmed) || digitCount < 7 || digitCount > 15)
      ? INVALID_PHONE_MESSAGE
      : null;

  const fullNumber = `${country.dial} ${trimmed}`.trim();
  const initialFull = (initial ?? "").trim();
  const isChanged = fullNumber !== initialFull;
  const canSave = trimmed.length > 0 && !phoneError && isChanged && !saving;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullNumber }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save. Please try again.");
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Update Phone Number" />

        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.codeButton}
                activeOpacity={0.7}
                onPress={openPicker}
                disabled={saving}
              >
                <Text style={styles.codeFlag}>{country.flag}</Text>
                <Text style={styles.codeDial}>{country.dial}</Text>
                <MaterialIcons
                  name="arrow-drop-down"
                  size={20}
                  color={neutral[500]}
                />
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.input,
                  styles.phoneInput,
                  phoneError && styles.inputError,
                ]}
                placeholder="(555) 123-4567"
                placeholderTextColor={neutral[400]}
                value={phone}
                onChangeText={setPhone}
                editable={!saving}
                autoCorrect={false}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>
            {phoneError && <Text style={styles.fieldError}>{phoneError}</Text>}
          </View>
          <Text style={styles.subtitle}>
            A verification code will be sent to this number.
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <Text style={styles.saveButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.sheetOverlay} onPress={closePicker}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Select country</Text>
              <View style={styles.searchWrap}>
                <MaterialIcons
                  name="search"
                  size={18}
                  color={neutral[400]}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search country"
                  placeholderTextColor={neutral[400]}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch("")}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={neutral[400]}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                style={styles.sheetList}
                ItemSeparatorComponent={() => (
                  <View style={styles.pickerDivider} />
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No countries found</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCountry(item);
                      closePicker();
                    }}
                  >
                    <Text style={styles.pickerFlag}>{item.flag}</Text>
                    <Text style={styles.pickerName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.pickerDial}>{item.dial}</Text>
                  </TouchableOpacity>
                )}
              />
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
  },
  codeFlag: {
    fontSize: 18,
  },
  codeDial: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  phoneInput: {
    flex: 1,
  },
  inputError: {
    borderColor: secondary[500],
  },
  fieldError: {
    fontSize: 12,
    color: secondary[500],
    letterSpacing: -0.408,
  },
  subtitle: {
    fontSize: 14,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  errorText: {
    fontSize: 13,
    color: secondary[500],
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    height: 48,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: overlay.light,
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[200],
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: text.primary,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetList: {
    maxHeight: 400,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    gap: 8,
  },
  searchIcon: {
    marginRight: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    paddingVertical: 0,
  },
  emptyText: {
    textAlign: "center",
    color: neutral[400],
    fontSize: 14,
    paddingVertical: 24,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pickerFlag: {
    fontSize: 22,
  },
  pickerName: {
    flex: 1,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  pickerDial: {
    fontSize: 14,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
    marginHorizontal: 20,
  },
});
