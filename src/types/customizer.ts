import { SectionInstance } from "./section";
import { StoreStylingTokens } from "./store";

export interface PreviewUpdatePayload {
  name?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    bannerUrl?: string;
    heroHeadline?: string;
    heroSubheadline?: string;
    aboutText?: string;
    ctaText?: string;
  };
  enabledSections?: string[];
  orderedSections?: string[];
  selectedProductIds?: string[];
  templateId?: string;
  themeId?: string;
  sections?: SectionInstance[];
  pageSections?: Record<string, SectionInstance[]>;
  currentPageId?: string;
  styling?: StoreStylingTokens;
}



export type CustomizerToIframeMessage =
  | { type: "GRIDRETAIL_PREVIEW_INIT" }
  | { type: "GRIDRETAIL_PREVIEW_UPDATE"; payload: PreviewUpdatePayload }
  | { type: "GRIDRETAIL_SECTION_SELECT"; sectionId: string | null };

export type IframeToCustomizerMessage =
  | { type: "GRIDRETAIL_PREVIEW_READY"; slug: string }
  | { type: "GRIDRETAIL_PREVIEW_ACK"; timestamp: number }
  | { type: "GRIDRETAIL_PREVIEW_ERROR"; error: string }
  | { type: "GRIDRETAIL_SECTION_SELECT"; sectionId: string }
  | { type: "GRIDRETAIL_INLINE_UPDATE"; sectionId: string; field: string; value: string };

export function isValidPreviewUpdatePayload(data: unknown): data is PreviewUpdatePayload {
  if (!data || typeof data !== "object") return false;
  return true;
}
