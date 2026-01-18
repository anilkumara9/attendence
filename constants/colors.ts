const palette = {
  ink: "#1A1A1A",
  paper: "#FDFCFB",
  card: "#FFFFFF",
  muted: "#757575",
  border: "#F0EBE6",
  accent: "#FF7A00",
  accent2: "#12B76A",
  danger: "#E11D48",
  warning: "#F59E0B",
  night: "#000000",
} as const;

const Colors = {
  light: {
    text: palette.ink,
    background: palette.paper,
    card: palette.card,
    muted: palette.muted,
    border: palette.border,
    tint: palette.accent,
    success: palette.accent2,
    danger: palette.danger,
    warning: palette.warning,
    tabIconDefault: "#98A2B3",
    tabIconSelected: palette.accent,
  },
  dark: {
    text: "#FFFFFF",
    background: "#000000",
    card: "#121212",
    muted: "#8E8E93",
    border: "#262626",
    tint: palette.accent,
    success: palette.accent2,
    danger: palette.danger,
    warning: palette.warning,
    tabIconDefault: "#636366",
    tabIconSelected: palette.accent,
  },
  palette,
} as const;

export interface Theme {
  text: string;
  background: string;
  card: string;
  muted: string;
  border: string;
  tint: string;
  success: string;
  danger: string;
  warning: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

export default Colors;
