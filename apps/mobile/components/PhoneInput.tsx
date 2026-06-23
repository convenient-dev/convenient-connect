import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import {
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

const { neutral, text, background, border, overlay } = Colors;

export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
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

export const DEFAULT_COUNTRY = COUNTRIES[0];

interface PhoneInputProps {
  country: Country;
  onCountryChange: (country: Country) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneInput({
  country,
  onCountryChange,
  phone,
  onPhoneChange,
  placeholder,
  disabled = false,
}: PhoneInputProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [search]);

  function openPicker() {
    if (disabled) return;
    setSearch("");
    setPickerVisible(true);
  }

  function closePicker() {
    setPickerVisible(false);
    setSearch("");
  }

  return (
    <>
      <View style={styles.phoneRow}>
        <TouchableOpacity
          style={styles.codeButton}
          activeOpacity={0.7}
          onPress={openPicker}
          disabled={disabled}
        >
          <Text style={styles.codeFlag}>{country.flag}</Text>
          <MaterialIcons name="arrow-drop-down" size={22} color={neutral[700]} />
        </TouchableOpacity>
        <TextInput
          style={styles.phoneInput}
          placeholder={placeholder ?? `${country.dial} 222 333 444`}
          placeholderTextColor={neutral[400]}
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
          autoCorrect={false}
          editable={!disabled}
          returnKeyType="done"
        />
      </View>

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
                <MaterialIcons name="search" size={18} color={neutral[400]} />
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
                    <MaterialIcons name="close" size={18} color={neutral[400]} />
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
                      onCountryChange(item);
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
    </>
  );
}

/** Strips spaces/dashes and prefixes the dial code for API submission. */
export function buildFullPhone(country: Country, phone: string): string {
  return `${country.dial}${phone.replace(/[\s-]+/g, "")}`;
}

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  codeButton: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    backgroundColor: neutral[50],
    borderRadius: 12,
  },
  codeFlag: {
    fontSize: 22,
  },
  phoneInput: {
    flex: 1,
    height: 56,
    backgroundColor: neutral[50],
    borderRadius: 12,
    paddingHorizontal: 18,
    fontSize: 17,
    color: text.primary,
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
  sheetList: {
    maxHeight: 400,
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
