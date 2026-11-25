import { cleanExpiredArtifacts, getRetentionPolicy } from "./retention";

export async function runArtifactCleanup(options: { maxAgeDays?: number; dryRun?: boolean } = {}) {
  const policy = getRetentionPolicy();
  const maxAgeDays = options.maxAgeDays ?? policy.maxAgeDays;
  const dryRun = options.dryRun ?? false;

  console.log(`[retention] Starting artifact retention scan (Retention threshold: ${maxAgeDays} days, DryRun: ${dryRun})...`);
  const result = await cleanExpiredArtifacts({ maxAgeDays, dryRun });

  console.log(`[retention] Scanned ${result.scannedFiles} artifact(s).`);
  console.log(
    `[retention] Expired: ${result.expiredFiles.length}, Removed: ${result.removedFiles.length}, Capacity reclaimed: ${(
      result.freedBytes /
      (1024 * 1024)
    ).toFixed(2)} MB.`
  );

  return result;
}

if (require.main === module || process.argv[1]?.includes("clean-artifacts")) {
  const isDryRun = process.argv.includes("--dry-run");
  const ageArg = process.argv.find((a) => a.startsWith("--max-age-days="));
  const maxAgeDays = ageArg ? parseInt(ageArg.split("=")[1], 10) : undefined;

  runArtifactCleanup({ maxAgeDays, dryRun: isDryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[retention] Fatal error during cleanup:", err);
      process.exit(1);
    });
}
