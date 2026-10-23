import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { primary, neutral, border, background, overlay } = Colors;

export interface SheetOption {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
}

/** Bottom-sheet style single-choice picker for template select fields. */
export function OptionSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((option, index) => {
            const selected = option.value === selectedValue;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  index < options.length - 1 && styles.optionBorder,
                  selected && styles.optionSelected,
                ]}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.optionText, selected && styles.optionTextSelected]}
                >
                  {option.label}
                </Text>
                {selected && <Feather name="check" size={18} color={primary[500]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: overlay.light,
  },
  sheet: {
    backgroundColor: background.screen,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[200],
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: neutral[700],
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  optionSelected: {
    backgroundColor: primary[50],
  },
  optionText: {
    fontSize: 15,
    color: neutral[700],
  },
  optionTextSelected: {
    color: primary[500],
    fontWeight: "600",
  },
});
