import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  buildFullPhone,
  Country,
  DEFAULT_COUNTRY,
  PhoneInput,
} from "@/components/PhoneInput";
import { Colors } from "@/constants/theme";
import { completeProfile, getAuthUser } from "@/api/profile";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
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

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
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

export default function EnterPersonalDetailsScreen() {
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
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = phone.replace(/\D/g, "").length >= 7;
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    (collectEmail ? emailValid : phoneValid);

  async function handleSubmit() {
    setLoading(true);
    try {
      await completeProfile({
        providerType: "individual",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: collectEmail ? email.trim() : authUser?.user.user_email ?? "",
        phoneNumber: collectEmail ? undefined : buildFullPhone(country, phone),
      });
      getAuthUser().then(setUser).catch(() => {});
      setSuccessMessage(
        collectEmail
          ? "Verification email sent successfully\nPlease check your inbox"
          : "Your details were saved successfully",
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
          <Text style={styles.title}>Enter your personal details</Text>

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
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Next"
            variant="primary"
            size="lg"
            style={{ flex: 1 }}
            loading={loading}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />
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
});
