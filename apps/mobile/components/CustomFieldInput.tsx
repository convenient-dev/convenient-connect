import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { primary, secondary, neutral, border } = Colors;

export type CustomField = {
  id: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  displayOrder: number;
  options: string[] | null;
};

type Props = {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  touched: boolean;
  onOpenPicker: (field: CustomField) => void;
};

export function CustomFieldInput({
  field,
  value,
  onChange,
  onBlur,
  touched,
  onOpenPicker,
}: Props) {
  const showError = touched && field.isRequired && !value.trim();

  function getMultiSelectDisplay(): string {
    if (!value) return "";
    try {
      const arr = JSON.parse(value) as string[];
      return arr.join(", ");
    } catch {
      return value;
    }
  }

  function renderControl() {
    switch (field.fieldType) {
      case "number":
        return (
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={neutral[300]}
            value={value}
            onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ""))}
            keyboardType="decimal-pad"
            onBlur={onBlur}
          />
        );

      case "textarea":
        return (
          <TextInput
            style={styles.textarea}
            placeholder={field.fieldLabel}
            placeholderTextColor={neutral[300]}
            value={value}
            onChangeText={onChange}
            multiline
            textAlignVertical="top"
            onBlur={onBlur}
          />
        );

      case "url":
        return (
          <TextInput
            style={styles.input}
            placeholder="https://"
            placeholderTextColor={neutral[300]}
            value={value}
            onChangeText={onChange}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={onBlur}
          />
        );

      case "date":
        return (
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={neutral[300]}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        );

      case "boolean":
        return (
          <View style={styles.segmentedControl}>
            {(["Yes", "No"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.segmentButton,
                  value === option && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  onChange(option);
                  onBlur();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentText,
                    value === option && styles.segmentTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "select":
      case "multiSelect": {
        const display =
          field.fieldType === "multiSelect"
            ? getMultiSelectDisplay()
            : value;
        return (
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              onBlur();
              onOpenPicker(field);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dropdownText,
                display ? styles.dropdownValue : styles.dropdownPlaceholder,
              ]}
              numberOfLines={1}
            >
              {display || field.fieldLabel}
            </Text>
            <Feather name="chevron-down" size={18} color={neutral[400]} />
          </TouchableOpacity>
        );
      }

      default:
        return (
          <TextInput
            style={styles.input}
            placeholder={field.fieldLabel}
            placeholderTextColor={neutral[300]}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        );
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {field.fieldLabel}
        {field.isRequired ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {renderControl()}
      {showError && (
        <Text style={styles.inlineError}>{field.fieldLabel} is required.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: neutral[700],
  },
  required: {
    color: secondary[500],
  },
  input: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: neutral[800],
  },
  textarea: {
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 14,
    color: neutral[800],
    minHeight: 100,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
  },
  dropdownPlaceholder: {
    color: neutral[300],
  },
  dropdownValue: {
    color: neutral[800],
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    borderColor: primary[400],
    backgroundColor: primary[50],
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: neutral[500],
  },
  segmentTextActive: {
    color: primary[500],
    fontWeight: "600",
  },
  inlineError: {
    fontSize: 12,
    color: "#d32f2f",
    marginTop: 4,
  },
});
