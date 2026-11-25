import { SectionInstance } from "./section";
import { WebsiteType, AppointmentIndustry, AppointmentConfig } from "./appointment";
import { BusinessProfile } from "./business-profile";

export type StoreStatus = 
  | "Draft" 
  | "In Progress" 
  | "Pending Review" 
  | "Approved"
  | "Changes Requested"
  | "Published" 
  | "Archived";

export type IndustryType = 
  | "Fashion & Apparel"
  | "Electronics & Gadgets"
  | "Home & Living"
  | "Beauty & Cosmetics"
  | "Food & Gourmet"
  | "Health & Wellness"
  | "Luxury Goods"
  | "Sports & Outdoors"
  | "Legal & Advisory"
  | "Professional Services";

export interface StoreBranding {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily: string;
  logoUrl?: string;
  bannerUrl?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  aboutText?: string;
  ctaText?: string;
  badge?: string;
  bulletPoints?: string[];
}

export interface StoreCategory {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  order?: number;
}


export interface StoreStylingTokens {
  buttonRadius?: "sharp" | "rounded" | "pill";
  cardStyle?: "flat" | "bordered" | "elevated" | "floating";
  headerSticky?: boolean;
  headerStyle?: "standard" | "translucent" | "minimal";
  contentWidth?: "compact" | "normal" | "wide";
  spacingDensity?: "compact" | "normal" | "spacious";
  typographyHeadingFont?: string;
  typographyBodyFont?: string;
  formStyle?: "minimal" | "bordered" | "filled" | "floating";
  shadowScale?: "none" | "subtle" | "medium" | "dramatic";
  colorMode?: "auto" | "light" | "dark";
  heroVariation?: "centered" | "split" | "image_bg" | "editorial" | "minimal" | "product_spotlight" | "service_booking" | "form_conversion" | "media_showcase" | "asymmetric";
  headerVariation?: "minimal" | "corporate" | "centered_logo" | "transparent" | "commerce_cart" | "appointment_cta" | "lead_inquiry";
  footerVariation?: "minimal_inline" | "multi_column" | "business_info" | "commerce_directory" | "service_practitioner" | "contact_focused";
  cardVariation?: "flat" | "bordered" | "elevated" | "floating" | "block_solid" | "soft_rounded";
  imagePosition?: "left" | "right" | "center";
  typographyScale?: "compact" | "balanced" | "prominent";
}

export interface StoreSeoConfig {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  clientName: string;
  clientId: string;
  industry: IndustryType;
  templateId: string;
  templateName: string;
  themeId?: string;
  themeName?: string;
  status: StoreStatus;
  productCount: number;
  previewUrl?: string;
  localUrl?: string;
  lastUpdated: string;
  createdAt: string;
  description: string;
  branding?: StoreBranding;
  enabledSections?: string[];
  orderedSections?: string[];
  selectedProductIds?: string[];
  categories?: StoreCategory[];
  creatorId?: string;
  creatorName?: string;
  assignedTeamId?: string;
  sections?: SectionInstance[];
  pageSections?: Record<string, SectionInstance[]>;
  styling?: StoreStylingTokens;
  seo?: StoreSeoConfig;
  websiteType?: WebsiteType;
  appointmentIndustry?: AppointmentIndustry;
  appointmentConfig?: AppointmentConfig;
  businessProfile?: BusinessProfile;
  version?: number;
}

export interface CreateStoreInput {
  name: string;
  slug: string;
  clientId: string;
  industry: IndustryType;
  templateId: string;
  themeId?: string;
  themeName?: string;
  description?: string;
  branding?: Partial<StoreBranding>;
  enabledSections?: string[];
  orderedSections?: string[];
  selectedProductIds?: string[];
  categories?: StoreCategory[];
  products?: Record<string, unknown>[];
  sections?: SectionInstance[];
  pageSections?: Record<string, SectionInstance[]>;
  styling?: StoreStylingTokens;
  seo?: StoreSeoConfig;
  websiteType?: WebsiteType;
  appointmentIndustry?: AppointmentIndustry;
  appointmentConfig?: AppointmentConfig;
  initialServices?: Record<string, unknown>[];
  initialProviders?: Record<string, unknown>[];
  leadTemplateId?: string;
  leadFormTitle?: string;
  businessProfile?: BusinessProfile;
}

export type UpdateStoreInput = Partial<Omit<Store, "branding">> & {
  branding?: Partial<StoreBranding>;
  serverAutoVersion?: boolean;
  allowUnversioned?: boolean;
};



