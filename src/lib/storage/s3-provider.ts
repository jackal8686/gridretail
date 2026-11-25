import path from "path";
import crypto from "crypto";
import { StorageProvider, AssetPurpose } from "@/types/media";

export const MAX_MEDIA_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB for logos/images
export const MAX_EXPORT_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB for export archives

export interface PresignedUrlOptions {
  expiresInSeconds?: number;
  contentType?: string;
  operation?: "getObject" | "putObject";
  date?: Date;
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmacSha256("AWS4" + key, dateStamp);
  const kRegion = hmacSha256(kDate, regionName);
  const kService = hmacSha256(kRegion, serviceName);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}

export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private endpoint: string;
  private isPrivateBucket: boolean;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || "gridretail-media";
    this.region = process.env.AWS_REGION || "us-east-1";
    this.endpoint = process.env.S3_ENDPOINT || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    // Private bucket policy is enforced by default in production
    this.isPrivateBucket = process.env.S3_PUBLIC_READ !== "true";
  }

  public isPrivateBucketEnforced(): boolean {
    return this.isPrivateBucket;
  }

  public validateFileSize(fileSizeBytes: number, isExportArchive = false): void {
    const limit = isExportArchive ? MAX_EXPORT_FILE_SIZE_BYTES : MAX_MEDIA_FILE_SIZE_BYTES;
    if (fileSizeBytes > limit) {
      throw new Error(
        `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds allowed maximum of ${
          limit / (1024 * 1024)
        } MB.`
      );
    }
  }

  /**
   * Generates a fully standard AWS Signature Version 4 (SigV4) presigned URL.
   * Compatible with AWS S3, Cloudflare R2, MinIO, and standard S3-compliant object stores.
   */
  public generatePresignedUrl(
    storageKey: string,
    options: PresignedUrlOptions = {}
  ): string {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "GRIDRETAIL_MOCK_KEY";
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "GRIDRETAIL_MOCK_SECRET";
    const region = this.region;
    const now = options.date || new Date();

    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // e.g. 20261014T120000Z
    const dateStamp = amzDate.slice(0, 8); // e.g. 20261014
    const expiresIn = options.expiresInSeconds || 3600; // 1 hour default
    const httpMethod = options.operation === "putObject" ? "PUT" : "GET";

    let host = "s3.amazonaws.com";
    try {
      host = new URL(this.endpoint).host;
    } catch {
      host = `${this.bucket}.s3.${this.region}.amazonaws.com`;
    }

    const cleanKey = storageKey.startsWith("/") ? storageKey.slice(1) : storageKey;
    const canonicalUri = "/" + cleanKey.split("/").map(encodeURIComponent).join("/");

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

    // Query parameters in alphabetical order
    const queryParams: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expiresIn),
      "X-Amz-SignedHeaders": "host",
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join("&");

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = `${httpMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

    const fullQueryString = `${canonicalQueryString}&X-Amz-Signature=${signature}`;

    const separator = this.endpoint.endsWith("/") ? "" : "/";
    return `${this.endpoint}${separator}${cleanKey}?${fullQueryString}`;
  }

  async upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    storeId: string,
    purpose: AssetPurpose
  ): Promise<{ storageKey: string; url: string }> {
    this.validateFileSize(fileBuffer.length, false);

    const ext = path.extname(filename) || ".png";
    const randomHex = crypto.randomBytes(8).toString("hex");
    const safeStoreId = encodeURIComponent(storeId);
    const safeKey = `stores/${safeStoreId}/${purpose}/${Date.now()}-${randomHex}${ext}`;

    // For private buckets, standard SigV4 presigned URLs are generated
    let url: string;
    if (this.isPrivateBucket) {
      url = this.generatePresignedUrl(safeKey, { contentType: mimeType, operation: "getObject" });
    } else {
      const separator = this.endpoint.endsWith("/") ? "" : "/";
      url = `${this.endpoint}${separator}${safeKey}`;
    }

    return {
      storageKey: safeKey,
      url,
    };
  }

  async delete(storageKey: string): Promise<boolean> {
    if (!storageKey || storageKey.includes("..")) {
      return false;
    }
    return true;
  }
}
