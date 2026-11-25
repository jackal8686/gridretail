import { SectionInstance, SectionType } from "@/types/section";
import { StoreStylingTokens, StoreBranding } from "@/types/store";

export type ViewportMode = "desktop" | "tablet" | "mobile";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export type LeftPanelTab = "layers" | "add-section" | "pages" | "styling";

export type RightPanelTab = "content" | "typography" | "layout" | "appearance" | "advanced";

export interface EditorPageItem {
  id: string;
  label: string;
  path: string;
  category?: "main" | "catalog" | "service" | "info";
  description?: string;
  isAvailable?: boolean;
}

export type SectionLibraryCategory =
  | "all"
  | "hero"
  | "content"
  | "products"
  | "services"
  | "booking"
  | "lead_gen"
  | "info"
  | "social_proof"
  | "contact"
  | "footer";

export interface SectionLibraryItem {
  type: SectionType;
  category: SectionLibraryCategory;
  name: string;
  description: string;
  icon: string;
  compatibleWebsiteTypes: Array<"ecommerce" | "appointments" | "lead_gen">;
  defaultSettings: Record<string, unknown>;
  defaultLayout: string;
}

export interface EditorSnapshot {
  templateId: string;
  themeId: string;
  storeName: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl?: string;
  bannerUrl?: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutText: string;
  ctaText: string;
  enabledSections: string[];
  orderedSections: string[];
  sections: SectionInstance[];
  pageSections?: Record<string, SectionInstance[]>;
  styling: StoreStylingTokens;
  branding?: StoreBranding;
  selectedSectionId?: string | null;
  timestamp?: number;
}
