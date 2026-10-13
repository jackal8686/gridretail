export type DeliveryMode = "bundle_export" | "platform_publish" | "hosted_deploy";

export type DeliveryStatus = "pending" | "completed" | "failed";

export type DeliveryFormat = "zip" | "json" | "directory";

export interface DeliveryRecord {
  id: string;
  storeId: string;
  storeName: string;
  mode: DeliveryMode;
  status: DeliveryStatus;
  format: DeliveryFormat;
  artifactUrl?: string;
  artifactName?: string;
  fileSizeBytes?: number;
  checksumSha256?: string;
  publishedUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
  errorMessage?: string;
}

export interface CreateDeliveryInput {
  storeId: string;
  storeName: string;
  mode: DeliveryMode;
  format?: DeliveryFormat;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}
