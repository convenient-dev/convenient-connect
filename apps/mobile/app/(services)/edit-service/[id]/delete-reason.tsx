import { ApiError } from "@/api/client";
import {
  deleteService,
  listDeleteReasons,
  type ServiceDeleteReason,
} from "@/api/service-management";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { contentWidthStyle, useResponsivePadding } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

const { neutral, secondary, brand, background, border, primary } = Colors;

// Bounds for other_reason from ServiceDeleteRequest in api-doc.json.
const OTHER_REASON_MIN = 3;
const OTHER_REASON_MAX = 500;

export default function DeleteServiceReasonScreen() {
  const { screenPaddingStyle } = useResponsivePadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reasons, setReasons] = useState<ServiceDeleteReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [otherText, setOtherText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReasons = useCallback(async () => {
    setLoadingReasons(true);
    try {
      setReasons(await listDeleteReasons());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't load deletion reasons. Please try again.",
      );
    } finally {
      setLoadingReasons(false);
    }
  }, []);

  useEffect(() => {
    loadReasons();
  }, [loadReasons]);

  const otherSelected = reasons.some(
    (reason) =>
      reason.is_other && reason.id !== undefined && selectedIds.has(reason.id),
  );
  const trimmedOther = otherText.trim();
  const canDelete =
    selectedIds.size > 0 &&
    (!otherSelected || trimmedOther.length >= OTHER_REASON_MIN);

  function toggleReason(reasonId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reasonId)) next.delete(reasonId);
      else next.add(reasonId);
      return next;
    });
  }

  async function handleDelete() {
    if (!id || !canDelete) return;
    setDeleting(true);
    try {
      await deleteService(Number(id), {
        reason_ids: [...selectedIds],
        other_reason: otherSelected ? trimmedOther : undefined,
      });
      router.replace("/(tabs)/services");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to delete. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, screenPaddingStyle]}>
      <ScreenHeader title="Delete Service" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.body, contentWidthStyle]}>
          <Text style={styles.sectionHeading}>Tell us more</Text>

          {loadingReasons ? (
            <ActivityIndicator color={primary[400]} />
          ) : (
            <View style={styles.options}>
              {reasons.map((reason) => {
                if (reason.id === undefined) return null;
                const reasonId = reason.id;
                const isSelected = selectedIds.has(reasonId);
                return (
                  <TouchableOpacity
                    key={reasonId}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => toggleReason(reasonId)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {reason.reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {otherSelected && (
            <TextInput
              style={styles.otherInput}
              placeholder="Tell us what's going on..."
              placeholderTextColor={neutral[300]}
              value={otherText}
              onChangeText={setOtherText}
              maxLength={OTHER_REASON_MAX}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          )}
        </View>

        <View style={[styles.footer, contentWidthStyle]}>
          <Button
            title="Delete this service"
            variant="secondary"
            size="lg"
            disabled={!canDelete}
            loading={deleting}
            onPress={handleDelete}
          />

          <Button
            title="I don't want to delete"
            variant="dark"
            size="lg"
            onPress={() => router.push("/services")}
          />
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={error !== null}
        type="error"
        title="Something went wrong"
        message={error ?? ""}
        confirmLabel="OK"
        onConfirm={() => setError(null)}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: neutral[800],
  },
  headerSpacer: { width: 38 },

  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: brand.secondary,
    textAlign: "center",
  },
  options: {
    gap: 12,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  optionRowSelected: {
    borderColor: brand.secondary,
    backgroundColor: secondary[50],
  },
  optionText: {
    fontSize: 15,
    color: neutral[700],
  },
  optionTextSelected: {
    color: secondary[500],
    fontWeight: "500",
  },
  otherInput: {
    borderWidth: 1,
    borderColor: brand.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: neutral[800],
    minHeight: 100,
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 12,
  },
});
