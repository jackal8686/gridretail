export interface ProductSpecification {
  name: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  currency: string;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  thumbnailColor?: string;
  description: string;
  storeId?: string;
  storeName?: string;
  createdAt: string;
  // Phase 9 extensions
  imageUrl?: string;
  additionalImages?: string[];
  compareAtPrice?: number;
  variants?: string[];
  specifications?: ProductSpecification[] | Record<string, string>;
  status?: "active" | "draft";
}

