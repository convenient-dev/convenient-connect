import type { Address } from "@/api/address";
import { Colors } from "@/constants/theme";
import type {
  FormTemplate,
  FormValues,
  ServiceFormTemplateSection,
  TemplateField as Field,
} from "@/services/template";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TemplateField } from "./TemplateField";

const { neutral } = Colors;

interface Props {
  section: Pick<ServiceFormTemplateSection, "title" | "help_text">;
  fields: Field[];
  template: FormTemplate;
  values: FormValues;
  errors: Record<string, string>;
  isRequired: (field: Field) => boolean;
  setValue: (key: string, value: unknown) => void;
  defaultAddress?: Address | null;
  onAddAddress?: () => void;
  /** Hide the section title (when the screen already shows it as the page title). */
  hideTitle?: boolean;
}

/** One template section: title, help text and its visible fields in order. */
export function TemplateSection({
  section,
  fields,
  template,
  values,
  errors,
  isRequired,
  setValue,
  defaultAddress,
  onAddAddress,
  hideTitle = false,
}: Props) {
  if (fields.length === 0) return null;
  return (
    <View>
      {!hideTitle ? (
        <View style={styles.header}>
          <Text style={styles.title}>{section.title}</Text>
          {section.help_text ? <Text style={styles.help}>{section.help_text}</Text> : null}
        </View>
      ) : null}
      {fields.map((field) => (
        <TemplateField
          key={field.field_key}
          field={field}
          template={template}
          values={values}
          errors={errors}
          required={isRequired(field)}
          setValue={setValue}
          defaultAddress={defaultAddress}
          onAddAddress={onAddAddress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: neutral[800],
  },
  help: {
    fontSize: 13,
    color: neutral[400],
    lineHeight: 19,
  },
});
