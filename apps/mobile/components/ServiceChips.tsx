import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const { primary, neutral } = Colors;

export interface ServiceChipItem {
  id: number;
  name: string;
}

interface Props {
  services: ServiceChipItem[];
  /** Ids of selected chips. Omit for a read-only display. */
  selectedIds?: number[];
  onToggle?: (id: number) => void;
  size?: "md" | "sm";
  /** Center chips (used on invite-code cards). */
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Outlined pill chips for service sub-categories. Interactive when
 * `onToggle` is provided, otherwise a plain read-only list.
 */
export function ServiceChips({
  services,
  selectedIds = [],
  onToggle,
  size = "md",
  centered = false,
  style,
}: Props) {
  const interactive = !!onToggle;

  return (
    <View style={[styles.row, centered && styles.rowCentered, style]}>
      {services.map((service) => {
        const selected = selectedIds.includes(service.id);
        return (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.chip,
              size === "sm" && styles.chipSm,
              selected && styles.chipSelected,
            ]}
            disabled={!interactive}
            activeOpacity={0.7}
            onPress={() => onToggle?.(service.id)}
            accessibilityRole={interactive ? "checkbox" : undefined}
            accessibilityState={interactive ? { checked: selected } : undefined}
          >
            <Text
              style={[
                styles.chipText,
                size === "sm" && styles.chipTextSm,
                selected && styles.chipTextSelected,
              ]}
              numberOfLines={1}
            >
              {service.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface AssignmentProps {
  /** Services currently assigned; rendered as solid chips with a remove icon. */
  selected: ServiceChipItem[];
  /** Services that can still be added; rendered as dashed chips with an add icon. */
  available: ServiceChipItem[];
  onAdd: (service: ServiceChipItem) => void;
  onRemove: (service: ServiceChipItem) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Assignment-style chips: selected services first with an "x" to remove,
 * followed by the remaining services as dashed placeholders to add.
 */
export function ServiceAssignmentChips({
  selected,
  available,
  onAdd,
  onRemove,
  disabled = false,
  style,
}: AssignmentProps) {
  return (
    <View style={[styles.row, style]}>
      {selected.map((service) => (
        <View key={service.id} style={styles.assignChip}>
          <Text
            style={[styles.chipText, styles.assignChipText]}
            numberOfLines={1}
          >
            {service.name}
          </Text>
          <TouchableOpacity
            onPress={() => onRemove(service)}
            disabled={disabled}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${service.name}`}
          >
            <MaterialIcons name="close" size={18} color={neutral[500]} />
          </TouchableOpacity>
        </View>
      ))}
      {available.map((service) => (
        <TouchableOpacity
          key={service.id}
          style={[
            styles.assignChip,
            styles.addChip,
            disabled && styles.addChipDisabled,
          ]}
          onPress={() => onAdd(service)}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Add ${service.name}`}
        >
          <Text
            style={[styles.chipText, styles.assignChipText, styles.addChipText]}
            numberOfLines={1}
          >
            {service.name}
          </Text>
          <MaterialIcons name="add" size={18} color={neutral[400]} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rowCentered: {
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: neutral[300],
    backgroundColor: neutral[0],
  },
  chipSm: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  chipSelected: {
    borderColor: primary[400],
    backgroundColor: primary[400],
  },
  chipText: {
    fontSize: 17,
    color: neutral[500],
    letterSpacing: -0.408,
  },
  chipTextSm: {
    fontSize: 13,
  },
  chipTextSelected: {
    color: neutral[0],
    fontWeight: "500",
  },

  assignChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: neutral[300],
    backgroundColor: neutral[0],
  },
  assignChipText: {
    fontSize: 15,
  },
  addChip: {
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  addChipText: {
    color: neutral[400],
  },
  addChipDisabled: {
    opacity: 0.5,
  },
});
