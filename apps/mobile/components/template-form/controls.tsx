/**
 * Controls for the non-pricing template field types. Each receives the field,
 * the current values and a setter; none of them know about categories.
 */
import type { Address } from "@/api/address";
import type { MultipartFile } from "@/api/multipart";
import { Button } from "@/components/Button";
import { Colors } from "@/constants/theme";
import {
  CUSTOMER_LOCATION_CODE,
  FULFILLMENT_SUBMIT_KEY,
  allowedFulfillmentOptions,
  encodeLanguagePair,
  formatLanguagePair,
  normalizeLanguage,
  selectedFulfillmentCodes,
  type CertificateBundleValue,
  type FieldOption,
  type FormTemplate,
  type FormValues,
  type TemplateField,
} from "@/services/template";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { FieldShell } from "./FieldShell";
import { HelpTooltip } from "./HelpTooltip";
import { OptionSheet } from "./OptionSheet";
import { acceptsOnlyImages, pickFilesForField } from "./file-pickers";
import { formStyles as s } from "./styles";

const { neutral, primary } = Colors;

/** A file the service already stores, shown beside new uploads on edit screens. */
export interface ExistingFile {
  /** Stable key: the file id for portfolio/certificate files, the stored path for dynamic files. */
  key: string;
  url: string;
  name?: string | null;
  /** Marked for deletion on save; no longer shown. */
  removed?: boolean;
}

export interface ExistingFilesProps {
  /** Stored files per `field_key`. */
  existingFiles?: Record<string, ExistingFile[]>;
  onRemoveExistingFile?: (field: TemplateField, file: ExistingFile) => void;
}

export interface ControlProps extends ExistingFilesProps {
  field: TemplateField;
  template: FormTemplate;
  values: FormValues;
  errors: Record<string, string>;
  required: boolean;
  setValue: (key: string, value: unknown) => void;
}

const IMAGE_URL = /\.(jpe?g|png|webp|gif|heic)$/i;

function isImageUrl(url: string): boolean {
  return IMAGE_URL.test(url.split("?")[0]);
}

