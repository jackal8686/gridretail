export type DeploymentProvider =
  | "mock"
  | "cloudflare_pages"
  | "vercel"
  | "aws_s3";

export type DeploymentStatus =
  | "pending"
  | "building"
  | "deploying"
  | "ready"
  | "failed";

export interface DeploymentRecord {
  id: string;
  storeId: string;
  storeName: string;
  provider: DeploymentProvider;
  status: DeploymentStatus;
  stagingUrl?: string;
  externalDeploymentId?: string;
  deployedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  errorMessage?: string;
  metadata?: {
    fileCount?: number;
    bundleSizeBytes?: number;
    commitHash?: string;
    branchName?: string;
    customDomain?: string;
    [key: string]: unknown;
  };
}

export interface DeploymentResult {
  success: boolean;
  deployment: DeploymentRecord;
  message?: string;
}
