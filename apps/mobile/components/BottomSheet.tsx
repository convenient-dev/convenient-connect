import { Colors } from "@/constants/theme";
import Divider from "@/components/ui/divider";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { neutral, background } = Colors;

const SHEET_HEIGHT = 220;

export interface BottomSheetOption {
  label: string;
  /** require()'d image asset shown before the label. */
  icon: number;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  title: string;
  options: BottomSheetOption[];
  onClose: () => void;
}

export function BottomSheet({ visible, title, options, onClose }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <Pressable>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <Divider />
            {options.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={styles.option}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <ExpoImage
                  source={option.icon}
                  style={{ width: 20, height: 20 }}
                />
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[300],
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[800],
    textAlign: "center",
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "400",
    color: neutral[800],
  },
});
