import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import { numberLogin } from "@/api/auth";
import { ApiError } from "@/api/client";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

interface SocialOption {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const SOCIAL_OPTIONS: SocialOption[] = [
  {
    key: "facebook",
    label: "Continue with Facebook",
    icon: <Ionicons name="logo-facebook" size={24} color="#1877F2" />,
  },
  {
    key: "gmail",
    label: "Continue with Gmail",
    icon: <MaterialCommunityIcons name="gmail" size={24} color="#EA4335" />,
  },
  {
    key: "email",
    label: "Continue with Email",
    icon: <MaterialIcons name="mail-outline" size={24} color={neutral[800]} />,
  },
  {
    key: "apple",
    label: "Continue with Apple",
    icon: <Ionicons name="logo-apple" size={24} color={neutral[900]} />,
  },
];

export default function SignupScreen() {
  const router = useRouter();

  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.back()} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Enter your phone number</Text>

          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.codeButton}
              activeOpacity={0.7}
              onPress={openPicker}
            >
              <Text style={styles.codeFlag}>{country.flag}</Text>
              <MaterialIcons
                name="arrow-drop-down"
                size={22}
                color={neutral[700]}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              placeholder={`${country.dial} 222 333 444`}
              placeholderTextColor={neutral[400]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            activeOpacity={0.85}
            disabled={loading || !phone.trim()}
            onPress={async () => {
              const fullPhone = `${country.dial}${phone.replace(/\s+/g, "")}`;
              setLoading(true);
              try {
                await numberLogin({ phone: fullPhone });
                router.push({
                  pathname: "/signup-by-phone",
                  params: { phone: fullPhone },
                });
              } catch (e) {
                const msg =
                  e instanceof ApiError ? e.message : "Failed to send OTP";
                Alert.alert("Error", msg);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <Text style={styles.verifyText}>Verify</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {SOCIAL_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={styles.socialButton}
              activeOpacity={0.7}
              onPress={() => {
                if (option.key === "email") {
                  router.push("/signup-by-email");
                }
                // TODO: Wire facebook, gmail, apple social auth SDKs
              }}
            >
              <View style={styles.socialIcon}>{option.icon}</View>
              <Text style={styles.socialText}>{option.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.accountRow}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <MaterialIcons name="search" size={24} color={neutral[900]} />
            <Text style={styles.accountText}>Already have an account?</Text>
          </TouchableOpacity>

          <Text style={styles.consentText}>
            By proceeding, you consent to receiving phone calls, and messaging
            via SMS, WhatsApp and alternate platforms including by automated
            means from the Convenience App and its affiliates to the phone
            number provided
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPickerModal
        visible={pickerVisible}
        search={search}
        onSearchChange={setSearch}
        countries={filteredCountries}
        onSelect={(c) => {
          setCountry(c);
          closePicker();
        }}
        onClose={closePicker}
      />
    </SafeAreaView>
  );
}

interface PickerProps {
  visible: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  countries: Country[];
  onSelect: (country: Country) => void;
  onClose: () => void;
}

function CountryPickerModal({
  visible,
  search,
  onSearchChange,
  countries,
  onSelect,
  onClose,
}: PickerProps) {
  if (!visible) return null;

  return (
    <Pressable style={styles.sheetOverlay} onPress={onClose}>
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
              onChangeText={onSearchChange}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchChange("")}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <MaterialIcons name="close" size={18} color={neutral[400]} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={countries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={styles.sheetList}
            ItemSeparatorComponent={() => <View style={styles.pickerDivider} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No countries found</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerRow}
                activeOpacity={0.7}
                onPress={() => onSelect(item)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
  verifyButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },
  dividerText: {
    fontSize: 15,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  socialButton: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: neutral[50],
    borderRadius: 999,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  socialIcon: {
    width: 28,
    alignItems: "center",
  },
  socialText: {
    flex: 1,
    textAlign: "center",
    marginRight: 28,
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  accountText: {
    fontSize: 17,
    fontWeight: "500",
    color: text.primary,
    letterSpacing: -0.408,
  },
  consentText: {
    marginTop: 24,
    fontSize: 14,
    lineHeight: 21,
    color: neutral[400],
    textAlign: "center",
    letterSpacing: -0.2,
  },
  sheetOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
