import type { ProviderPublishability } from "@/api/service-management";
import { Colors } from "@/constants/theme";
import type { FormTemplate } from "@/services/template";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const { status, neutral } = Colors;

interface Props {
  publishability: ProviderPublishability | null | undefined;
  /** Used to show field labels instead of raw keys. */
  template?: FormTemplate | null;
  title?: string;
}

function labelFor(template: FormTemplate | null | undefined, key: string): string {
  const field = template?.fields.find(
    (f) => f.field_key === key || f.submit_as?.key === key,
  );
  return field?.label ?? key;
}

/**
 * Commercial publishability issues from a GET response (`publishability.issues`),
 * one line per issue. Renders nothing when the listing is publishable.
 */
export function PublishabilityIssues({
  publishability,
  template,
  title = "This listing isn't publishable yet",
}: Props) {
  if (!publishability || publishability.is_publishable) return null;
  const lines = Object.entries(publishability.issues ?? {}).flatMap(([key, issues]) =>
    (issues ?? []).map((issue, index) => ({
      key: `${key}-${index}`,
      text: `${labelFor(template, key)}: ${issue.message}`,
    })),
  );
  if (!lines.length) return null;
  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <Feather name="alert-circle" size={14} color={status.error} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {lines.map((line) => (
        <Text key={line.key} style={styles.line}>
          • {line.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: status.error,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  title: { fontSize: 13, fontWeight: "600", color: status.error },
  line: { fontSize: 12, color: neutral[600], lineHeight: 18 },
});
