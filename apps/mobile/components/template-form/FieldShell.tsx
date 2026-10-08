import React from "react";
import { Text, View } from "react-native";
import { HelpTooltip } from "./HelpTooltip";
import { formStyles as s } from "./styles";

interface Props {
  label: string;
  required: boolean;
  /** Shown in a tooltip behind an "i" icon next to the label. */
  helpText?: string | null;
  error?: string;
  /** When both are set, renders `valueLength/maxLength` under the control. */
  maxLength?: number;
  valueLength?: number;
  children: React.ReactNode;
}

/** Label, help tooltip, control, character count and error message for one form field. */
export function FieldShell({
  label,
  required,
  helpText,
  error,
  maxLength,
  valueLength,
  children,
}: Props) {
  const showCount = maxLength !== undefined && valueLength !== undefined;
  const overLimit = showCount && valueLength > maxLength;
  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        <Text style={s.label}>
          {label}
          {required ? <Text style={s.required}> *</Text> : null}
        </Text>
        {helpText ? <HelpTooltip text={helpText} label={`About ${label}`} /> : null}
      </View>
      {children}
      {showCount || error ? (
        <View style={s.footerRow}>
          {error ? <Text style={s.inlineError}>{error}</Text> : <View />}
          {showCount ? (
            <Text style={[s.charCount, overLimit ? s.charCountOver : null]}>
              {valueLength}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
