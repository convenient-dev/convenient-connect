import React from "react";
import { Text, View } from "react-native";
import { formStyles as s } from "./styles";

interface Props {
  label: string;
  required: boolean;
  helpText?: string | null;
  error?: string;
  children: React.ReactNode;
}

/** Label, help text, control and error message for one form field. */
export function FieldShell({ label, required, helpText, error, children }: Props) {
  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        <Text style={s.label}>
          {label}
          {required ? <Text style={s.required}> *</Text> : null}
        </Text>
      </View>
      {children}
      {helpText ? <Text style={s.helpText}>{helpText}</Text> : null}
      {error ? <Text style={s.inlineError}>{error}</Text> : null}
    </View>
  );
}
