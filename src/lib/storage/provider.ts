import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { StorageProvider, AssetPurpose } from "@/types/media";

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "public", "uploads");
  }

  private async ensureDir(dirPath: string) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // directory already exists
    }
  }

  async upload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    storeId: string,
    purpose: AssetPurpose
  ): Promise<{ storageKey: string; url: string }> {
    const ext = path.extname(filename) || ".png";
    const safeStoreId = path.basename(storeId);
    const randomHex = crypto.randomBytes(8).toString("hex");
    const safeKey = `${safeStoreId}/${purpose}-${Date.now()}-${randomHex}${ext}`;

    const fullPath = path.resolve(this.baseDir, safeKey);
    if (!fullPath.toLowerCase().startsWith(this.baseDir.toLowerCase())) {
      throw new Error("Invalid storage path");
    }

    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, fileBuffer);

    return {
      storageKey: safeKey,
      url: `/uploads/${safeKey.replace(/\\/g, "/")}`,
    };
  }

  async delete(storageKey: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.baseDir, path.normalize(storageKey));
      if (!fullPath.toLowerCase().startsWith(this.baseDir.toLowerCase())) {
        return false;
      }
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

import { S3StorageProvider } from "./s3-provider";

export { S3StorageProvider };

export function getStorageProvider(): StorageProvider {
  // If S3 or R2 environment credentials are provided, use S3 provider; otherwise local provider
  if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
}
