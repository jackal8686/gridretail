export type SectionCategory =
  | "hero"
  | "products"
  | "editorial"
  | "info"
  | "footer";

export type SectionType =
  // Hero & Promotional
  | "hero_full_width"
  | "hero_split"
  | "hero_product_showcase"
  | "hero_minimal"
  | "hero_cinematic"
  | "promotional_banner"
  | "multi_slide_carousel"
  // Products & Collections
  | "featured_products"
  | "bestsellers_grid"
  | "new_arrivals"
  | "collection_showcase"
  | "product_comparison"
  | "product_discovery_cta"
  // Brand & Editorial
  | "brand_story"
  | "craftsmanship_process"
  | "lifestyle_editorial_grid"
  | "lookbook_gallery"
  | "brand_values"
  | "timeline_milestones"
  // Information & Conversion
  | "benefits_grid"
  | "how_it_works"
  | "faq_accordion"
  | "shipping_returns"
  | "contact_info"
  | "newsletter_signup"
  | "announcement_strip"
  | "trust_badges"
  | "verified_statistics_bar"
  | "custom_rich_text"
  | "footer_custom";

export interface SectionLayoutVariant {
  id: string;
  label: string;
  description?: string;
  previewHint?: string;
}

export type SectionFieldType =
  | "text"
  | "textarea"
  | "image"
  | "url"
  | "select"
  | "boolean"
  | "number"
  | "items_list";

export interface SectionFieldOption {
  label: string;
  value: string;
}

export interface SectionFieldDefinition {
  key: string;
  label: string;
  type: SectionFieldType;
  options?: SectionFieldOption[];
  itemSchema?: Record<string, { label: string; type: SectionFieldType; placeholder?: string }>;
  defaultValue?: unknown;
  placeholder?: string;
  helpText?: string;
}

export interface SectionDefinition {
  type: SectionType;
  category: SectionCategory;
  name: string;
  description: string;
  icon: string;
  defaultLayout: string;
  availableLayouts: SectionLayoutVariant[];
  defaultSettings: Record<string, unknown>;
  recommendedIndustries?: string[];
  fields: SectionFieldDefinition[];
}

export interface SectionInstance {
  id: string; // e.g., "sec_hero_171928"
  type: SectionType;
  layoutVariant?: string;
  visible: boolean;
  order: number;
  settings: Record<string, unknown>;
  customTitle?: string;
}
