export type ShareStatus = "active" | "expired" | "revoked";

export interface PreviewShare {
  id: string;
  storeId: string;
  storeSlug: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  revokedAt?: string | null;
  revokedBy?: string | null;
  status: ShareStatus;
  accessCount: number;
  lastAccessedAt?: string | null;
  clientName?: string;
}

export interface CreatePreviewShareInput {
  storeId: string;
  durationHours?: number; // Defaults to 72 hours (3 days)
}

export interface PreviewShareResult {
  share: PreviewShare;
  rawToken: string; // ONLY returned immediately upon creation
  previewUrl: string;
}
