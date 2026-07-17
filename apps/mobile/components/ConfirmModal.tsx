import { Button } from "@/components/Button";
import { ModalIcon } from "@/components/ModalIcon";
import { MAX_DIALOG_WIDTH } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import LottieView from "lottie-react-native";
import type { ComponentProps } from "react";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

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
  const reducedMotion = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onCancel?.()}
    >
      <Pressable style={styles.overlay} onPress={() => onCancel?.()}>
        <Pressable style={styles.card} onPress={() => {}}>
          {icon === "success" ? (
            <LottieView
              source={require("@/assets/Animated icons/Json/Check_Icon.json")}
              autoPlay={!reducedMotion}
              loop={false}
              resizeMode="contain"
              style={styles.successIcon}
            />
          ) : (
            <ModalIcon variant={icon} />
          )}
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
    maxWidth: MAX_DIALOG_WIDTH,
    backgroundColor: background.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 16,
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
    paddingTop: 20,
  },
  message: {
    fontSize: 13,
    color: neutral[500],
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
    marginBottom: 8,
  },
  // The check circle only fills ~42% of the Lottie canvas, so the view is
  // oversized to render a ~52px circle and negative margins trim the
  // whitespace — but no further than the card's 24px padding, or the
  // canvas pokes past the card edge and gets clipped.
  successIcon: {
    width: 120,
    height: 120,
    marginTop: -12,
    marginBottom: -32,
  },
  actions: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
});
