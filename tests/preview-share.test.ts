import test from "node:test";
import assert from "node:assert/strict";
import { generateSecureToken, hashToken, timingSafeCompare } from "../src/lib/crypto/tokens";
import { PreviewShareRepository } from "../src/lib/repositories/preview-share.repository";
import { PreviewShare } from "../src/types/preview-share";

test("Token Generation & Cryptographic Hashing", () => {
  const token1 = generateSecureToken();
  const token2 = generateSecureToken();

  assert.notEqual(token1, token2, "Generated tokens must be distinct");
  assert.ok(token1.length >= 32, "Tokens must have sufficient entropy");

  const hash1 = hashToken(token1);
  const hash2 = hashToken(token2);
  const hash1Repeat = hashToken(token1);

  assert.equal(hash1, hash1Repeat, "Hashing must be deterministic");
  assert.notEqual(hash1, hash2, "Distinct tokens produce distinct hashes");
  assert.equal(hash1.length, 64, "SHA-256 produces 64-character hex strings");

  assert.equal(timingSafeCompare(hash1, hash1Repeat), true);
  assert.equal(timingSafeCompare(hash1, hash2), false);
});

test("PreviewShareRepository Token Validation, Expiration & Revocation", async () => {
  PreviewShareRepository._resetMemory();

  const token = generateSecureToken();
  const tokenHash = hashToken(token);

  const activeShare: PreviewShare = {
    id: "shr_test_01",
    storeId: "str_01",
    storeSlug: "aura-minimalist",
    tokenHash,
    expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: "usr_admin",
    createdByName: "Platform Administrator",
    status: "active",
    accessCount: 0,
    clientName: "Nordic Haven Studio",
  };

  // 1. Create share
  await PreviewShareRepository.create(activeShare);

  // 2. Lookup by token hash
  const found = await PreviewShareRepository.findByTokenHash(tokenHash);
  assert.ok(found, "Active share must be found by token hash");
  assert.equal(found.status, "active");
  assert.equal(found.storeId, "str_01");

  // 3. Increment access count
  await PreviewShareRepository.recordAccess(found.id);
  const accessed = await PreviewShareRepository.findByTokenHash(tokenHash);
  assert.equal(accessed?.accessCount, 1);

  // 4. Test revocation
  await PreviewShareRepository.revoke(found.id, "usr_admin");
  const revoked = await PreviewShareRepository.findByTokenHash(tokenHash);
  assert.ok(revoked);
  assert.equal(revoked.status, "revoked");

  // 5. Test expired token computation
  const expiredToken = generateSecureToken();
  const expiredHash = hashToken(expiredToken);
  const expiredShare: PreviewShare = {
    id: "shr_test_expired",
    storeId: "str_01",
    storeSlug: "aura-minimalist",
    tokenHash: expiredHash,
    expiresAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour in past
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    createdBy: "usr_admin",
    status: "active",
    accessCount: 0,
  };
  await PreviewShareRepository.create(expiredShare);

  const foundExpired = await PreviewShareRepository.findByTokenHash(expiredHash);
  assert.ok(foundExpired);
  assert.equal(foundExpired.status, "expired", "Expired timestamp must compute to expired status");
});
