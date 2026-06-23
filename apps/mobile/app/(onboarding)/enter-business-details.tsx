import { ConfirmModal } from "@/components/ConfirmModal";
import {
  buildFullPhone,
  Country,
  DEFAULT_COUNTRY,
  PhoneInput,
} from "@/components/PhoneInput";
import { SearchableSelect, SelectOption } from "@/components/SearchableSelect";
import { Colors } from "@/constants/theme";
import { completeProfile, getAuthUser } from "@/api/profile";
import { getCities, getCountries, getStates } from "@/api/location";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const { secondary, primary, neutral, text, background, border } = Colors;

/**
 * Users sometimes paste a full "STATE ZIP" string (e.g. "TN 38301" or
 * "TN38301") into the zip field. Strip any leading state-code prefix and keep
 * only the trailing digits so we submit a clean 5-digit ZIP.
 */
function sanitizeZip(value: string): string {
  return value.replace(/\D/g, "").slice(0, 5);
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "words" | "characters";
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "words",
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        placeholderTextColor={neutral[400]}
      />
    </View>
  );
}

export default function EnterBusinessDetailsScreen() {
  const router = useRouter();
  const { method = "phone" } = useLocalSearchParams<{
    method?: "phone" | "email";
  }>();
  const { user: authUser, setUser } = useAuth();

  // When the user signed up by phone we collect their email; when they signed
  // up by email we collect their phone instead.
  const collectEmail = method === "phone";

  const [firstName, setFirstName] = useState(authUser?.user.user_fname ?? "");
  const [lastName, setLastName] = useState(authUser?.user.user_lname ?? "");
  const [email, setEmail] = useState(authUser?.user.user_email ?? "");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<SelectOption | null>(
    null,
  );
  const [selectedState, setSelectedState] = useState<SelectOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<SelectOption | null>(null);
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = phone.replace(/\D/g, "").length >= 7;
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    (collectEmail ? emailValid : phoneValid) &&
    businessName.trim().length > 0 &&
    businessAddress.trim().length > 0 &&
    !!selectedCountry &&
    !!selectedState &&
    !!selectedCity &&
    zip.trim().length > 0;

  async function handleSubmit() {
    if (!selectedCountry || !selectedState || !selectedCity) return;
    setLoading(true);
    try {
      await completeProfile({
        providerType: "business",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: collectEmail ? email.trim() : authUser?.user.user_email ?? "",
        phoneNumber: collectEmail ? undefined : buildFullPhone(country, phone),
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        countryId: selectedCountry.id,
        stateId: selectedState.id,
        cityId: selectedCity.id,
        zipcode: zip.trim(),
      });
      getAuthUser().then(setUser).catch(() => {});
      setSuccessMessage(
        collectEmail
          ? "Verification email sent successfully\nPlease check your inbox"
          : "Your account is created successfully",
      );
      setSuccessVisible(true);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to save profile";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Enter your business details</Text>

          <Field
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <Field label="Last Name" value={lastName} onChangeText={setLastName} />

          {collectEmail ? (
            <Field
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <PhoneInput
                country={country}
                onCountryChange={setCountry}
                phone={phone}
                onPhoneChange={setPhone}
              />
            </View>
          )}

          <Field
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
          />
          <Field
            label="Business Address"
            value={businessAddress}
            onChangeText={setBusinessAddress}
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
            keyboardType="number-pad"
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.nextButton,
              (!canSubmit || loading) && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            disabled={!canSubmit || loading}
            onPress={handleSubmit}
          >
            {loading ? (
              <ActivityIndicator color={neutral[0]} />
            ) : (
              <Text style={styles.buttonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={successVisible}
        icon="success"
        title="Success"
        message={successMessage}
        confirmLabel="Okay"
        onConfirm={() => {
          setSuccessVisible(false);
          router.replace("/(tabs)/home");
        }}
      />
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
    paddingTop: 60,
    paddingBottom: 24,
    gap: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.5,
    marginBottom: 6,
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
  footer: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    backgroundColor: secondary[400],
  },
  nextButton: {
    backgroundColor: primary[400],
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
