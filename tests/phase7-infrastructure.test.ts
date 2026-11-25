import test from "node:test";
import assert from "node:assert/strict";
import {
  isProductionEnvironment,
  isFallbackAllowed,
  DatabaseUnavailableError,
} from "../src/lib/db/mongodb";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { UserRepository } from "../src/lib/repositories/user.repository";
import { DeliveryRepository } from "../src/lib/repositories/delivery.repository";
import { DeploymentRepository } from "../src/lib/repositories/deployment.repository";
import { runIndexSync } from "../src/lib/db/sync-indexes";
import { verifySmtpConnection, ConsoleMockEmailProvider } from "../src/lib/email/smtp-provider";
import {
  S3StorageProvider,
  MAX_MEDIA_FILE_SIZE_BYTES,
  MAX_EXPORT_FILE_SIZE_BYTES,
} from "../src/lib/storage/s3-provider";
import { getRetentionPolicy, cleanExpiredArtifacts } from "../src/lib/storage/retention";
import { ExportService } from "../src/lib/export/export-service";
import {
  MockDeploymentProvider,
  CloudflarePagesProvider,
  VercelProvider,
  S3StaticHostingProvider,
} from "../src/lib/deployment/deployment-provider";
import { GET as healthGet } from "../src/app/api/health/route";
import { hasCapability } from "../src/lib/auth/permissions";
import { Store } from "../src/types";

const dummyStore: Store = {
  id: "str_test",
  name: "Test Store",
  clientId: "cli_01",
  clientName: "Test Client",
  industry: "Fashion & Apparel",
  description: "Test store description",
  slug: "test-staging-store",
  status: "Draft",
  templateId: "tpl_nordic_clean",
  templateName: "Nordic Clean",
  productCount: 4,
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
};

