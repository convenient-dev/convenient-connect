/**
 * Controls for the non-pricing template field types. Each receives the field,
 * the current values and a setter; none of them know about categories.
 */
import type { MultipartFile } from "@/api/multipart";
import type { Address } from "@/api/address";
import { Colors } from "@/constants/theme";
import {
  type CertificateBundleValue,
  type FieldOption,
  type FormValues,
  type TemplateField,
} from "@/services/template";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { FieldShell } from "./FieldShell";
import { OptionSheet } from "./OptionSheet";
import { acceptsOnlyImages, pickFilesForField } from "./file-pickers";
import { formStyles as s } from "./styles";

const { neutral, primary } = Colors;

export interface ControlProps {
  field: TemplateField;
  values: FormValues;
  errors: Record<string, string>;
  required: boolean;
  setValue: (key: string, value: unknown) => void;
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function optionSelected(option: FieldOption, value: unknown): boolean {
  if (Array.isArray(value)) return value.some((v) => String(v) === String(option.value));
  return value !== undefined && value !== null && String(value) === String(option.value);
}

function otherOption(field: TemplateField): FieldOption | undefined {
  return field.options?.find((o) => o.allows_custom_value && o.custom_value_key);
}

// ---------------------------------------------------------------------------

export function TextControl({ field, values, errors, required, setValue }: ControlProps) {
  const multiline = field.field_type === "textarea";
  const error = errors[field.field_key];
  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text} error={error}>
      <TextInput
        style={[multiline ? s.textarea : s.input, error ? s.inputError : null]}
        placeholder={field.placeholder ?? undefined}
        placeholderTextColor={neutral[300]}
        value={stringValue(values[field.field_key])}
        onChangeText={(text) => setValue(field.field_key, text)}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

export function NumberControl({ field, values, errors, required, setValue }: ControlProps) {
  const error = errors[field.field_key];
  const unitKey = field.unit_value_key;
  const unitError = unitKey ? errors[unitKey] : undefined;
  const unitOptions = field.unit_options ?? [];
  const input = (
    <TextInput
      style={[s.input, unitKey ? s.unitInput : null, error ? s.inputError : null]}
      placeholder={field.placeholder ?? undefined}
      placeholderTextColor={neutral[300]}
      keyboardType="decimal-pad"
      value={stringValue(values[field.field_key])}
      onChangeText={(text) => setValue(field.field_key, text.replace(/[^0-9.]/g, ""))}
    />
  );
  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error ?? unitError}
    >
      {unitKey && unitOptions.length ? (
        <View style={s.unitRow}>
          {input}
          <View style={s.unitGroup}>
            {unitOptions.map((option) => {
              const active = String(values[unitKey]) === String(option.value);
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[s.unitButton, active && s.unitButtonActive]}
                  onPress={() => setValue(unitKey, option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.unitText, active && s.unitTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        input
      )}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

/** Single choice. Few options render as segments, many as a picker sheet. */
export function SingleSelectControl({ field, values, errors, required, setValue }: ControlProps) {
  const [open, setOpen] = useState(false);
  const options = field.options ?? [];
  const value = values[field.field_key];
  const selected = options.find((o) => optionSelected(o, value));
  const error = errors[field.field_key];

  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text} error={error}>
      {options.length <= 4 ? (
        <View style={s.segmentedControl}>
          {options.map((option) => {
            const active = optionSelected(option, value);
            return (
              <TouchableOpacity
                key={String(option.value)}
                style={[s.segmentButton, active && s.segmentButtonActive]}
                onPress={() => setValue(field.field_key, option.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <>
          <TouchableOpacity style={s.dropdown} onPress={() => setOpen(true)} activeOpacity={0.7}>
            <Text style={selected ? s.dropdownValue : s.dropdownPlaceholder}>
              {selected?.label ?? field.placeholder ?? "Select"}
            </Text>
            <Feather name="chevron-down" size={18} color={neutral[400]} />
          </TouchableOpacity>
          <OptionSheet
            visible={open}
            title={field.label}
            options={options.map((o) => ({ label: o.label, value: String(o.value) }))}
            selectedValue={selected ? String(selected.value) : null}
            onSelect={(v) => {
              const match = options.find((o) => String(o.value) === v);
              setValue(field.field_key, match?.value ?? v);
            }}
            onClose={() => setOpen(false)}
          />
        </>
      )}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

/** Multiple choice as checkbox rows, with an Other input when the template allows it. */
export function MultiSelectControl({ field, values, errors, required, setValue }: ControlProps) {
  const options = field.options ?? [];
  const current = Array.isArray(values[field.field_key])
    ? (values[field.field_key] as unknown[])
    : [];
  const other = otherOption(field);
  const otherSelected = other ? optionSelected(other, current) : false;
  const error = errors[field.field_key] ?? (other?.custom_value_key ? errors[other.custom_value_key] : undefined);

  function toggle(option: FieldOption) {
    const exists = optionSelected(option, current);
    const next = exists
      ? current.filter((v) => String(v) !== String(option.value))
      : [...current, option.value];
    setValue(field.field_key, next);
    if (exists && option.custom_value_key) setValue(option.custom_value_key, undefined);
  }

  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text} error={error}>
      <View style={{ gap: 8 }}>
        {options.map((option) => {
          const active = optionSelected(option, current);
          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[s.checkRow, active && s.checkRowActive]}
              onPress={() => toggle(option)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, active && s.checkboxChecked]}>
                {active && <Feather name="check" size={14} color={neutral[0]} />}
              </View>
              <Text style={s.checkText}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
        {other?.custom_value_key && otherSelected ? (
          <TextInput
            style={[s.input, errors[other.custom_value_key] ? s.inputError : null]}
            placeholder={other.custom_value_label ?? "Please specify"}
            placeholderTextColor={neutral[300]}
            value={stringValue(values[other.custom_value_key])}
            onChangeText={(text) => setValue(other.custom_value_key!, text)}
          />
        ) : null}
      </View>
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

/**
 * Yes/no. A field that must be accepted (acknowledgement) renders as a single
 * checkbox row; otherwise as Yes / No segments.
 */
export function YesNoControl({ field, values, errors, required, setValue }: ControlProps) {
  const value = values[field.field_key];
  const error = errors[field.field_key];
  const validation = field.validation && !Array.isArray(field.validation) ? field.validation : {};
  const mustAccept = validation.accepted_value === true;

  if (mustAccept) {
    const checked = value === true;
    return (
      <View style={s.field}>
        <TouchableOpacity
          style={[s.checkRow, checked && s.checkRowActive]}
          onPress={() => setValue(field.field_key, !checked)}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, checked && s.checkboxChecked]}>
            {checked && <Feather name="check" size={14} color={neutral[0]} />}
          </View>
          <Text style={s.checkText}>
            {field.label}
            {required ? <Text style={s.required}> *</Text> : null}
          </Text>
        </TouchableOpacity>
        {field.help_text ? <Text style={s.helpText}>{field.help_text}</Text> : null}
        {error ? <Text style={s.inlineError}>{error}</Text> : null}
      </View>
    );
  }

  const options: FieldOption[] =
    field.options && field.options.length
      ? field.options
      : [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ];
  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text} error={error}>
      <View style={s.segmentedControl}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[s.segmentButton, active && s.segmentButtonActive]}
              onPress={() => setValue(field.field_key, option.value)}
              activeOpacity={0.7}
            >
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

function FileThumbs({
  files,
  isImage,
  onRemove,
  onAdd,
  canAdd,
}: {
  files: MultipartFile[];
  isImage: boolean;
  onRemove: (index: number) => void;
  onAdd: () => void;
  canAdd: boolean;
}) {
  return (
    <View style={s.fileRow}>
      {files.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={s.thumbWrap}>
          {isImage ? (
            <ExpoImage source={{ uri: file.uri }} style={s.imageThumb} contentFit="cover" />
          ) : (
            <View style={s.docThumb}>
              <Feather name="file-text" size={20} color={neutral[400]} />
              <Text style={s.docThumbName} numberOfLines={2}>
                {file.name}
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.thumbRemove} onPress={() => onRemove(index)} activeOpacity={0.7}>
            <Feather name="x" size={12} color={neutral[0]} />
          </TouchableOpacity>
        </View>
      ))}
      {canAdd ? (
        <TouchableOpacity style={s.uploadBox} onPress={onAdd} activeOpacity={0.7}>
          <Feather name="upload" size={22} color={neutral[400]} />
          <Text style={s.uploadText}>{isImage ? "Upload Image" : "Upload File"}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Portfolio images and dynamic file uploads (new files only). */
export function FileUploadControl({ field, values, errors, required, setValue }: ControlProps) {
  const files = Array.isArray(values[field.field_key])
    ? (values[field.field_key] as MultipartFile[])
    : [];
  const max = field.maximum_files ?? (field.multiple === false ? 1 : 10);
  const isImage = acceptsOnlyImages(field.allowed_file_types);
  const error = errors[field.field_key];

  async function add() {
    const picked = await pickFilesForField(field.allowed_file_types, max - files.length);
    if (picked.length) setValue(field.field_key, [...files, ...picked]);
  }

  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text} error={error}>
      <FileThumbs
        files={files}
        isImage={isImage}
        canAdd={files.length < max}
        onAdd={add}
        onRemove={(index) =>
          setValue(field.field_key, files.filter((_, i) => i !== index))
        }
      />
    </FieldShell>
  );
}

/** One shared description plus files (certificate bundle). */
export function CertificateBundleControl({ field, values, errors, required, setValue }: ControlProps) {
  const bundle = (values[field.field_key] ?? {}) as CertificateBundleValue;
  const files = bundle.files ?? [];
  const max = field.maximum_files ?? 10;
  const error = errors[field.field_key];

  function update(patch: Partial<CertificateBundleValue>) {
    setValue(field.field_key, { ...bundle, ...patch });
  }

  async function add() {
    const picked = await pickFilesForField(field.allowed_file_types, max - files.length);
    if (picked.length) update({ files: [...files, ...picked] });
  }

  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text} error={error}>
      <TextInput
        style={[s.input, error ? s.inputError : null]}
        placeholder={field.placeholder ?? "Describe your certifications"}
        placeholderTextColor={neutral[300]}
        value={bundle.description ?? ""}
        onChangeText={(text) => update({ description: text })}
      />
      <FileThumbs
        files={files}
        isImage={false}
        canAdd={files.length < max}
        onAdd={add}
        onRemove={(index) => update({ files: files.filter((_, i) => i !== index) })}
      />
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

interface AddressControlProps extends ControlProps {
  defaultAddress: Address | null | undefined;
  onAddAddress: () => void;
}

/** Display-only: the backend snapshots the provider's default address. */
export function AddressControl({ field, required, defaultAddress, onAddAddress }: AddressControlProps) {
  return (
    <FieldShell label={field.label} required={required} helpText={field.help_text}>
      <View style={s.addressBox}>
        <Feather name="map-pin" size={16} color={defaultAddress ? primary[500] : neutral[400]} />
        {defaultAddress ? (
          <Text style={s.addressText}>{defaultAddress.address}</Text>
        ) : (
          <Text style={s.addressMissing}>No default address yet</Text>
        )}
        <TouchableOpacity onPress={onAddAddress} activeOpacity={0.7}>
          <Text style={s.linkText}>{defaultAddress ? "Change" : "Add"}</Text>
        </TouchableOpacity>
      </View>
    </FieldShell>
  );
}
