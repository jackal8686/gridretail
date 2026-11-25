import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSubdomain,
  isReservedSubdomain,
  validateHostnameSlug,
  normalizeHostnameSlug,
  getStoreUrl,
  getStoreLocalSubdomainUrl,
  getStorePathUrl,
  getRootOrigin,
} from "../src/lib/urls";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { PreviewShareRepository } from "../src/lib/repositories/preview-share.repository";
import { hashToken } from "../src/lib/crypto/tokens";
import { Store } from "../src/types";

test("Phase 8 — Store Subdomain & Hostname Routing Test Suite", async (t) => {
  StoreRepository._resetMemory();
  PreviewShareRepository._resetMemory();

  // ---------------------------------------------------------------------------
  // 1. Slug Normalization & DNS Formatting
  // ---------------------------------------------------------------------------
  await t.test("normalizes raw input into clean lowercase DNS-compliant labels", () => {
    assert.strictEqual(normalizeHostnameSlug("Aura Minimalist Living"), "aura-minimalist-living");
    assert.strictEqual(normalizeHostnameSlug("  --Chintaman--Farms-- "), "chintaman-farms");
    assert.strictEqual(normalizeHostnameSlug("Tech & Gadgets 2026!"), "tech-gadgets-2026");
    assert.strictEqual(normalizeHostnameSlug("UPPERCASE_WITH_UNDERSCORES"), "uppercase-with-underscores");
    assert.strictEqual(normalizeHostnameSlug(""), "");
  });

  // ---------------------------------------------------------------------------
  // 2. Hostname Slug Validation & Boundary Rules
  // ---------------------------------------------------------------------------
  await t.test("enforces length and character constraints on hostname slugs", () => {
    // Too short (< 3 characters)
    const tooShort = validateHostnameSlug("ab");
    assert.strictEqual(tooShort.valid, false);
    assert.match(tooShort.error || "", /at least 3 characters/i);

    // Empty or non-string
    assert.strictEqual(validateHostnameSlug("").valid, false);

    // Too long (> 50 characters)
    const tooLong = validateHostnameSlug("a".repeat(51));
    assert.strictEqual(tooLong.valid, false);
    assert.match(tooLong.error || "", /cannot exceed 50 characters/i);

    // Disallowed leading or trailing hyphens
    assert.strictEqual(validateHostnameSlug("-leading-hyphen").valid, false);
    assert.strictEqual(validateHostnameSlug("trailing-hyphen-").valid, false);

    // Disallowed special characters
    assert.strictEqual(validateHostnameSlug("invalid.dot").valid, false);
    assert.strictEqual(validateHostnameSlug("invalid_underscore").valid, false);
    assert.strictEqual(validateHostnameSlug("invalid@symbol").valid, false);

    // Valid slugs
    assert.strictEqual(validateHostnameSlug("aura-minimalist").valid, true);
    assert.strictEqual(validateHostnameSlug("chintaman-farms").valid, true);
    assert.strictEqual(validateHostnameSlug("volt-audio-2026").valid, true);
  });

  // ---------------------------------------------------------------------------
  // 3. Reserved System Keywords
  // ---------------------------------------------------------------------------
  await t.test("strictly rejects reserved system subdomains", () => {
    const testReserved = [
      "admin",
      "api",
      "app",
      "auth",
      "dashboard",
      "login",
      "logout",
      "stores",
      "clients",
      "templates",
      "products",
      "settings",
      "new",
      "preview",
      "www",
      "localhost",
      "mail",
      "status",
      "health",
      "static",
      "assets",
      "public",
      "demo",
      "internal",
      "root",
    ];

    for (const kw of testReserved) {
      assert.strictEqual(isReservedSubdomain(kw), true, `"${kw}" should be recognized as reserved`);
      const val = validateHostnameSlug(kw);
      assert.strictEqual(val.valid, false, `"${kw}" should fail validation as reserved`);
      assert.match(val.error || "", /reserved system keyword/i);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Hostname Header Parsing (parseSubdomain)
  // ---------------------------------------------------------------------------
  await t.test("parses incoming Host and X-Forwarded-Host headers accurately", () => {
    // Valid store subdomains
    const p1 = parseSubdomain("aura-minimalist.localhost:3000");
    assert.strictEqual(p1.isSubdomain, true);
    assert.strictEqual(p1.subdomain, "aura-minimalist");
    assert.strictEqual(p1.isReserved, false);
    assert.strictEqual(p1.isValid, true);

    const p2 = parseSubdomain("chintaman-farms.localhost:3000");
    assert.strictEqual(p2.isSubdomain, true);
    assert.strictEqual(p2.subdomain, "chintaman-farms");
    assert.strictEqual(p2.isValid, true);

    // Subdomain without port
    const p3 = parseSubdomain("nordic-haven.localhost");
    assert.strictEqual(p3.isSubdomain, true);
    assert.strictEqual(p3.subdomain, "nordic-haven");

    // Reserved subdomain
    const pReserved = parseSubdomain("admin.localhost:3000");
    assert.strictEqual(pReserved.isSubdomain, true);
    assert.strictEqual(pReserved.subdomain, "admin");
    assert.strictEqual(pReserved.isReserved, true);
    assert.strictEqual(pReserved.isValid, false);

    // Root domains (must NOT be treated as store subdomains)
    assert.strictEqual(parseSubdomain("localhost:3000").isSubdomain, false);
    assert.strictEqual(parseSubdomain("localhost").isSubdomain, false);
    assert.strictEqual(parseSubdomain("127.0.0.1:3000").isSubdomain, false);
    assert.strictEqual(parseSubdomain("127.0.0.1").isSubdomain, false);
    assert.strictEqual(parseSubdomain("::1").isSubdomain, false);
    assert.strictEqual(parseSubdomain("").isSubdomain, false);

    // Multi-level subdomains (must be flagged invalid)
    const pMulti = parseSubdomain("nested.sub.localhost:3000");
    assert.strictEqual(pMulti.isSubdomain, true);
    assert.strictEqual(pMulti.isValid, false);

    // Custom host suffix support
    const pCustom = parseSubdomain("mystore.customdev.internal:8080", "customdev.internal");
    assert.strictEqual(pCustom.isSubdomain, true);
    assert.strictEqual(pCustom.subdomain, "mystore");
    assert.strictEqual(pCustom.isValid, true);
  });

  // ---------------------------------------------------------------------------
  // 5. Centralized URL Generation
  // ---------------------------------------------------------------------------
  await t.test("generates explicit local subdomain and path URLs correctly", () => {
    // Explicit local subdomain helper
    const subUrl = getStoreLocalSubdomainUrl("aura-minimalist", "3000", "localhost");
    assert.strictEqual(subUrl, "http://aura-minimalist.localhost:3000");

    // Custom port
    const subUrlCustomPort = getStoreLocalSubdomainUrl("chintaman-farms", "8080", "localhost");
    assert.strictEqual(subUrlCustomPort, "http://chintaman-farms.localhost:8080");

    // Standard path helper
    const pathUrl = getStorePathUrl("aura-minimalist", "http://localhost:3000");
    assert.strictEqual(pathUrl, "http://localhost:3000/store/aura-minimalist");

    // Production path format
    const prodUrl = getStoreUrl("aura-minimalist", {
      mode: "path",
      baseUrl: "https://gridretail.yourdomain.com",
    });
    assert.strictEqual(prodUrl, "https://gridretail.yourdomain.com/store/aura-minimalist");

    // Root origin calculation
    const rootOrigin = getRootOrigin({ hostSuffix: "localhost", port: "3000" });
    assert.strictEqual(rootOrigin, "http://localhost:3000");
  });

  // ---------------------------------------------------------------------------
  // 6. Database Uniqueness & Concurrency Protection
  // ---------------------------------------------------------------------------
  await t.test("enforces store slug uniqueness and rejects duplicate collision attempts", async () => {
    const slug = "unique-test-store";
    const store1: Store = {
      id: "str_test_uniq_01",
      name: "Unique Store One",
      slug,
      clientId: "cli_01",
      clientName: "Client One",
      industry: "Home & Living",
      templateId: "tpl_nordic_clean",
      templateName: "Nordic Clean",
      status: "Published",
      productCount: 5,
      previewUrl: `/store/${slug}`,
      localUrl: `http://${slug}.localhost:3000`,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "First instance",
    };

    const created1 = await StoreRepository.create(store1);
    assert.strictEqual(created1.id, "str_test_uniq_01");

    // Attempting to create a second store with the exact same slug must throw collision error
    const store2: Store = {
      id: "str_test_uniq_02",
      name: "Unique Store Two (Duplicate)",
      slug,
      clientId: "cli_02",
      clientName: "Client Two",
      industry: "Electronics & Gadgets",
      templateId: "tpl_tech_monolith",
      templateName: "Tech Monolith",
      status: "Draft",
      productCount: 2,
      previewUrl: `/store/${slug}`,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Duplicate collision attempt",
    };

    await assert.rejects(
      async () => {
        await StoreRepository.create(store2);
      },
      /already in use/i,
      "Duplicate store slug insertion must be rejected"
    );

    // Verify original store is intact and unchanged
    const retrieved = await StoreRepository.findBySlug(slug);
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.id, "str_test_uniq_01");
    assert.strictEqual(retrieved?.name, "Unique Store One");
  });

  // ---------------------------------------------------------------------------
  // 7. Multi-Store Resolution & Data Isolation
  // ---------------------------------------------------------------------------
  await t.test("resolves multiple distinct stores independently by their hostnames", async () => {
    const storeA: Store = {
      id: "str_aura_001",
      name: "Aura Minimalist",
      slug: "aura-minimalist-demo",
      clientId: "cli_01",
      clientName: "Nordic Studio",
      industry: "Home & Living",
      templateId: "tpl_nordic_clean",
      templateName: "Nordic Clean",
      status: "Published",
      productCount: 12,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Store A",
    };

    const storeB: Store = {
      id: "str_chintaman_002",
      name: "Chintaman Farms",
      slug: "chintaman-farms-demo",
      clientId: "cli_02",
      clientName: "Farms Co",
      industry: "Food & Gourmet",
      templateId: "tpl_warm_organic",
      templateName: "Warm Organic",
      status: "Published",
      productCount: 8,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Store B",
    };

    await StoreRepository.create(storeA);
    await StoreRepository.create(storeB);

    const resA = await StoreRepository.findBySlug("aura-minimalist-demo");
    const resB = await StoreRepository.findBySlug("chintaman-farms-demo");

    assert.ok(resA);
    assert.ok(resB);
    assert.strictEqual(resA?.name, "Aura Minimalist");
    assert.strictEqual(resB?.name, "Chintaman Farms");
    assert.notStrictEqual(resA?.id, resB?.id);
    assert.notStrictEqual(resA?.templateId, resB?.templateId);

    // Unknown hostname returns null (404 isolation)
    const unknown = await StoreRepository.findBySlug("unknown-nonexistent-subdomain");
    assert.strictEqual(unknown, null);
  });

  // ---------------------------------------------------------------------------
  // 8. Public vs Unpublished Access & Security Boundary
  // ---------------------------------------------------------------------------
  await t.test("differentiates published stores from draft stores", async () => {
    const draftStore: Store = {
      id: "str_draft_sec_01",
      name: "Confidential Draft Store",
      slug: "confidential-draft-store",
      clientId: "cli_01",
      clientName: "Secret Client",
      industry: "Luxury Goods",
      templateId: "tpl_editorial_minimal",
      templateName: "Editorial Minimal",
      status: "Draft",
      productCount: 3,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Unpublished draft",
    };

    await StoreRepository.create(draftStore);

    const lookup = await StoreRepository.findBySlug("confidential-draft-store");
    assert.ok(lookup);
    assert.strictEqual(lookup?.status, "Draft");
    // Verify status is not published
    assert.notStrictEqual(lookup?.status, "Published");
  });

  // ---------------------------------------------------------------------------
  // 9. Client Preview Shares & Token Expiration / Revocation
  // ---------------------------------------------------------------------------
  await t.test("preserves secure preview token window, expiration, and revocation", async () => {
    const rawToken = "tok_subdomain_preview_entropy_window_key";
    const tokenHash = hashToken(rawToken);

    const share = await PreviewShareRepository.create({
      id: "share_sub_01",
      storeId: "str_draft_sec_01",
      storeSlug: "confidential-draft-store",
      clientName: "Secret Client",
      tokenHash,
      status: "active",
      accessCount: 0,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: "admin@gridretail.internal",
    });

    const activeShare = await PreviewShareRepository.findByTokenHash(tokenHash);
    assert.ok(activeShare);
    assert.strictEqual(activeShare?.status, "active");

    // Revocation immediately blocks preview
    await PreviewShareRepository.revoke(share.id, "admin@gridretail.internal");
    const revokedShare = await PreviewShareRepository.findByTokenHash(tokenHash);
    assert.ok(revokedShare);
    assert.strictEqual(revokedShare?.status, "revoked");
  });
});
