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
  selectedProductIds?: string[];
}

export type CustomizerToIframeMessage =
  | { type: "GRIDRETAIL_PREVIEW_INIT" }
  | { type: "GRIDRETAIL_PREVIEW_UPDATE"; payload: PreviewUpdatePayload };

export type IframeToCustomizerMessage =
  | { type: "GRIDRETAIL_PREVIEW_READY"; slug: string }
  | { type: "GRIDRETAIL_PREVIEW_ACK"; timestamp: number }
  | { type: "GRIDRETAIL_PREVIEW_ERROR"; error: string };

export function isValidPreviewUpdatePayload(data: unknown): data is PreviewUpdatePayload {
  if (!data || typeof data !== "object") return false;
  return true;
}
