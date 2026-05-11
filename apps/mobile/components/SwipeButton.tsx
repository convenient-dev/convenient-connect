import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { primary, neutral } = Colors;

const THUMB_SIZE = 44;
const TRACK_PADDING = 6;
const TRACK_HEIGHT = 56;
const COMPLETE_THRESHOLD = 0.85;

interface SwipeButtonProps {
  label: string;
  onComplete: () => void;
  trackColor?: string;
  thumbColor?: string;
  thumbIconColor?: string;
}

export function SwipeButton({
  label,
  onComplete,
  trackColor = primary[300],
  thumbColor = neutral[0],
  thumbIconColor = primary[400],
}: SwipeButtonProps) {
  const trackWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  function handleLayout(e: LayoutChangeEvent) {
    trackWidth.value = e.nativeEvent.layout.width;
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      const max = trackWidth.value - THUMB_SIZE - TRACK_PADDING * 2;
      translateX.value = Math.min(Math.max(e.translationX, 0), max);
    })
    .onEnd(() => {
      const max = trackWidth.value - THUMB_SIZE - TRACK_PADDING * 2;
      if (max > 0 && translateX.value >= max * COMPLETE_THRESHOLD) {
        translateX.value = withTiming(max, { duration: 120 }, () => {
          runOnJS(onComplete)();
          translateX.value = withSpring(0);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const labelStyle = useAnimatedStyle(() => {
    const max = trackWidth.value - THUMB_SIZE - TRACK_PADDING * 2;
    const progress = max > 0 ? translateX.value / max : 0;
    return { opacity: 1 - progress };
  });

  return (
    <View
      style={[styles.track, { backgroundColor: trackColor }]}
      onLayout={handleLayout}
    >
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.thumb, { backgroundColor: thumbColor }, thumbStyle]}
        >
          <MaterialIcons
            name="keyboard-double-arrow-right"
            size={22}
            color={thumbIconColor}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: TRACK_PADDING,
    overflow: "hidden",
  },
  thumb: {
    position: "absolute",
    left: TRACK_PADDING,
    top: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: neutral[0],
    textAlign: "center",
    letterSpacing: -0.408,
  },
});
