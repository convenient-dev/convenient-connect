import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { updateAboutMe } from "@/api/profile";
import { ApiError } from "@/api/client";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { secondary, neutral, text, background, border } = Colors;


export default function AboutMeScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const router = useRouter();
  const { aboutMe: initial } = useLocalSearchParams<{ aboutMe?: string }>();

  const [value, setValue] = useState<string>(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateAboutMe(value.trim());
      router.back();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader title="About Me" />

        <View style={[styles.body, contentWidthStyle]}>
          <TextInput
            style={styles.textArea}
            placeholder="Write a brief introduction about yourself, your experience, and the services you offer."
            multiline
            textAlignVertical="top"
            value={value}
            onChangeText={setValue}
            editable={!saving}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.subtitle}>
            Help clients learn more about you. Please write a general
            introduction, since you may offer different types of services.
          </Text>
        </View>

        <View style={[styles.footer, contentWidthStyle]}>
          <Button
            title="Save"
            variant="secondary"
            size="md"
            loading={saving}
            onPress={handleSave}
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
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  textArea: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
  },
  errorText: {
    fontSize: 13,
    color: secondary[500],
  },
  subtitle: {
    fontSize: 14,
    color: neutral[400],
    letterSpacing: -0.408,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
