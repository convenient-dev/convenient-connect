import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors } from "@/constants/theme";
import { completeProfile } from "@/api/profile";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
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
  const { user: authUser } = useAuth();

  const [firstName, setFirstName] = useState(authUser?.user.user_fname ?? "");
  const [lastName, setLastName] = useState(authUser?.user.user_lname ?? "");
  const [email, setEmail] = useState(authUser?.user.user_email ?? "");
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
          <Field
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
          />
          <Field
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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
            style={[styles.button, styles.nextButton, loading && { opacity: 0.6 }]}
            activeOpacity={0.85}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              try {
                await completeProfile({
                  providerType: "individual",
                  firstName,
                  lastName,
                  email,
                });
                setSuccessMessage(
                  "Verification email sent successfully\nPlease check your inbox",
                );
                setSuccessVisible(true);
              } catch (e) {
                const msg =
                  e instanceof ApiError ? e.message : "Failed to save profile";
                Alert.alert("Error", msg);
              } finally {
                setLoading(false);
              }
            }}
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
