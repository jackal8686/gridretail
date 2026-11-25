import fs from "fs/promises";
import path from "path";

export interface RetentionPolicy {
  maxAgeDays: number;
  maxExportFileSizeMb: number;
  maxMediaFileSizeMb: number;
  privateBucketPolicyEnforced: boolean;
}

export interface RetentionScanResult {
  scannedFiles: number;
  expiredFiles: string[];
  removedFiles: string[];
  freedBytes: number;
  dryRun: boolean;
}

export function getRetentionPolicy(): RetentionPolicy {
  return {
    maxAgeDays: parseInt(process.env.ARTIFACT_RETENTION_DAYS || "30", 10),
    maxExportFileSizeMb: 50,
    maxMediaFileSizeMb: 5,
    privateBucketPolicyEnforced: process.env.S3_PUBLIC_READ !== "true",
  };
}

/**
 * Scans local storage directories and cleans up files older than the retention threshold.
 */
export async function cleanExpiredArtifacts(options: {
  maxAgeDays?: number;
  dryRun?: boolean;
  targetDir?: string;
} = {}): Promise<RetentionScanResult> {
  const policy = getRetentionPolicy();
  const maxAgeDays = options.maxAgeDays ?? policy.maxAgeDays;
  const dryRun = options.dryRun ?? false;
  const baseDir = options.targetDir || path.join(process.cwd(), "storage", "exports");

  const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const expiredFiles: string[] = [];
  const removedFiles: string[] = [];
  let freedBytes = 0;
  let scannedFiles = 0;

  async function walkDir(currentDir: string) {
    let entries: string[];
    try {
      entries = await fs.readdir(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.resolve(currentDir, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await walkDir(fullPath);
        } else if (stat.isFile()) {
          scannedFiles++;
          if (stat.mtimeMs < cutoffTime) {
            expiredFiles.push(fullPath);
            freedBytes += stat.size;
            if (!dryRun) {
              await fs.unlink(fullPath);
              removedFiles.push(fullPath);
            }
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  await walkDir(baseDir);

  return {
    scannedFiles,
    expiredFiles,
    removedFiles,
    freedBytes,
    dryRun,
  };
}
