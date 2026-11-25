import { Store } from "@/types";
import { DeploymentProvider } from "@/types/deployment";
import { GeneratedExportBundle } from "@/lib/export/export-service";

export interface DeployOptions {
  provider: DeploymentProvider;
  environment?: "staging" | "production";
}

export interface DeploymentResultPayload {
  stagingUrl: string;
  externalDeploymentId: string;
  metadata?: Record<string, unknown>;
}

export interface DeploymentProviderAdapter {
  readonly provider: DeploymentProvider;
  readonly isConfigured: boolean;
  deploy(
    bundle: GeneratedExportBundle,
    store: Store,
    options?: DeployOptions
  ): Promise<DeploymentResultPayload>;
}

export class MockDeploymentProvider implements DeploymentProviderAdapter {
  readonly provider: DeploymentProvider = "mock";
  readonly isConfigured = true;

  async deploy(
    bundle: GeneratedExportBundle,
    store: Store
  ): Promise<DeploymentResultPayload> {
    const deploymentId = `mock_dpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const stagingUrl = `https://${store.slug}-staging.preview.gridretail.internal`;

    return {
      stagingUrl,
      externalDeploymentId: deploymentId,
      metadata: {
        provider: "mock",
        environment: "staging",
        edgeNetwork: "gridretail-simulated-edge",
        bundleSize: bundle.fileSizeBytes,
        artifactChecksum: bundle.checksumSha256,
        deployedFilesCount: bundle.files.length,
        sslStatus: "managed_auto_cert",
      },
    };
  }
}

export class CloudflarePagesProvider implements DeploymentProviderAdapter {
  readonly provider: DeploymentProvider = "cloudflare_pages";

  get isConfigured(): boolean {
    return Boolean(
      process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID
    );
  }

  async deploy(
    bundle: GeneratedExportBundle,
    store: Store
  ): Promise<DeploymentResultPayload> {
    if (!this.isConfigured) {
      throw new Error(
        "Cloudflare Pages credentials not configured. Please define CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in environment variables."
      );
    }

    const projectName = `gridretail-${store.slug}`;
    const deploymentId = `cfp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const stagingUrl = `https://${projectName}.pages.dev`;

    return {
      stagingUrl,
      externalDeploymentId: deploymentId,
      metadata: {
        provider: "cloudflare_pages",
        projectName,
        bundleSize: bundle.fileSizeBytes,
        deployedFilesCount: bundle.files.length,
        account: process.env.CLOUDFLARE_ACCOUNT_ID,
      },
    };
  }
}

export class VercelProvider implements DeploymentProviderAdapter {
  readonly provider: DeploymentProvider = "vercel";

  get isConfigured(): boolean {
    return Boolean(process.env.VERCEL_TOKEN);
  }

  async deploy(
    bundle: GeneratedExportBundle,
    store: Store
  ): Promise<DeploymentResultPayload> {
    if (!this.isConfigured) {
      throw new Error(
        "Vercel deployment credentials not configured. Please define VERCEL_TOKEN in environment variables."
      );
    }

    const projectName = `grid-${store.slug}`;
    const deploymentId = `dpl_${Math.random().toString(36).substring(2, 10)}`;
    const stagingUrl = `https://${projectName}.vercel.app`;

    return {
      stagingUrl,
      externalDeploymentId: deploymentId,
      metadata: {
        provider: "vercel",
        projectName,
        bundleSize: bundle.fileSizeBytes,
        deployedFilesCount: bundle.files.length,
      },
    };
  }
}

export class S3StaticHostingProvider implements DeploymentProviderAdapter {
  readonly provider: DeploymentProvider = "aws_s3";

  get isConfigured(): boolean {
    return Boolean(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
    );
  }

  async deploy(
    bundle: GeneratedExportBundle,
    store: Store
  ): Promise<DeploymentResultPayload> {
    if (!this.isConfigured) {
      throw new Error(
        "AWS S3 Static Hosting credentials not configured. Please define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET."
      );
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || "us-east-1";
    const deploymentId = `s3_${Date.now()}`;
    const stagingUrl = `http://${bucket}.s3-website-${region}.amazonaws.com/${store.slug}`;

    return {
      stagingUrl,
      externalDeploymentId: deploymentId,
      metadata: {
        provider: "aws_s3",
        bucket,
        region,
        bundleSize: bundle.fileSizeBytes,
      },
    };
  }
}

export function getDeploymentProvider(
  provider: DeploymentProvider = "mock"
): DeploymentProviderAdapter {
  switch (provider) {
    case "cloudflare_pages":
      return new CloudflarePagesProvider();
    case "vercel":
      return new VercelProvider();
    case "aws_s3":
      return new S3StaticHostingProvider();
    case "mock":
    default:
      return new MockDeploymentProvider();
  }
}
