import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { updateName, getAuthUser } from "@/api/profile";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, border } = Colors;


export default function UpdateNameScreen() {
  const router = useRouter();
  const { firstName: initialFirst, lastName: initialLast } =
    useLocalSearchParams<{ firstName?: string; lastName?: string }>();
  const { setUser } = useAuth();

  const [firstName, setFirstName] = useState<string>(initialFirst ?? "");
  const [lastName, setLastName] = useState<string>(initialLast ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const NAME_REGEX = /^\p{L}+$/u;
  const INVALID_NAME_MESSAGE =
    "Only letters are allowed (no numbers, spaces or special characters).";

  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const firstNameError =
    firstName.length > 0 && !NAME_REGEX.test(firstName)
      ? INVALID_NAME_MESSAGE
      : null;
  const lastNameError =
    lastName.length > 0 && !NAME_REGEX.test(lastName)
      ? INVALID_NAME_MESSAGE
      : null;
  const isChanged =
    trimmedFirst !== (initialFirst ?? "").trim() ||
    trimmedLast !== (initialLast ?? "").trim();
  const canSave =
    trimmedFirst.length > 0 &&
    trimmedLast.length > 0 &&
    !firstNameError &&
    !lastNameError &&
    isChanged &&
    !saving;

  async function submitSave() {
    setSaving(true);
    setError(null);
    try {
      await updateName(firstName.trim(), lastName.trim());
      router.back();
      getAuthUser().then(setUser).catch(() => {});
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    setConfirmVisible(true);
  }

  function handleConfirm() {
    setConfirmVisible(false);
    submitSave();
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="Update Name" />

        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, firstNameError && styles.inputError]}
              placeholder="First name"
              placeholderTextColor={neutral[400]}
              value={firstName}
              onChangeText={setFirstName}
              editable={!saving}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            {firstNameError && (
              <Text style={styles.fieldError}>{firstNameError}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[styles.input, lastNameError && styles.inputError]}
              placeholder="Last name"
              placeholderTextColor={neutral[400]}
              value={lastName}
              onChangeText={setLastName}
              editable={!saving}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
            {lastNameError && (
              <Text style={styles.fieldError}>{lastNameError}</Text>
            )}
          </View>
          <Text style={styles.subtitle}>
            Changing your name means you'll need to verify your ID again.
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
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={confirmVisible}
        title="Are you sure to change your name?"
        message="This will require verify your ID again."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmVisible(false)}
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
});
