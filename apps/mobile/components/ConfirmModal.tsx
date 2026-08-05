import { Button } from "@/components/Button";
import { MAX_DIALOG_WIDTH } from "@/constants/layout";
import { Colors } from "@/constants/theme";
import LottieView from "lottie-react-native";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

const { neutral, background, overlay } = Colors;

type MessageType = "success" | "error" | "warning";
type IconVariant = "success" | "error" | "warning";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  /**
   * Type of message - determines default icon and styling
   * @default "warning"
   */
  type?: MessageType;
  /**
   * Override the default icon for the message type.
   * Set to `null` to hide the icon completely.
   */
  icon?: IconVariant | null;
  /**
   * Hide the icon completely
   * @default false
   */
  showIcon?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const ICON_CONFIG: Record<IconVariant, any> = {
  success: require("@/assets/Animated icons/Json/Check_Icon.json"),
  error: require("@/assets/Animated icons/Json/Cross_Icon.json"),
  warning: require("@/assets/Animated icons/Json/Exclamation_Icon.json"),
};

const TYPE_ICON_MAP: Record<MessageType, IconVariant> = {
  success: "success",
  error: "error",
  warning: "warning",
};

function ModalIcon({ variant, reducedMotion }: { variant: IconVariant; reducedMotion: boolean }) {
  return (
    <LottieView
      source={ICON_CONFIG[variant]}
      autoPlay={!reducedMotion}
      loop={false}
      resizeMode="contain"
      style={styles.lottieIcon}
    />
  );
}

export function ConfirmModal({
  visible,
  title,
  message,
  type = "warning",
  icon: iconOverride,
  showIcon = true,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  const reducedMotion = useReducedMotion();
  const icon = iconOverride !== undefined ? iconOverride : TYPE_ICON_MAP[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onCancel?.()}
    >
      <Pressable style={styles.overlay} onPress={() => onCancel?.()}>
        <Pressable style={styles.card} onPress={() => {}}>
          {showIcon && icon !== null && (
            <ModalIcon variant={icon} reducedMotion={reducedMotion} />
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
  lottieIcon: {
    width: 120,
    height: 120,
    marginTop: -12,
    marginBottom: -32,
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
  actions: {
    flexDirection: "column",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
});
