import { describe, it } from "node:test";
import assert from "node:assert";
import {
  isAllowedPreviewOrigin,
  isSafeUrl,
  sanitizeCssValue,
  validatePreviewMessage,
} from "../src/lib/security/preview-origin";

describe("Phase 13: Security Hardening & Origin Validation", () => {
  describe("isAllowedPreviewOrigin", () => {
    it("allows standard localhost with standard port", () => {
      assert.strictEqual(isAllowedPreviewOrigin("http://localhost:3000"), true);
      assert.strictEqual(isAllowedPreviewOrigin("http://127.0.0.1:3000"), true);
    });

    it("allows valid local store subdomains", () => {
      assert.strictEqual(isAllowedPreviewOrigin("http://aura-minimalist.localhost:3000"), true);
      assert.strictEqual(isAllowedPreviewOrigin("http://store-123.localhost:3000"), true);
    });

    it("rejects malicious origin substring spoofing", () => {
      assert.strictEqual(isAllowedPreviewOrigin("http://attacker-localhost.com:3000"), false);
      assert.strictEqual(isAllowedPreviewOrigin("https://attacker-localhost.com"), false);
      assert.strictEqual(isAllowedPreviewOrigin("http://localhost.attacker.com:3000"), false);
      assert.strictEqual(isAllowedPreviewOrigin("http://127.0.0.1.attacker.com:3000"), false);
      assert.strictEqual(isAllowedPreviewOrigin("http://evil-127.0.0.1:3000"), false);
    });

    it("rejects opaque, null, or empty origins", () => {
      assert.strictEqual(isAllowedPreviewOrigin(""), false);
      assert.strictEqual(isAllowedPreviewOrigin("null"), false);
      // @ts-expect-error test invalid types
      assert.strictEqual(isAllowedPreviewOrigin(null), false);
      // @ts-expect-error test invalid types
      assert.strictEqual(isAllowedPreviewOrigin(undefined), false);
    });

    it("rejects non-http/https protocols", () => {
      assert.strictEqual(isAllowedPreviewOrigin("javascript:alert(1)"), false);
      assert.strictEqual(isAllowedPreviewOrigin("file:///etc/passwd"), false);
      assert.strictEqual(isAllowedPreviewOrigin("data:text/html,evil"), false);
    });

    it("enforces port match when expectedPort is specified", () => {
      assert.strictEqual(isAllowedPreviewOrigin("http://localhost:3000", 3000), true);
      assert.strictEqual(isAllowedPreviewOrigin("http://localhost:8080", 3000), false);
      assert.strictEqual(isAllowedPreviewOrigin("http://aura-minimalist.localhost:3000", 3000), true);
      assert.strictEqual(isAllowedPreviewOrigin("http://aura-minimalist.localhost:4000", 3000), false);
    });
  });

  describe("isSafeUrl", () => {
    it("allows valid http and https URLs", () => {
      assert.strictEqual(isSafeUrl("https://images.unsplash.com/photo-123"), true);
      assert.strictEqual(isSafeUrl("http://localhost:3000/placeholder.png"), true);
    });

    it("allows valid relative URLs", () => {
      assert.strictEqual(isSafeUrl("/images/logo.png"), true);
      assert.strictEqual(isSafeUrl("/placeholder.svg"), true);
    });

    it("allows valid base64 image data URIs", () => {
      assert.strictEqual(isSafeUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), true);
    });

    it("rejects javascript:, vbscript:, and file: protocols", () => {
      assert.strictEqual(isSafeUrl("javascript:alert(1)"), false);
      assert.strictEqual(isSafeUrl("JAVASCRIPT:alert('xss')"), false);
      assert.strictEqual(isSafeUrl("vbscript:msgbox(1)"), false);
      assert.strictEqual(isSafeUrl("file:///C:/Windows/System32/calc.exe"), false);
    });

    it("rejects protocol-relative and backslash traversal URLs", () => {
      assert.strictEqual(isSafeUrl("//attacker.com/evil.png"), false);
      assert.strictEqual(isSafeUrl("/\\attacker.com/evil.png"), false);
    });

    it("rejects non-image data URIs", () => {
      assert.strictEqual(isSafeUrl("data:text/html,<script>alert(1)</script>"), false);
      assert.strictEqual(isSafeUrl("data:application/javascript,alert(1)"), false);
    });
  });

  describe("sanitizeCssValue", () => {
    it("strips expression() and javascript execution from css values", () => {
      assert.strictEqual(sanitizeCssValue("expression(alert(1))"), "");
      assert.strictEqual(sanitizeCssValue("javascript:alert(1)"), "");
      assert.strictEqual(sanitizeCssValue("red; behavior: url(xss.htc);"), "red;");
      assert.strictEqual(sanitizeCssValue("</style><script>alert(1)</script>"), "");
    });

    it("preserves legitimate CSS colors and typography tokens", () => {
      assert.strictEqual(sanitizeCssValue("#176B4D"), "#176B4D");
      assert.strictEqual(sanitizeCssValue("rgba(23, 107, 77, 0.9)"), "rgba(23, 107, 77, 0.9)");
      assert.strictEqual(sanitizeCssValue("Inter, sans-serif"), "Inter, sans-serif");
    });
  });

  describe("validatePreviewMessage", () => {
    it("validates GRIDRETAIL_PREVIEW_READY messages", () => {
      const res = validatePreviewMessage({
        type: "GRIDRETAIL_PREVIEW_READY",
        slug: "nordic-crafts",
      });
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.type, "GRIDRETAIL_PREVIEW_READY");
      assert.strictEqual(res.slug, "nordic-crafts");
    });

    it("validates GRIDRETAIL_PREVIEW_ACK messages", () => {
      const now = Date.now();
      const res = validatePreviewMessage({
        type: "GRIDRETAIL_PREVIEW_ACK",
        timestamp: now,
      });
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.type, "GRIDRETAIL_PREVIEW_ACK");
      assert.strictEqual(res.timestamp, now);
    });

    it("validates and sanitizes GRIDRETAIL_PREVIEW_UPDATE messages", () => {
      const res = validatePreviewMessage({
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          templateId: "tmpl_modern_minimal",
          themeId: "theme_nordic_pine",
          name: "Clean Store",
          branding: {
            primaryColor: "#176B4D",
            logoUrl: "javascript:alert(1)", // Malicious
            bannerUrl: "https://images.unsplash.com/photo-123",
          },
          enabledSections: ["hero", "featured_products"],
          orderedSections: ["hero", "featured_products"],
        },
      });

      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.payload?.templateId, "tmpl_modern_minimal");
      assert.strictEqual(res.payload?.themeId, "theme_nordic_pine");
      assert.strictEqual(res.payload?.name, "Clean Store");
      // Malicious URL was sanitized away to empty string!
      assert.strictEqual(res.payload?.branding?.logoUrl, "");
      assert.strictEqual(res.payload?.branding?.bannerUrl, "https://images.unsplash.com/photo-123");
    });

    it("rejects unknown message types", () => {
      const res = validatePreviewMessage({
        type: "UNKNOWN_MALICIOUS_TYPE",
        payload: {},
      });
      assert.strictEqual(res.valid, false);
      assert.ok(res.error);
    });

    it("rejects null or non-object messages", () => {
      assert.strictEqual(validatePreviewMessage(null).valid, false);
      assert.strictEqual(validatePreviewMessage("string").valid, false);
      assert.strictEqual(validatePreviewMessage(123).valid, false);
    });
  });
});
