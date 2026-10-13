export type StoreStatus = "Draft" | "In Progress" | "Pending Review" | "Published";

export type IndustryType = 
  | "Fashion & Apparel"
  | "Electronics & Gadgets"
  | "Home & Living"
  | "Beauty & Cosmetics"
  | "Food & Gourmet"
  | "Health & Wellness"
  | "Luxury Goods"
  | "Sports & Outdoors";

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
}
