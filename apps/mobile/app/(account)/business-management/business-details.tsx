import { getCities, getCountries, getStates } from "@/api/location";
import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchableSelect, SelectOption } from "@/components/SearchableSelect";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  // Businesses can only be registered in the US, so the country is fixed.
  const [selectedCountry, setSelectedCountry] = useState<SelectOption | null>(
    null,
  );
  const [selectedState, setSelectedState] = useState<SelectOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<SelectOption | null>(null);
  const [zip, setZip] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    getCountries("United States")
      .then((countries) => {
        const us =
          countries.find((c) => c.name === "United States") ?? countries[0];
        if (us) setSelectedCountry(us);
      })
      .catch(() => {
        // Leave the country unset; the state select stays disabled and the
        // form can't be submitted without it.
      });
  }, []);

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
        countryName: selectedCountry.name,
        stateId: String(selectedState.id),
        stateName: selectedState.name,
        cityId: String(selectedCity.id),
        cityName: selectedCity.name,
        zipcode: zip.trim(),
        about: about.trim(),
      },
    });
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Business Details" />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentWidthStyle]}
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

          <View style={styles.field}>
            <Text style={styles.label}>
              Country <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyValue}>
                {selectedCountry?.name ?? "United States"}
              </Text>
            </View>
          </View>
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

        <View style={[styles.footer, contentWidthStyle]}>
          <Button
            title="Continue"
            variant="secondary"
            size="lg"
            disabled={!canContinue}
            onPress={handleContinue}
          />
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
  readonlyInput: {
    height: 56,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
    backgroundColor: neutral[50],
  },
  readonlyValue: {
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
});
