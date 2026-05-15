import { Colors } from "@/constants/theme";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const ENTER_DURATION = 260;
const EXIT_DURATION = 200;

const { brand, neutral, background, text, overlay, secondary, border } = Colors;

export interface FilterOption {
  key: string;
  label: string;
}

export interface FilterSection {
  key: string;
  title: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

export type FilterValues = Record<string, string[]>;

interface Props {
  visible: boolean;
  title?: string;
  sections: FilterSection[];
  initialValue?: FilterValues;
  applyLabel?: string;
  resetLabel?: string;
  onClose: () => void;
  onApply: (value: FilterValues) => void;
}

function emptyValues(sections: FilterSection[]): FilterValues {
  return sections.reduce<FilterValues>((acc, section) => {
    acc[section.key] = [];
    return acc;
  }, {});
}

export function FilterBottomSheet({
  visible,
  title = "Filters",
  sections,
  initialValue,
  applyLabel = "Apply",
  resetLabel = "Reset",
  onClose,
  onApply,
}: Props) {
  const [values, setValues] = useState<FilterValues>(
    () => initialValue ?? emptyValues(sections),
  );
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setValues(initialValue ?? emptyValues(sections));
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ENTER_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ENTER_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: EXIT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: EXIT_DURATION,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, initialValue, sections, backdropOpacity, translateY, mounted]);

  function toggleOption(section: FilterSection, optionKey: string) {
    setValues((prev) => {
      const current = prev[section.key] ?? [];
      const isSelected = current.includes(optionKey);
      let next: string[];
      if (section.multiSelect) {
        next = isSelected
          ? current.filter((k) => k !== optionKey)
          : [...current, optionKey];
      } else {
        next = isSelected ? [] : [optionKey];
      }
      return { ...prev, [section.key]: next };
    });
  }

  function handleReset() {
    setValues(emptyValues(sections));
  }

  function handleApply() {
    onApply(values);
    onClose();
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleDivider} />

            {sections.map((section) => {
              const selected = values[section.key] ?? [];
              return (
                <View key={section.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.chipsWrap}>
                    {section.options.map((opt) => {
                      const active = selected.includes(opt.key);
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.chip, active && styles.chipActive]}
                          activeOpacity={0.8}
                          onPress={() => toggleOption(section, opt.key)}
                        >
                          <Text
                            style={[
                              styles.chipLabel,
                              active && styles.chipLabelActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.applyButton}
                activeOpacity={0.85}
                onPress={handleApply}
              >
                <Text style={styles.applyText}>{applyLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resetButton}
                activeOpacity={0.85}
                onPress={handleReset}
              >
                <Text style={styles.resetText}>{resetLabel}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlay.light,
  },
  sheet: {
    backgroundColor: background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 8,
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[300],
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: text.primary,
    textAlign: "center",
    paddingBottom: 12,
    letterSpacing: -0.408,
  },
  titleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
    marginHorizontal: -20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: text.primary,
    letterSpacing: -0.408,
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    height: 34,
    borderRadius: 10,
    backgroundColor: neutral[50],
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: brand.primary,
  },
  chipLabel: {
    fontSize: 14,
    color: neutral[400],
    letterSpacing: -0.408,
  },
  chipLabelActive: {
    color: neutral[0],
    fontWeight: "600",
  },
  actions: {
    marginTop: 28,
    gap: 12,
  },
  applyButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: {
    fontSize: 17,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
  resetButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: secondary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  resetText: {
    fontSize: 17,
    fontWeight: "700",
    color: neutral[0],
    letterSpacing: -0.408,
  },
});
