/**
 * Centralized GridRetail Design System Tokens
 * Defines primary palette, surfaces, typography, borders and semantic states.
 */
export const brandTokens = {
  colors: {
    primary: "#176B4D",
    primaryDark: "#104D38",
    primaryLight: "#E2F5E9",
    background: "#FAF9F6",
    surface: "#FFFFFF",
    textPrimary: "#18231E",
    textSecondary: "#66736C",
    border: "#E4E9E5",
    borderSubtle: "#F0F4F1",
    success: "#16804A",
    successLight: "#EAF7EE",
    warning: "#B7791F",
    warningLight: "#FEF7E6",
    error: "#C43D3D",
    errorLight: "#FDEAEA",
  },
  typography: {
    fontSans: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "var(--font-geist-mono), monospace",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(24, 35, 30, 0.04)",
    md: "0 4px 6px -1px rgba(24, 35, 30, 0.06), 0 2px 4px -2px rgba(24, 35, 30, 0.04)",
    lg: "0 10px 15px -3px rgba(24, 35, 30, 0.08), 0 4px 6px -4px rgba(24, 35, 30, 0.03)",
  },
} as const;

export type BrandTokens = typeof brandTokens;
