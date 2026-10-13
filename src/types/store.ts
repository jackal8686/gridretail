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
  | "Sports & Outdoors";

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
  status: StoreStatus;
  productCount: number;
  previewUrl?: string;
  lastUpdated: string;
  createdAt: string;
  description: string;
  branding?: StoreBranding;
  enabledSections?: string[];
  selectedProductIds?: string[];
  creatorId?: string;
  creatorName?: string;
}

export interface CreateStoreInput {
  name: string;
  slug: string;
  clientId: string;
  industry: IndustryType;
  templateId: string;
  description?: string;
  branding?: Partial<StoreBranding>;
  enabledSections?: string[];
  selectedProductIds?: string[];
}
