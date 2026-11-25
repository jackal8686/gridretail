export type TemplateStyle = 
  | "Editorial & Minimal" 
  | "High-Tech Dark" 
  | "Warm Organic" 
  | "Vibrant Modern" 
  | "Classic Boutique" 
  | "Bold Grid" 
  | "Clean Nordic" 
  | "Luxury Haute";

/**
 * Legacy Template interface preserved for backward compatibility
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  industry: string;
  style: TemplateStyle;
  featured: boolean;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  layoutType: "Grid" | "Split" | "Editorial" | "Showcase";
  compatibleIndustries: string[];
  thumbnailGradient: string;
}

/**
 * 12 Coordinated Color Theme Specification
 */
export interface ColorThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  cardBg: string;
  badgeBg: string;
  badgeText: string;
}

export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  tokens: ColorThemeTokens;
  previewSwatches: string[];
  suitableIndustries: string[];
}

/**
 * 8 Distinct Website Design Template Specification
 */
export interface DesignTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  layoutFamily: 
    | "Modern Minimal" 
    | "Luxury Editorial" 
    | "Bold & Vibrant" 
    | "Classic Commerce" 
    | "Editorial Magazine" 
    | "Organic & Natural" 
    | "Tech & Futuristic" 
    | "Playful & Creative";
  designCharacteristics: string[];
  suitableUseCases: string[];
  compatibleIndustries: string[];
  thumbnailGradient: string;
  featured: boolean;
  headerLayout: "floating-minimal" | "centered-luxury" | "bold-announcement" | "multi-tier-utility" | "magazine-headline" | "organic-soft" | "technical-hud" | "playful-banner";
  heroLayout: "split-showcase" | "cinematic-framed" | "high-impact-blocks" | "commercial-banner" | "magazine-story" | "organic-flow" | "cyber-specs" | "asymmetric-cards";
  cardLayout: "understated" | "tall-editorial" | "block-solid" | "classic-rating" | "captioned-story" | "soft-rounded" | "monospaced-grid" | "sticker-playful";
}
