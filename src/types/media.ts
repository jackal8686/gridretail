export type AssetPurpose = "logo" | "banner" | "product" | "general";

export interface MediaAsset {
  id: string;
  storeId: string;
  purpose: AssetPurpose;
  storageKey: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface StorageProvider {
  upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    storeId: string,
    purpose: AssetPurpose
  ): Promise<{ storageKey: string; url: string }>;
  delete(storageKey: string): Promise<boolean>;
}
