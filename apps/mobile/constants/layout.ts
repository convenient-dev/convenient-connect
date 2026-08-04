import { useWindowDimensions, type ViewStyle } from "react-native";

/**
 * Screen content spans the full window width on every display. This style is
 * applied to main content columns and footers across screens; it currently has
 * no visual effect and exists as a single hook to reintroduce a width cap
 * later if needed.
 */
export const contentWidthStyle: ViewStyle = {
  width: "100%",
  alignSelf: "center",
};

/**
 * Max width for bottom sheets on large displays — foldables like the Galaxy
 * Z Fold main screen (~800dp wide) and tablets. Below this width it has no
 * effect.
 */
export const MAX_SHEET_WIDTH = 600;

/** Max width for centered dialog cards (ConfirmModal, AddressModal, etc.). */
export const MAX_DIALOG_WIDTH = 420;

/** Max width for full-width (lg) buttons so CTAs don't stretch edge-to-edge on wide displays. */
export const MAX_BUTTON_WIDTH = 400;

/**
 * Window width at which card lists switch to two columns (see CardGrid).
 * Covers the Z Fold main display (~800dp) and tablets; phone and cover
 * screens stay single-column.
 */
export const TWO_COLUMN_BREAKPOINT = 700;

/** Base horizontal screen padding, used by headers and content columns. */
export const SCREEN_PADDING = 20;

/** Total horizontal screen padding on wide displays (Z Fold main screen, tablets). */
export const SCREEN_PADDING_WIDE = 100;

/**
 * Responsive horizontal padding based on the window width:
 * `screenPaddingStyle` is `base` below TWO_COLUMN_BREAKPOINT and `wide` at or
 * above it (Z Fold main screen, tablets).
 *
 * The defaults are tuned for the screen container (SafeAreaView): headers and
 * content columns keep their own SCREEN_PADDING, so on wide displays the
 * container adds only the difference up to SCREEN_PADDING_WIDE, insetting
 * everything on the screen together; on phones it adds nothing. Pass explicit
 * values to pad a specific container instead, e.g.
 * `useResponsivePadding(32, 100)`.
 */
export function useResponsivePadding(
  base = 0,
  wide = SCREEN_PADDING_WIDE - SCREEN_PADDING,
): {
  isWideScreen: boolean;
  /** The numeric padding applied per side — for layout math that must subtract it. */
  screenPadding: number;
  screenPaddingStyle: ViewStyle;
} {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= TWO_COLUMN_BREAKPOINT;
  const screenPadding = isWideScreen ? wide : base;
  return {
    isWideScreen,
    screenPadding,
    screenPaddingStyle: {
      paddingHorizontal: screenPadding,
    },
  };
}
