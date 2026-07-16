import { Colors } from "@/constants/theme";
import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

const { primary, neutral, brand } = Colors;

export type ButtonVariant = "primary" | "secondary" | "dark" | "outline" | "ghost";
export type ButtonSize = "lg" | "md" | "sm";

interface Props {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
}: Props) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === "outline" || variant === "ghost" ? primary[400] : neutral[0];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant !== "ghost" && sizeStyles[size],
        variantStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={variant === "ghost" ? 0.7 : 0.85}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {icon && iconPosition === "left" && <View>{icon}</View>}
          <Text style={[styles.text, textSizeStyles[size], variantTextStyles[variant], textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === "right" && <View>{icon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: "600",
    letterSpacing: -0.408,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  lg: { height: 56, paddingHorizontal: 24 },
  md: { height: 48, paddingHorizontal: 20 },
  sm: { height: 40, paddingHorizontal: 18 },
};

const textSizeStyles: Record<ButtonSize, TextStyle> = {
  lg: { fontSize: 17 },
  md: { fontSize: 16 },
  sm: { fontSize: 14 },
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: brand.primary },
  secondary: { backgroundColor: brand.secondary },
  dark: { backgroundColor: neutral[1000] },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: primary[400],
  },
  ghost: { paddingVertical: 4 },
};

const variantTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: neutral[0] },
  secondary: { color: neutral[0] },
  dark: { color: neutral[0] },
  outline: { color: primary[400] },
  ghost: { color: primary[400], fontSize: 16 },
};
