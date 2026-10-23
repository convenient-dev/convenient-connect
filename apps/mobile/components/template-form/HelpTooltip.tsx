import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

const { neutral, background, border } = Colors;

const ICON_SIZE = 16;
const HIT_SLOP = 8;
const BUBBLE_MAX_WIDTH = 280;
const BUBBLE_MARGIN = 12;
const ARROW_SIZE = 8;

interface Props {
  text: string;
  /** Accessibility label for the icon; defaults to "More information". */
  label?: string;
}

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * An "i" icon that shows `text` in a popover anchored to the icon when tapped.
 * Tapping anywhere outside the bubble dismisses it.
 */
export function HelpTooltip({ text, label = "More information" }: Props) {
  const iconRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  function open() {
    iconRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }

  function close() {
    setAnchor(null);
  }

  let bubbleStyle = {};
  let arrowStyle = {};
  if (anchor) {
    const bubbleWidth = Math.min(BUBBLE_MAX_WIDTH, screenWidth - BUBBLE_MARGIN * 2);
    const iconCenterX = anchor.x + anchor.width / 2;
    const left = Math.min(
      Math.max(BUBBLE_MARGIN, iconCenterX - bubbleWidth / 2),
      screenWidth - BUBBLE_MARGIN - bubbleWidth,
    );
    // Show below the icon unless it sits in the lower part of the screen.
    const showBelow = anchor.y < screenHeight * 0.6;
    bubbleStyle = showBelow
      ? { top: anchor.y + anchor.height + ARROW_SIZE, left, width: bubbleWidth }
      : { bottom: screenHeight - anchor.y + ARROW_SIZE, left, width: bubbleWidth };
    arrowStyle = showBelow
      ? { top: anchor.y + anchor.height, left: iconCenterX - ARROW_SIZE, ...styles.arrowDown }
      : { top: anchor.y - ARROW_SIZE, left: iconCenterX - ARROW_SIZE, ...styles.arrowUp };
  }

  return (
    <>
      <Pressable
        ref={iconRef}
        onPress={open}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.icon}
      >
        <Feather name="info" size={ICON_SIZE} color={neutral[400]} />
      </Pressable>

      <Modal
        visible={anchor !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close">
          <View style={[styles.arrow, arrowStyle]} />
          <View style={[styles.bubble, bubbleStyle]}>
            <Text style={styles.text}>{text}</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
  },
  bubble: {
    position: "absolute",
    backgroundColor: background.card,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: neutral[1000],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  text: {
    fontSize: 13,
    color: neutral[600],
    lineHeight: 19,
  },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  arrowDown: {
    borderBottomWidth: ARROW_SIZE,
    borderBottomColor: border.default,
  },
  arrowUp: {
    borderTopWidth: ARROW_SIZE,
    borderTopColor: border.default,
  },
});
