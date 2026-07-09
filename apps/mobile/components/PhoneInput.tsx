import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  type CountryCode as LibCountryCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CountryPicker, {
  CountryCode,
  FlagType,
  getAllCountries,
  Country as PickerCountry,
} from "react-native-country-picker-modal";

const { neutral, text } = Colors;

/**
 * App-facing country shape. Kept stable so screens don't depend on the
 * picker library's richer `Country` type. Populated from the library's
 * offline data set (derived from `world-countries`).
 */
export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  code: string;
  name: string;
  /** Calling code with leading "+", e.g. "+1". */
  dial: string;
  /** Emoji flag, e.g. "🇺🇸". */
  flag: string;
}

export const DEFAULT_COUNTRY: Country = {
  code: "US",
  name: "United States",
  dial: "+1",
  flag: "🇺🇸",
};

/**
 * Convert an ISO 3166-1 alpha-2 code (e.g. "US") to its flag emoji by mapping
 * each letter to its Unicode regional-indicator symbol. The picker library's
 * `flag` field is an emoji *shortcode* ("flag-us"), not a glyph, so we derive
 * the glyph ourselves instead.
 */
export function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[A-Z]/g, (ch) =>
      String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65),
    );
}

/** Map the picker library's country object to our app-facing shape. */
export function toCountry(c: PickerCountry): Country {
  const name = typeof c.name === "string" ? c.name : c.name.common;
  return {
    code: c.cca2,
    name,
    dial: `+${c.callingCode[0] ?? ""}`,
    flag: flagEmoji(c.cca2),
  };
}

/** Build an app-facing {@link Country} for an alpha-2 code, sourcing the
 * display name + canonical calling code from the picker's offline data. */
async function countryFromCode(code: string): Promise<Country | null> {
  const match = (await getAllCountries(FlagType.EMOJI)).find(
    (c) => c.cca2 === code,
  );
  return match ? toCountry(match) : null;
}

/**
 * Parse a stored phone string (e.g. "+447911123456") into a country + local
 * number. Uses libphonenumber-js to pin the *exact* territory from the number
 * itself — disambiguating shared calling codes (e.g. +44 → GB vs GG/JE/IM,
 * +1 → US vs CA) by their number prefixes, which a bare dial-code scan cannot.
 * Falls back to {@link DEFAULT_COUNTRY} when the number can't be parsed.
 */
export async function parseInitialPhone(
  initial: string | undefined,
): Promise<{ country: Country; local: string }> {
  const trimmed = (initial ?? "").trim();
  if (!trimmed) return { country: DEFAULT_COUNTRY, local: "" };

  const parsed = parsePhoneNumberFromString(trimmed);
  if (parsed?.country) {
    const country = await countryFromCode(parsed.country);
    if (country) return { country, local: String(parsed.nationalNumber) };
  }

  // Couldn't resolve a territory (unparseable or no leading "+"): keep the
  // default country and surface whatever digits we have for editing.
  return { country: DEFAULT_COUNTRY, local: trimmed };
}

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
  return (
    <View style={styles.phoneRow}>
      {/*
        React 19 ignores defaultProps on function components, so every flag the
        picker relies on (withModal/withEmoji/...) is passed explicitly.
        withEmoji keeps flags offline (no remote image fetch / no svg dep).
      */}
      <CountryPicker
        countryCode={country.code as CountryCode}
        withModal
        withFilter
        withFlag
        withEmoji
        withCallingCode
        withAlphaFilter={false}
        onSelect={(c) => onCountryChange(toCountry(c))}
        modalProps={{ animationType: "slide" }}
        renderFlagButton={({ onOpen }) => (
          <TouchableOpacity
            style={styles.codeButton}
            activeOpacity={0.7}
            onPress={disabled ? undefined : onOpen}
            disabled={disabled}
          >
            <Text style={styles.codeFlag}>{country.flag}</Text>
            <Text style={styles.codeDial}>{country.dial}</Text>
            <MaterialIcons
              name="arrow-drop-down"
              size={22}
              color={neutral[700]}
            />
          </TouchableOpacity>
        )}
      />
      <TextInput
        style={styles.phoneInput}
        placeholder="Enter your phone number"
        placeholderTextColor={neutral[400]}
        value={phone}
        onChangeText={onPhoneChange}
        keyboardType="phone-pad"
        autoCorrect={false}
        editable={!disabled}
        returnKeyType="done"
      />
    </View>
  );
}

/**
 * Normalize the selected country + local number into E.164 (e.g. "+12015550123")
 * for API submission. libphonenumber-js parses the local number against the
 * picked territory, dropping formatting (spaces/dashes/parens) and any national
 * trunk prefix (UK "07911 123456" → "+447911123456"). Falls back to a naive
 * dial-code concatenation when the number can't be parsed, so callers still get
 * a best-effort value for unsupported or partial input.
 */
export function buildFullPhone(country: Country, phone: string): string {
  const parsed = parsePhoneNumberFromString(
    phone,
    country.code as LibCountryCode,
  );
  if (parsed) return parsed.format("E.164");
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
  codeDial: {
    fontSize: 16,
    color: text.primary,
    letterSpacing: -0.408,
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
});
