import test from "node:test";
import assert from "node:assert/strict";
import { ExportService } from "../src/lib/export/export-service";
import { canAccessStore } from "../src/lib/auth/permissions";
import { hashToken } from "../src/lib/crypto/tokens";
import { PreviewShareRepository } from "../src/lib/repositories/preview-share.repository";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { Store, UserRole } from "../src/types";

test("Export Storage & Path Traversal Prevention", async (t) => {
  await t.test("getExportBuffer rejects directory traversal attempts", async () => {
    const traversal1 = await ExportService.getExportBuffer("store-1", "../../../etc/passwd");
    assert.strictEqual(traversal1, null);

    const traversal2 = await ExportService.getExportBuffer("..", "sensitive.zip");
    assert.strictEqual(traversal2, null);

    const traversal3 = await ExportService.getExportBuffer("store-1/../../", "bundle.zip");
    assert.strictEqual(traversal3, null);
  });
});

test("SVG Payload Script Injection & Image Signature Security", async () => {
  const { validateImageSignature, inspectSvgContent } = await import("../src/lib/storage/image-validator");

  const dangerousSvgPayloads = [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script></svg>',
    '<svg onload="alert(document.cookie)"><circle cx="10" cy="10" r="5"/></svg>',
    '<svg><a href="javascript:alert(1)"><text y="15">Click</text></a></svg>',
    '<svg><iframe src="https://attacker.com"></iframe></svg>',
    '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>',
    '<!DOCTYPE svg SYSTEM "http://malicious.com/xxe.dtd"><svg><text>XXE</text></svg>',
    '<svg><link rel="stylesheet" href="http://evil.com/style.css"/></svg>',
  ];

  for (const payload of dangerousSvgPayloads) {
    const inspection = inspectSvgContent(payload);
    assert.strictEqual(
      inspection.isSafe,
      false,
      `Payload should be flagged as malicious: ${payload}`
    );
  }

  const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#176B4D"/></svg>';
  const safeInspection = inspectSvgContent(safeSvg);
  assert.strictEqual(safeInspection.isSafe, true, "Safe SVG should pass inspection");

  // Magic bytes signature validation
  // 1. Valid JPEG
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert.strictEqual(validateImageSignature(jpegBuffer, "image/jpeg", "test.jpg").valid, true);

  // 2. Valid PNG
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.strictEqual(validateImageSignature(pngBuffer, "image/png", "test.png").valid, true);

  // 3. Fake PNG with executable or script content
  const fakePngBuffer = Buffer.from("MZThisIsAnExecutableFileNotAPng");
  assert.strictEqual(validateImageSignature(fakePngBuffer, "image/png", "exploit.png").valid, false);

  // 4. Mismatched format
  const textBuffer = Buffer.from("Hello world not an image");
  assert.strictEqual(validateImageSignature(textBuffer, "image/jpeg", "fake.jpg").valid, false);
});

test("Store Ownership & Action Authorization Boundary Enforcement", async () => {
  const victimStore: Store = {
    id: "str_victim_99",
    name: "Victim Store",
    slug: "victim-store",
    clientId: "cl_vic",
    clientName: "Victim Client",
    industry: "Luxury Goods",
    templateId: "tpl_haute",
    templateName: "Luxury Haute",
    status: "Draft",
    productCount: 10,
    creatorId: "user_owner_01",
    creatorName: "Owner Employee",
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "Victim store for security tests",
  };

  const maliciousEmployee = { id: "user_attacker_02", role: "employee" as UserRole };
  const legitimateOwner = { id: "user_owner_01", role: "employee" as UserRole };
  const accountManager = { id: "user_am_01", role: "account_manager" as UserRole };
  const administrator = { id: "user_admin_01", role: "admin" as UserRole };

  // 1. Malicious employee cannot edit victim store
  assert.strictEqual(canAccessStore(maliciousEmployee, victimStore, "edit"), false);

  // 2. Malicious employee cannot delete victim store
  assert.strictEqual(canAccessStore(maliciousEmployee, victimStore, "delete"), false);

  // 3. Legitimate employee owner cannot delete own store (deletion requires admin/director)
  assert.strictEqual(canAccessStore(legitimateOwner, victimStore, "delete"), false);

  // 4. Account Manager cannot delete store
  assert.strictEqual(canAccessStore(accountManager, victimStore, "delete"), false);

  // 5. Admin can delete store
  assert.strictEqual(canAccessStore(administrator, victimStore, "delete"), true);
});

test("Preview Share Token Cryptographic Hash & Revocation", async () => {
  PreviewShareRepository._resetMemory();

  const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const rawToken = `tok_sec_test_${uniqueSuffix}`;
  const tokenHash = hashToken(rawToken);

  const share = await PreviewShareRepository.create({
    id: `share_sec_${uniqueSuffix}`,
    storeId: "store_sec_01",
    storeSlug: "store-sec-01",
    clientName: "Sec Corp",
    tokenHash,
    status: "active",
    accessCount: 0,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: "admin@gridretail.internal",
  });

  // Verify finding by valid hash
  const found = await PreviewShareRepository.findByTokenHash(tokenHash);
  assert.ok(found);
  assert.strictEqual(found.id, share.id);
  assert.strictEqual(found.status, "active");

  // Verify revocation immediately invalidates
  await PreviewShareRepository.revoke(share.id, "admin@gridretail.internal");
  const revoked = await PreviewShareRepository.findByTokenHash(tokenHash);
  assert.ok(revoked);
  assert.strictEqual(revoked.status, "revoked");

  // Non-matching token hash returns null
  const missing = await PreviewShareRepository.findByTokenHash(hashToken("wrong_token_guess"));
  assert.strictEqual(missing, null);
});

test("Store Repository Deletion Cascade & Isolation", async () => {
  StoreRepository._resetMemory();

  const tempStore: Store = {
    id: "str_to_delete_01",
    name: "Temporary Deletion Store",
    slug: "temp-deletion-store",
    clientId: "cl_1",
    clientName: "Client A",
    industry: "Electronics & Gadgets",
    templateId: "tpl_tech",
    templateName: "High-Tech Dark",
    status: "Draft",
    productCount: 2,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "Temp deletion store",
  };

  await StoreRepository.create(tempStore);
  assert.ok(await StoreRepository.findById("str_to_delete_01"));

  const deleted = await StoreRepository.delete("str_to_delete_01");
  assert.strictEqual(deleted, true);

  const lookupAfter = await StoreRepository.findById("str_to_delete_01");
  assert.strictEqual(lookupAfter, null);
});