function fileNameFromUrl(url: string): string {
  const last = url.split("?")[0].split("/").pop();
  return last ? decodeURIComponent(last) : "File";
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function optionSelected(option: FieldOption, value: unknown): boolean {
  if (Array.isArray(value))
    return value.some((v) => String(v) === String(option.value));
  return (
    value !== undefined &&
    value !== null &&
    String(value) === String(option.value)
  );
}

function otherOption(field: TemplateField): FieldOption | undefined {
  return field.options?.find(
    (o) => o.allows_custom_value && o.custom_value_key,
  );
}

// ---------------------------------------------------------------------------

export function TextControl({
  field,
  values,
  errors,
  required,
  setValue,
}: ControlProps) {
  const multiline = field.field_type === "textarea";
  const error = errors[field.field_key];
  const text = stringValue(values[field.field_key]);
  const validation =
    field.validation && !Array.isArray(field.validation)
      ? field.validation
      : {};
  const maxLength = validation.maximum_length;
  const [focused, setFocused] = useState(false);
  // The counter appears once the user starts typing (focused or has text).
  const showCount = maxLength !== undefined && (focused || text.length > 0);
  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error}
      maxLength={showCount ? maxLength : undefined}
      valueLength={showCount ? text.length : undefined}
    >
      <TextInput
        style={[multiline ? s.textarea : s.input, error ? s.inputError : null]}
        placeholder={field.placeholder ?? undefined}
        placeholderTextColor={neutral[300]}
        value={text}
        onChangeText={(value) => setValue(field.field_key, value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

export function NumberControl({
  field,
  values,
  errors,
  required,
  setValue,
}: ControlProps) {
  const error = errors[field.field_key];
  const unitKey = field.unit_value_key;
  const unitError = unitKey ? errors[unitKey] : undefined;
  const unitOptions = field.unit_options ?? [];
  const input = (
    <TextInput
      style={[
        s.input,
        unitKey ? s.unitInput : null,
        error ? s.inputError : null,
      ]}
      placeholder={field.placeholder ?? undefined}
      placeholderTextColor={neutral[300]}
      keyboardType="decimal-pad"
      value={stringValue(values[field.field_key])}
      onChangeText={(text) =>
        setValue(field.field_key, text.replace(/[^0-9.]/g, ""))
      }
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
                  <Text style={[s.unitText, active && s.unitTextActive]}>
                    {option.label}
                  </Text>
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

/** Single choice. Few options render as stacked buttons, many as a picker sheet. */
export function SingleSelectControl({
  field,
  values,
  errors,
  required,
  setValue,
}: ControlProps) {
  const [open, setOpen] = useState(false);
  const options = field.options ?? [];
  const value = values[field.field_key];
  const selected = options.find((o) => optionSelected(o, value));
  const error = errors[field.field_key];

  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error}
    >
      {options.length <= 4 ? (
        <View style={s.optionList}>
          {options.map((option) => {
            const active = optionSelected(option, value);
            return (
              <TouchableOpacity
                key={String(option.value)}
                style={[s.optionButton, active && s.segmentButtonActive]}
                onPress={() => setValue(field.field_key, option.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.segmentText, active && s.segmentTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={s.dropdown}
            onPress={() => setOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={selected ? s.dropdownValue : s.dropdownPlaceholder}>
              {selected?.label ?? field.placeholder ?? "Select"}
            </Text>
            <Feather name="chevron-down" size={18} color={neutral[400]} />
          </TouchableOpacity>
          <OptionSheet
            visible={open}
            title={field.label}
            options={options.map((o) => ({
              label: o.label,
              value: String(o.value),
            }))}
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

/**
 * Multiple choice as checkbox rows, with an Other input when the template
 * allows it. The fulfillment field only offers the codes the active format
 * allows; anything else would be pruned by the form hook right after tapping.
 */
export function MultiSelectControl({
  field,
  template,
  values,
  errors,
  required,
  setValue,
}: ControlProps) {
  const options =
    field.submit_as?.key === FULFILLMENT_SUBMIT_KEY
      ? allowedFulfillmentOptions(template, values)
      : (field.options ?? []);
  const current = Array.isArray(values[field.field_key])
    ? (values[field.field_key] as unknown[])
    : [];
  const other = otherOption(field);
  const otherSelected = other ? optionSelected(other, current) : false;
  const error =
    errors[field.field_key] ??
    (other?.custom_value_key ? errors[other.custom_value_key] : undefined);

  function toggle(option: FieldOption) {
    const exists = optionSelected(option, current);
    const next = exists
      ? current.filter((v) => String(v) !== String(option.value))
      : [...current, option.value];
    setValue(field.field_key, next);
    if (exists && option.custom_value_key)
      setValue(option.custom_value_key, undefined);
  }

  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error}
    >
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
                {active && (
                  <Feather name="check" size={14} color={neutral[0]} />
                )}
              </View>
              <Text style={s.checkText}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
        {other?.custom_value_key && otherSelected ? (
          <TextInput
            style={[
              s.input,
              errors[other.custom_value_key] ? s.inputError : null,
            ]}
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
 * Free-entry multi select (descriptor set open / free_entry, no options): the
 * provider types one value at a time and each becomes a removable chip. Add,
 * the return key and leaving the input all commit the typed text.
 */
export function FreeEntryMultiSelectControl({
  field,
  values,
  errors,
  required,
  setValue,
}: ControlProps) {
  const [draft, setDraft] = useState("");
  const current = Array.isArray(values[field.field_key])
    ? (values[field.field_key] as unknown[]).map(String)
    : [];
  const error = errors[field.field_key];
  const validation =
    field.validation && !Array.isArray(field.validation)
      ? field.validation
      : {};
  const max = validation.maximum_selections;
  const full = max !== undefined && current.length >= max;
  const entry = draft.trim();
  const canAdd = entry.length > 0 && !full;

  function commit() {
    if (!canAdd) return;
    const duplicate = current.some(
      (v) => v.toLowerCase() === entry.toLowerCase(),
    );
    if (!duplicate) setValue(field.field_key, [...current, entry]);
    setDraft("");
  }

  function remove(index: number) {
    setValue(
      field.field_key,
      current.filter((_, i) => i !== index),
    );
  }

  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error}
    >
      {current.length ? (
        <View style={s.tagRow}>
          {current.map((value, index) => (
            <View key={`${value}-${index}`} style={s.tag}>
              <Text style={s.tagText}>{value}</Text>
              <TouchableOpacity
                onPress={() => remove(index)}
                activeOpacity={0.7}
                accessibilityLabel={`Remove ${value}`}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={primary[500]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      {full ? null : (
        <View style={s.tagInputRow}>
          <TextInput
            style={[s.input, s.tagInput, error ? s.inputError : null]}
            placeholder={field.placeholder ?? "Type a value"}
            placeholderTextColor={neutral[300]}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commit}
            onBlur={commit}
            submitBehavior="submit"
            returnKeyType="done"
          />
          <Button
            title="Add"
            variant="outline"
            size="sm"
            style={s.tagAddButton}
            textStyle={s.tagAddText}
            onPress={commit}
            disabled={!canAdd}
          />
        </View>
      )}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

/**
 * Directed language pairs (Interpreters): a From and a To language become one
 * `source->target` entry, shown as a chip "English → Urdu". Direction matters
 * to the API, so the control can add the reverse pair in the same tap.
 */
export function LanguagePairControl({ field, values, errors, required, setValue }: ControlProps) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [addReverse, setAddReverse] = useState(false);
  const current = Array.isArray(values[field.field_key])
    ? (values[field.field_key] as unknown[]).map(String)
    : [];
  const error = errors[field.field_key];
  const validation = field.validation && !Array.isArray(field.validation) ? field.validation : {};
  const max = validation.maximum_selections;
  const full = max !== undefined && current.length >= max;
  const from = normalizeLanguage(source);
  const to = normalizeLanguage(target);
  const sameLanguage = from.length > 0 && from === to;
  const canAdd = from.length > 0 && to.length > 0 && !sameLanguage && !full;

  function commit() {
    if (!canAdd) return;
    const pairs = [encodeLanguagePair(from, to)];
    if (addReverse) pairs.push(encodeLanguagePair(to, from));
    const next = [...current];
    for (const pair of pairs) {
      if (max !== undefined && next.length >= max) break;
      if (!next.includes(pair)) next.push(pair);
    }
    if (next.length !== current.length) setValue(field.field_key, next);
    setSource("");
    setTarget("");
  }

  function remove(index: number) {
    setValue(field.field_key, current.filter((_, i) => i !== index));
  }

  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error ?? (sameLanguage ? "Source and target must be different languages." : undefined)}
    >
      {current.length ? (
        <View style={s.tagRow}>
          {current.map((value, index) => (
            <View key={`${value}-${index}`} style={s.tag}>
              <Text style={s.tagText}>{formatLanguagePair(value)}</Text>
              <TouchableOpacity
                onPress={() => remove(index)}
                activeOpacity={0.7}
                accessibilityLabel={`Remove ${formatLanguagePair(value)}`}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={primary[500]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      {full ? null : (
        <>
          <View style={s.tagInputRow}>
            <TextInput
              style={[s.input, s.tagInput, error ? s.inputError : null]}
              placeholder="From language"
              placeholderTextColor={neutral[300]}
              value={source}
              onChangeText={setSource}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Feather name="arrow-right" size={18} color={neutral[400]} />
            <TextInput
              style={[s.input, s.tagInput, error ? s.inputError : null]}
              placeholder="To language"
              placeholderTextColor={neutral[300]}
              value={target}
              onChangeText={setTarget}
              onSubmitEditing={commit}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
          <View style={s.tagInputRow}>
            <TouchableOpacity
              style={s.pairReverseRow}
              onPress={() => setAddReverse((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, addReverse && s.checkboxChecked]}>
                {addReverse && <Feather name="check" size={14} color={neutral[0]} />}
              </View>
              <Text style={s.checkText}>Also add the reverse direction</Text>
            </TouchableOpacity>
            <Button
              title="Add"
              variant="outline"
              size="sm"
              style={s.tagAddButton}
              textStyle={s.tagAddText}
              onPress={commit}
              disabled={!canAdd}
            />
          </View>
        </>
      )}
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

/**
 * Yes/no. A field that must be accepted (acknowledgement) renders as a single
 * checkbox row; otherwise as Yes / No segments.
 */
export function YesNoControl({
  field,
  values,
  errors,
  required,
  setValue,
}: ControlProps) {
  const value = values[field.field_key];
  const error = errors[field.field_key];
  const validation =
    field.validation && !Array.isArray(field.validation)
      ? field.validation
      : {};
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
          {field.help_text ? (
            <HelpTooltip
              text={field.help_text}
              label={`About ${field.label}`}
            />
          ) : null}
        </TouchableOpacity>
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
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error}
    >
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
              <Text style={[s.segmentText, active && s.segmentTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

function ExistingThumb({
  file,
  onRemove,
}: {
  file: ExistingFile;
  onRemove?: () => void;
}) {
  const image = isImageUrl(file.url);
  const name = file.name ?? fileNameFromUrl(file.url);
  return (
    <View style={s.thumbWrap}>
      {image ? (
        <ExpoImage
          source={{ uri: file.url }}
          style={s.imageThumb}
          contentFit="cover"
        />
      ) : (
        <TouchableOpacity
          style={s.docThumb}
          onPress={() => WebBrowser.openBrowserAsync(file.url)}
          activeOpacity={0.7}
        >
          <Feather name="file-text" size={20} color={neutral[400]} />
          <Text style={s.docThumbName} numberOfLines={2}>
            {name}
          </Text>
        </TouchableOpacity>
      )}
      {onRemove ? (
        <TouchableOpacity
          style={s.thumbRemove}
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <Feather name="x" size={12} color={neutral[0]} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function FileThumbs({
  files,
  isImage,
  onRemove,
  onAdd,
  canAdd,
  existing = [],
  onRemoveExisting,
}: {
  files: MultipartFile[];
  isImage: boolean;
  onRemove: (index: number) => void;
  onAdd: () => void;
  canAdd: boolean;
  existing?: ExistingFile[];
  onRemoveExisting?: (file: ExistingFile) => void;
}) {
  return (
    <View style={s.fileRow}>
      {existing
        .filter((file) => !file.removed)
        .map((file) => (
          <ExistingThumb
            key={file.key}
            file={file}
            onRemove={
              onRemoveExisting ? () => onRemoveExisting(file) : undefined
            }
          />
        ))}
      {files.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={s.thumbWrap}>
          {isImage ? (
            <ExpoImage
              source={{ uri: file.uri }}
              style={s.imageThumb}
              contentFit="cover"
            />
          ) : (
            <View style={s.docThumb}>
              <Feather name="file-text" size={20} color={neutral[400]} />
              <Text style={s.docThumbName} numberOfLines={2}>
                {file.name}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={s.thumbRemove}
            onPress={() => onRemove(index)}
            activeOpacity={0.7}
          >
            <Feather name="x" size={12} color={neutral[0]} />
          </TouchableOpacity>
        </View>
      ))}
      {canAdd ? (
        <TouchableOpacity
          style={s.uploadBox}
          onPress={onAdd}
          activeOpacity={0.7}
        >
          <Feather name="upload" size={22} color={neutral[400]} />
          <Text style={s.uploadText}>
            {isImage ? "Upload Image" : "Upload File"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Stored files for a field and how many of them are still kept. */
function useExistingFiles(props: ControlProps) {
  const { field, existingFiles, onRemoveExistingFile } = props;
  const existing = existingFiles?.[field.field_key] ?? [];
  const kept = existing.filter((file) => !file.removed).length;
  return {
    existing,
    kept,
    onRemoveExisting: onRemoveExistingFile
      ? (file: ExistingFile) => onRemoveExistingFile(field, file)
      : undefined,
  };
}

/** Portfolio images and dynamic file uploads: stored files plus new uploads. */
export function FileUploadControl(props: ControlProps) {
  const { field, values, errors, required, setValue } = props;
  const files = Array.isArray(values[field.field_key])
    ? (values[field.field_key] as MultipartFile[])
    : [];
  const max = field.maximum_files ?? (field.multiple === false ? 1 : 10);
  const isImage = acceptsOnlyImages(field.allowed_file_types);
  const error = errors[field.field_key];
  const { existing, kept, onRemoveExisting } = useExistingFiles(props);
  const remaining = max - kept - files.length;

  async function add() {
    const picked = await pickFilesForField(field.allowed_file_types, remaining);
    if (picked.length) setValue(field.field_key, [...files, ...picked]);
  }

  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error}
    >
      <FileThumbs
        files={files}
        isImage={isImage}
        canAdd={remaining > 0}
        onAdd={add}
        onRemove={(index) =>
          setValue(
            field.field_key,
            files.filter((_, i) => i !== index),
          )
        }
        existing={existing}
        onRemoveExisting={onRemoveExisting}
      />
    </FieldShell>
  );
}

/** One shared description plus files (certificate bundle). */
export function CertificateBundleControl(props: ControlProps) {
  const { field, values, errors, required, setValue } = props;
  const bundle = (values[field.field_key] ?? {}) as CertificateBundleValue;
  const files = bundle.files ?? [];
  const max = field.maximum_files ?? 10;
  const error = errors[field.field_key];
  const { existing, kept, onRemoveExisting } = useExistingFiles(props);
  const remaining = max - kept - files.length;

  function update(patch: Partial<CertificateBundleValue>) {
    setValue(field.field_key, { ...bundle, ...patch });
  }

  async function add() {
    const picked = await pickFilesForField(field.allowed_file_types, remaining);
    if (picked.length) update({ files: [...files, ...picked] });
  }

  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
      error={error}
    >
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
        canAdd={remaining > 0}
        onAdd={add}
        onRemove={(index) =>
          update({ files: files.filter((_, i) => i !== index) })
        }
        existing={existing}
        onRemoveExisting={onRemoveExisting}
      />
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------

interface AddressControlProps extends ControlProps {
  defaultAddress: Pick<Address, "address"> | null | undefined;
  /** Tapped when there is no default address yet. Omit both callbacks for a read-only display. */
  onAddAddress?: () => void;
  /** Tapped to change an existing default address; falls back to `onAddAddress`. */
  onChangeAddress?: () => void;
}

const RADIUS_CENTRE_HINT =
  "Your service area radius is measured from your current default address. " +
  "It is not saved on this service, so changing your default address moves the area.";

/**
 * Display-only: the backend snapshots the provider's default address for
 * provider-location fulfillment and centres the customer-location radius on it.
 */
export function AddressControl({
  field,
  template,
  values,
  required,
  defaultAddress,
  onAddAddress,
  onChangeAddress,
}: AddressControlProps) {
  const isRadiusCentre = selectedFulfillmentCodes(template, values).includes(
    CUSTOMER_LOCATION_CODE,
  );
  const onPress = defaultAddress
    ? (onChangeAddress ?? onAddAddress)
    : onAddAddress;
  return (
    <FieldShell
      label={field.label}
      required={required}
      helpText={field.help_text}
    >
      <View style={s.addressBox}>
        <Feather
          name="map-pin"
          size={16}
          color={defaultAddress ? primary[500] : neutral[400]}
        />
        {defaultAddress ? (
          <Text style={s.addressText}>{defaultAddress.address}</Text>
        ) : (
          <Text style={s.addressMissing}>No default address yet</Text>
        )}
        {onPress ? (
          <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Text style={s.linkText}>{defaultAddress ? "Change" : "Add"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {isRadiusCentre ? (
        <Text style={s.helpText}>{RADIUS_CENTRE_HINT}</Text>
      ) : null}
    </FieldShell>
  );
}
