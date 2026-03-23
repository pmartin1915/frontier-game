/**
 * Frontier — Design Tokens
 *
 * Single source of truth for colors, spacing, typography.
 * Per GDD §8.2: near-black on cream, high contrast, western aesthetic.
 */

export const colors = {
  // Backgrounds
  base: '#fdfbf7',
  card: '#f5f0e8',
  button: '#eee8d9',
  buttonHover: '#e4dbc8',
  input: '#f0ece4',
  selected: '#dcd0b8',
  disabled: '#e0dbd0',

  // Accents
  primary: '#5B3A29',
  primaryDark: '#3a2419',
  secondary: '#c4b08b',
  secondaryDark: '#a89770',

  // Text
  text: '#1a1a1a',
  textBody: '#2a2a2a',
  textSecondary: '#5a5a5a',
  textMuted: '#6B6B6B',
  textDisabled: '#8B8B8B',

  // Borders
  borderLight: '#e8dcc8',

  // Semantic
  warning: '#a33',
  success: '#2a6a2a',
  connectionWarning: '#8B6914',

  // Map-specific
  mapPlayerDot: '#D4A017',
  mapAccent: '#8B6914',

  // Active state accents
  activeGreen: '#3a6b3a',
  activeGreenBorder: '#2a4f2a',
  activeGreenText: '#d4f0d4',
  activeRed: '#6b3a3a',
  activeRedBorder: '#4f2a2a',
  activeRedText: '#f0d4d4',

  // Resource thresholds
  resourceGood: '#2a6a2a',
  resourceOk: '#5B3A29',
  resourceLow: '#c4870a',
  resourceCritical: '#a33',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  fontFamily: "'Crimson Text', Georgia, serif",
} as const;

/**
 * Return a color for a 0–100 resource value based on threshold bands.
 * >75 green, 40–75 brown (default), 10–39 amber, <10 red.
 */
export function resourceColor(value: number): string {
  if (value > 75) return colors.resourceGood;
  if (value >= 40) return colors.resourceOk;
  if (value >= 10) return colors.resourceLow;
  return colors.resourceCritical;
}