test("Phase 7 Infrastructure — Production Persistence Guard", async (t) => {
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = env.NODE_ENV;

  await t.test("throws DatabaseUnavailableError on writes in production mode when database is unconfigured", async () => {
    try {
      env.NODE_ENV = "production";
      assert.equal(isProductionEnvironment(), true);
      assert.equal(isFallbackAllowed(), false);

      // StoreRepository.create
      await assert.rejects(
        async () => {
          await StoreRepository.create({
            ...dummyStore,
            id: "str_test_prod_fail",
            slug: "fail-store-prod",
          });
        },
        (err: unknown) => err instanceof DatabaseUnavailableError
      );

      // StoreRepository.update
      await assert.rejects(
        async () => {
          await StoreRepository.update("str_test_prod_fail", { name: "Updated" });
        },
        (err: unknown) => err instanceof DatabaseUnavailableError
      );

      // StoreRepository.delete
      await assert.rejects(
        async () => {
          await StoreRepository.delete("str_test_prod_fail");
        },
        (err: unknown) => err instanceof DatabaseUnavailableError
      );

      // UserRepository.create
      await assert.rejects(
        async () => {
          await UserRepository.create({
            id: "usr_fail_prod",
            name: "Fail User",
            email: "fail.user@gridretail.internal",
            passwordHash: "hash",
            role: "employee",
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        },
        (err: unknown) => err instanceof DatabaseUnavailableError
      );

      // DeliveryRepository.create
      await assert.rejects(
        async () => {
          await DeliveryRepository.create({
            id: "del_fail_prod",
            storeId: "str_01",
            storeName: "Aura",
            mode: "bundle_export",
            status: "completed",
            format: "zip",
            fileSizeBytes: 1024,
            checksumSha256: "abc",
            artifactName: "export.zip",
            artifactUrl: "/api/download/export.zip",
            createdBy: "test",
            createdAt: new Date().toISOString(),
          });
        },
        (err: unknown) => err instanceof DatabaseUnavailableError
      );

      // DeploymentRepository.create
      await assert.rejects(
        async () => {
          await DeploymentRepository.create({
            id: "dpl_fail_prod",
            storeId: "str_01",
            storeName: "Aura",
            provider: "mock",
            status: "pending",
            createdBy: "usr_01",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        },
        (err: unknown) => err instanceof DatabaseUnavailableError
      );
    } finally {
      env.NODE_ENV = originalEnv;
    }
  });

  await t.test("allows in-memory operations in development and test environments", () => {
    env.NODE_ENV = "test";
    assert.equal(isProductionEnvironment(), false);
    assert.equal(isFallbackAllowed(), true);
  });
});

test("Phase 7 Infrastructure — Health Endpoint Status Matrix", async (t) => {
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = env.NODE_ENV;

  await t.test("reports healthy in development / test fallback mode", async () => {
    env.NODE_ENV = "test";
    const res = await healthGet();
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.status, "healthy");
    assert.equal(data.database, "in_memory_fallback");
    assert.equal(data.configured, false);
    assert.ok(data.timestamp);
  });

  await t.test("reports unhealthy with HTTP 503 in production mode when database is unconfigured", async () => {
    try {
      env.NODE_ENV = "production";
      const res = await healthGet();
      const data = await res.json();
      assert.equal(res.status, 503);
      assert.equal(data.status, "unhealthy");
      assert.equal(data.database, "in_memory_fallback");
      assert.equal(data.configured, false);
    } finally {
      env.NODE_ENV = originalEnv;
    }
  });
});

test("Phase 7 Infrastructure — Index Synchronization Script Contract", async (t) => {
  await t.test("runIndexSync executes safely and idempotently without crashing", async () => {
    const res = await runIndexSync();
    assert.ok(typeof res.success === "boolean");
    assert.ok(typeof res.message === "string");
  });
});

test("Phase 7 Infrastructure — Production Email & SMTP Verification", async (t) => {
  await t.test("detects unconfigured SMTP gracefully and defaults to mock provider", async () => {
    const result = await verifySmtpConnection();
    assert.equal(result.configured, false);
    assert.equal(result.connected, false);
    assert.ok(result.message.includes("SMTP_HOST"));
  });

  await t.test("ConsoleMockEmailProvider sends and records notifications in outbox", async () => {
    const mock = new ConsoleMockEmailProvider();
    const res = await mock.sendEmail({
      id: "notif_01",
      storeId: "str_01",
      storeName: "Aura Minimalist",
      event: "feedback_submitted",
      to: "client@example.com",
      from: "notifications@gridretail.internal",
      subject: "New feedback submitted",
      htmlBody: "<p>A new feedback was received.</p>",
      textBody: "A new feedback was received.",
      createdAt: new Date().toISOString(),
      status: "sent",
    });

    assert.equal(res.success, true);
    assert.ok(res.messageId?.startsWith("mock-"));
    assert.equal(mock.getOutbox().length, 1);
    mock.clearOutbox();
    assert.equal(mock.getOutbox().length, 0);
  });
});

test("Phase 7 Infrastructure — Durable Media Storage & Retention", async (t) => {
  const provider = new S3StorageProvider();

  await t.test("enforces private bucket policy by default", () => {
    assert.equal(provider.isPrivateBucketEnforced(), true);
  });

  await t.test("enforces media and export file size boundaries", () => {
    // Valid media file
    assert.doesNotThrow(() => provider.validateFileSize(2 * 1024 * 1024, false));
    // Oversized media file (> 5 MB)
    assert.throws(
      () => provider.validateFileSize(MAX_MEDIA_FILE_SIZE_BYTES + 1024, false),
      /exceeds allowed maximum of 5 MB/
    );

    // Valid export file (< 50 MB)
    assert.doesNotThrow(() => provider.validateFileSize(20 * 1024 * 1024, true));
    // Oversized export file (> 50 MB)
    assert.throws(
      () => provider.validateFileSize(MAX_EXPORT_FILE_SIZE_BYTES + 1024, true),
      /exceeds allowed maximum of 50 MB/
    );
  });

  await t.test("generates standard AWS Signature Version 4 (SigV4) presigned URLs", () => {
    const presigned = provider.generatePresignedUrl("stores/str_01/logo/sample.png", {
      expiresInSeconds: 1800,
    });
    assert.ok(presigned.includes("X-Amz-Algorithm=AWS4-HMAC-SHA256"));
    assert.ok(presigned.includes("X-Amz-Credential="));
    assert.ok(presigned.includes("X-Amz-Date="));
    assert.ok(presigned.includes("X-Amz-Expires=1800"));
    assert.ok(presigned.includes("X-Amz-SignedHeaders=host"));
    assert.ok(presigned.includes("X-Amz-Signature="));
  });

  await t.test("retention policy returns configured defaults and scan runs safely", async () => {
    const policy = getRetentionPolicy();
    assert.equal(policy.maxAgeDays, 30);
    assert.equal(policy.maxExportFileSizeMb, 50);
    assert.equal(policy.maxMediaFileSizeMb, 5);

    const scanResult = await cleanExpiredArtifacts({ dryRun: true });
    assert.equal(scanResult.dryRun, true);
    assert.ok(typeof scanResult.scannedFiles === "number");
    assert.ok(Array.isArray(scanResult.expiredFiles));
  });

  await t.test("CLI retention runner executes safely in dry-run mode", async () => {
    const { runArtifactCleanup } = await import("../src/lib/storage/clean-artifacts");
    const result = await runArtifactCleanup({ dryRun: true, maxAgeDays: 30 });
    assert.equal(result.dryRun, true);
    assert.ok(typeof result.scannedFiles === "number");
    assert.ok(Array.isArray(result.expiredFiles));
  });

  await t.test("administrative maintenance actions require admin role capability", () => {
    assert.equal(hasCapability("admin", "manage_users"), true);
    assert.equal(hasCapability("sales_director", "manage_users"), false);
    assert.equal(hasCapability("account_manager", "manage_users"), false);
    assert.equal(hasCapability("employee", "manage_users"), false);
  });

  await t.test("ExportService.getExportBuffer rejects directory traversal attempts", async () => {
    const result = await ExportService.getExportBuffer("str_01", "../../etc/passwd");
    assert.equal(result, null);
  });
});

test("Phase 7 Infrastructure — Cloud Staging Deployment Provider Contracts", async (t) => {
  const dummyBundle = {
    buffer: Buffer.from("mock-zip"),
    fileSizeBytes: 1024,
    checksumSha256: "mock-hash",
    artifactName: "test.zip",
    artifactUrl: "/api/download/test.zip",
    files: ["index.html", "styles.css"],
  };

  await t.test("MockDeploymentProvider deploys with explicit internal simulated staging URL", async () => {
    const mockProvider = new MockDeploymentProvider();
    assert.equal(mockProvider.isConfigured, true);
    const result = await mockProvider.deploy(dummyBundle, dummyStore);
    assert.ok(result.stagingUrl.includes("preview.gridretail.internal"));
    assert.equal(result.metadata?.provider, "mock");
  });

  await t.test("CloudflarePagesProvider throws when credentials are not configured", async () => {
    const cfp = new CloudflarePagesProvider();
    assert.equal(cfp.isConfigured, false);
    await assert.rejects(
      async () => {
        await cfp.deploy(dummyBundle, dummyStore);
      },
      /Cloudflare Pages credentials not configured/
    );
  });

  await t.test("VercelProvider throws when credentials are not configured", async () => {
    const vercel = new VercelProvider();
    assert.equal(vercel.isConfigured, false);
    await assert.rejects(
      async () => {
        await vercel.deploy(dummyBundle, dummyStore);
      },
      /Vercel deployment credentials not configured/
    );
  });

  await t.test("S3StaticHostingProvider throws when credentials are not configured", async () => {
    const s3 = new S3StaticHostingProvider();
    assert.equal(s3.isConfigured, false);
    await assert.rejects(
      async () => {
        await s3.deploy(dummyBundle, dummyStore);
      },
      /AWS S3 Static Hosting credentials not configured/
    );
  });
});
