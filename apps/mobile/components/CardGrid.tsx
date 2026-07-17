import { TWO_COLUMN_BREAKPOINT } from "@/constants/layout";
import React from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface Props {
  children: React.ReactNode;
  /** Spacing between cards, both within a row and between rows. */
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lays out cards in a single column on phones and two columns on wide
 * displays (Galaxy Z Fold main screen, tablets). Cards must size to their
 * container width, which BookingCard/BookingRequestCard already do.
 */
export function CardGrid({ children, gap = 12, style }: Props) {
  const { width } = useWindowDimensions();
  const twoUp = width >= TWO_COLUMN_BREAKPOINT;
  const items = React.Children.toArray(children);

  if (!twoUp) {
    return <View style={[{ gap }, style]}>{items}</View>;
  }

  return (
    <View
      style={[styles.row, { marginHorizontal: -gap / 2, rowGap: gap }, style]}
    >
      {items.map((child, index) => (
        <View
          key={React.isValidElement(child) && child.key != null ? child.key : index}
          style={[styles.cell, { paddingHorizontal: gap / 2 }]}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "50%",
  },
});
