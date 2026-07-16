import { Button } from "@/components/Button";
import { ModalIcon } from "@/components/ModalIcon";
import { Colors } from "@/constants/theme";
import type { ComponentProps } from "react";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const { neutral, background, overlay } = Colors;

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
            <Button
              title={confirmLabel}
              variant="secondary"
              size="md"
              onPress={onConfirm}
              style={{ width: "100%" }}
            />
            {onCancel && (
              <Button
                title={cancelLabel}
                variant="dark"
                size="md"
                onPress={onCancel}
                style={{ width: "100%" }}
              />
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
    backgroundColor: overlay.light,
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
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: neutral[800],
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
});
