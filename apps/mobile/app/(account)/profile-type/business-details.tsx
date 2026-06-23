import { BackButton } from "@/components/BackButton";
import { Colors } from "@/constants/theme";
import {
  BusinessSignupState,
  useBusinessSignup,
} from "@/contexts/BusinessSignupContext";
import { useRouter } from "expo-router";
import React from "react";
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

type FormKey =
  | "businessName"
  | "businessAddress"
  | "city"
  | "state"
  | "zipCode";

interface FieldConfig {
  key: FormKey;
  label: string;
  placeholder: string;
  autoCapitalize?: "none" | "words" | "characters";
  keyboardType?: "default" | "number-pad";
  maxLength?: number;
}

const FIELDS: FieldConfig[] = [
  {
    key: "businessName",
    label: "Business Name",
    placeholder: "Happy Tails Walk Co.",
    autoCapitalize: "words",
  },
  {
    key: "businessAddress",
    label: "Business Address",
    placeholder: "1234 Chipmunk Lane",
    autoCapitalize: "words",
  },
  {
    key: "city",
    label: "City",
    placeholder: "Waterboro",
    autoCapitalize: "words",
  },
  {
    key: "state",
    label: "State",
    placeholder: "ME",
    autoCapitalize: "characters",
    maxLength: 2,
  },
  {
    key: "zipCode",
    label: "Zip code",
    placeholder: "04087",
    keyboardType: "number-pad",
    maxLength: 10,
  },
];

export default function BusinessDetailsScreen() {
  const router = useRouter();
  const { data, update } = useBusinessSignup();

  const allFilled = FIELDS.every((f) => data[f.key].trim().length > 0);

  function setField(key: FormKey, value: string) {
    update({ [key]: value } as Partial<BusinessSignupState>);
  }

  function handleContinue() {
    router.push("/profile-type/verify-business");
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Enter your Business Details</Text>
          <Text style={styles.subtitle}>
            Please provide the following information in order to proceed with
            altering your profile type.
          </Text>

          <View style={styles.fields}>
            {FIELDS.map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>
                  {f.label} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={neutral[400]}
                  value={data[f.key]}
                  onChangeText={(v) => setField(f.key, v)}
                  autoCapitalize={f.autoCapitalize}
                  autoCorrect={false}
                  keyboardType={f.keyboardType}
                  maxLength={f.maxLength}
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !allFilled && styles.continueButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleContinue}
            disabled={!allFilled}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
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
  headerSpacer: { flex: 1 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    letterSpacing: -0.408,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    lineHeight: 20,
    marginTop: 14,
    marginBottom: 24,
  },

  fields: {
    gap: 18,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
  },
  required: {
    color: text.primary,
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

  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  continueButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
