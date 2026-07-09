import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { secondary, neutral, text, background, border, overlay } = Colors;

export interface SelectOption {
  id: number;
  name: string;
}

interface SearchableSelectProps {
  label: string;
  required?: boolean;
  placeholder: string;
  value: SelectOption | null;
  onSelect: (option: SelectOption) => void;
  loadOptions: (search: string) => Promise<SelectOption[]>;
  disabled?: boolean;
  disabledHint?: string;
  /**
   * Changing this key invalidates the loaded option cache (e.g. when the
   * selected country changes, the state list must be reloaded).
   */
  reloadKey?: string | number;
}

export function SearchableSelect({
  label,
  required = false,
  placeholder,
  value,
  onSelect,
  loadOptions,
  disabled = false,
  disabledHint,
  reloadKey,
}: SearchableSelectProps) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    const handle = setTimeout(() => {
      loadOptions(search.trim())
        .then((result) => {
          if (current !== requestId.current) return;
          setOptions(result);
        })
        .catch(() => {
          if (current !== requestId.current) return;
          setError("Failed to load options. Please try again.");
        })
        .finally(() => {
          if (current !== requestId.current) return;
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(handle);
  }, [visible, search, reloadKey, loadOptions]);

  function open() {
    if (disabled) return;
    setSearch("");
    setOptions([]);
    setVisible(true);
  }

  function close() {
    setVisible(false);
    setSearch("");
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        activeOpacity={0.7}
        onPress={open}
        disabled={disabled}
      >
        <Text style={value ? styles.inputValue : styles.inputPlaceholder}>
          {value ? value.name : disabled && disabledHint ? disabledHint : placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={22} color={neutral[500]} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <Pressable style={styles.sheetOverlay} onPress={close}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{label}</Text>
              <View style={styles.searchWrap}>
                <MaterialIcons name="search" size={18} color={neutral[400]} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={placeholder}
                  placeholderTextColor={neutral[400]}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch("")}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={18} color={neutral[400]} />
                  </TouchableOpacity>
                )}
              </View>
              {loading ? (
                <View style={styles.statusWrap}>
                  <ActivityIndicator color={neutral[400]} />
                </View>
              ) : error ? (
                <Text style={styles.statusText}>{error}</Text>
              ) : (
                <FlatList
                  data={options}
                  keyExtractor={(item) => String(item.id)}
                  keyboardShouldPersistTaps="handled"
                  style={styles.sheetList}
                  ItemSeparatorComponent={() => (
                    <View style={styles.pickerDivider} />
                  )}
                  ListEmptyComponent={
                    <Text style={styles.statusText}>No results found</Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        onSelect(item);
                        close();
                      }}
                    >
                      <Text style={styles.pickerName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {value?.id === item.id && (
                        <MaterialIcons
                          name="check"
                          size={20}
                          color={secondary[400]}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: text.primary,
    letterSpacing: -0.408,
  },
  required: {
    color: secondary[400],
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputDisabled: {
    backgroundColor: neutral[50],
  },
  inputValue: {
    fontSize: 17,
    color: text.primary,
    letterSpacing: -0.408,
  },
  inputPlaceholder: {
    fontSize: 17,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: overlay.light,
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[200],
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: text.primary,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: text.primary,
    letterSpacing: -0.408,
    paddingVertical: 0,
  },
  statusWrap: {
    paddingVertical: 32,
    alignItems: "center",
  },
  statusText: {
    textAlign: "center",
    color: neutral[400],
    fontSize: 14,
    paddingVertical: 24,
  },
  sheetList: {
    maxHeight: 400,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pickerName: {
    flex: 1,
    fontSize: 15,
    color: text.primary,
    letterSpacing: -0.408,
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: neutral[100],
    marginHorizontal: 20,
  },
});
