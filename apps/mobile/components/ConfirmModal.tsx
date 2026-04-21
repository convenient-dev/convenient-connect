import { ModalIcon } from "@/components/ModalIcon";
import { Colors } from "@/constants/theme";
import type { ComponentProps } from "react";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { brand, neutral, background, text } = Colors;

interface Props {
  visible: boolean;
  title: string;
  message: string;
  icon?: ComponentProps<typeof ModalIcon>["variant"];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  icon = "alert",
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onCancel?.()}
    >
      <Pressable style={styles.overlay} onPress={() => onCancel?.()}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ModalIcon variant={icon} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
            {onCancel && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: background.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222b45",
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  cancelBtn: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    backgroundColor: neutral[1000],
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: text.inverse,
  },
  confirmBtn: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    backgroundColor: brand.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: text.inverse,
  },
});
