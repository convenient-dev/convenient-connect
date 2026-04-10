import { Platform } from 'react-native';

export const Colors = {
  // Primary — teal
  primary: {
    50:  '#edfafa',
    100: '#d0f2f4',
    200: '#a3e5ea',
    300: '#6dd4dc',
    400: '#58c6ce', // brand primary
    500: '#3aabb5',
    600: '#2b8d96',
    700: '#1f6e76',
    800: '#155058',
    900: '#0c343a',
  },

  // Secondary — red
  secondary: {
    50:  '#fdf2f2',
    100: '#fce0df',
    200: '#f8bab8',
    300: '#f28d8a',
    400: '#e85f5b',
    500: '#c54038', // brand secondary
    600: '#a83530',
    700: '#882a26',
    800: '#671f1c',
    900: '#451412',
  },

  // Neutrals
  neutral: {
    0:   '#ffffff',
    50:  '#f7f7f7',
    100: '#ebebeb',
    200: '#d6d6d6',
    300: '#afafaf',
    400: '#888888',
    500: '#666666',
    600: '#444444',
    700: '#2e2e2e',
    800: '#1e1e1e',
    900: '#111111',
    1000: '#000000',
  },

  // Semantic aliases
  brand: {
    primary:   '#58c6ce',
    secondary: '#c54038',
  },

  text: {
    primary:   '#000000',
    secondary: 'rgba(0,0,0,0.8)',
    muted:     '#afafaf',
    inverse:   '#ffffff',
    link:      '#58c6ce',
  },

  background: {
    screen: '#ffffff',
    card:   '#ffffff',
    subtle: 'rgba(234,234,234,0.3)',
  },

  border: {
    default: '#ebebeb',
  },

  // Light / dark surface tokens (kept for useThemeColor compatibility)
  light: {
    text:           '#11181C',
    background:     '#ffffff',
    tint:           '#58c6ce',
    icon:           '#687076',
    tabIconDefault: '#afafaf',
    tabIconSelected:'#58c6ce',
  },
  dark: {
    text:           '#ECEDEE',
    background:     '#151718',
    tint:           '#58c6ce',
    icon:           '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected:'#58c6ce',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
