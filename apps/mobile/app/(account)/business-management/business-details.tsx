import { getCities, getCountries, getStates } from "@/api/location";
import { BackButton } from "@/components/BackButton";
import { SearchableSelect, SelectOption } from "@/components/SearchableSelect";
import { Colors } from "@/constants/theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, border } = Colors;

function sanitizeZip(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={neutral[400]}
        keyboardType={keyboardType}
        autoCapitalize={multiline ? "sentences" : "words"}
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

export default function BusinessDetailsScreen() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<SelectOption | null>(
    null,
  );
  const [selectedState, setSelectedState] = useState<SelectOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<SelectOption | null>(null);
  const [zip, setZip] = useState("");
  const [about, setAbout] = useState("");

  const loadCountries = useCallback(
    (search: string) => getCountries(search || undefined),
    [],
  );
  const loadStates = useCallback(
    (search: string) =>
      selectedCountry
        ? getStates(selectedCountry.id, search || undefined)
        : Promise.resolve([]),
    [selectedCountry],
  );
  const loadCities = useCallback(
    (search: string) =>
      selectedState
        ? getCities(selectedState.id, search || undefined)
        : Promise.resolve([]),
    [selectedState],
  );

  const canContinue =
    businessName.trim().length > 0 &&
    businessAddress.trim().length > 0 &&
    !!selectedCountry &&
    !!selectedState &&
    !!selectedCity &&
    zip.trim().length > 0 &&
    about.trim().length > 0;

  function handleContinue() {
    if (!selectedCountry || !selectedState || !selectedCity) return;
    router.push({
      pathname: "/business-management/select-services",
      params: {
        flow: "create-business",
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        countryId: String(selectedCountry.id),
        stateId: String(selectedState.id),
        cityId: String(selectedCity.id),
        zipcode: zip.trim(),
        about: about.trim(),
      },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Business Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Please provide the following information in order to proceed.
          </Text>

          <Field
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Happy Tails Walk Co."
          />
          <Field
            label="Business Address"
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="1234 Chipmunk Lane"
          />

          <SearchableSelect
            label="Country"
            required
            placeholder="Select country"
            value={selectedCountry}
            loadOptions={loadCountries}
            onSelect={(option) => {
              setSelectedCountry(option);
              setSelectedState(null);
              setSelectedCity(null);
            }}
          />
          <SearchableSelect
            label="State"
            required
            placeholder="Select state"
            value={selectedState}
            loadOptions={loadStates}
            reloadKey={selectedCountry?.id}
            disabled={!selectedCountry}
            disabledHint="Select a country first"
            onSelect={(option) => {
              setSelectedState(option);
              setSelectedCity(null);
            }}
          />
          <SearchableSelect
            label="City"
            required
            placeholder="Select city"
            value={selectedCity}
            loadOptions={loadCities}
            reloadKey={selectedState?.id}
            disabled={!selectedState}
            disabledHint="Select a state first"
            onSelect={setSelectedCity}
          />

          <Field
            label="Zip code"
            value={zip}
            onChangeText={(value) => setZip(sanitizeZip(value))}
            placeholder="04087"
            keyboardType="number-pad"
          />
          <Field
            label="About"
            value={about}
            onChangeText={setAbout}
            placeholder="Tell customers about your business"
            multiline
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !canContinue && styles.continueDisabled,
            ]}
            activeOpacity={0.85}
            disabled={!canContinue}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.screen,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerSpacer: { width: 40 },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 22,
  },
  subtitle: {
    fontSize: 16,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 22,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  required: {
    color: secondary[400],
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 18,
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },
  inputMultiline: {
    height: 140,
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  continueButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[400],
    alignItems: "center",
    justifyContent: "center",
  },
  continueDisabled: {
    opacity: 0.6,
  },
  continueText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
