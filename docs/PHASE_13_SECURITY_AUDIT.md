# Phase 13 — Security Audit & Origin Hardening Report

**Project:** GridRetail  
**Phase:** 13 — Visual System Stabilization, Browser Verification and Security Hardening  
**Date:** November 21, 2026  
**Auditor:** Application Security Reviewer  
**Classification:** Internal Engineering Audit  
**Status:** All Vulnerabilities Remediated & Verified  

---

## 1. Executive Summary

During the Phase 13 security inspection, a critical vulnerability was identified in the live customizer iframe `postMessage` event listener. The storefront views (`StorefrontView.tsx`, `AppointmentWebsiteView.tsx`, and `LeadGenWebsiteView.tsx`) used naive substring checks (`.includes("localhost")`) and permitted empty origins (`!event.origin`).

This implementation was completely overhauled and replaced with strict parsed URL validation (`new URL(origin)`), RFC-compliant hostname resolution, message schema enforcement, URL sanitization, and CSS injection defenses in `src/lib/security/preview-origin.ts`.

---

## 2. Vulnerability Analysis & Remediation

### Vulnerability 13-SEC-01: Insecure `postMessage` Origin Validation (CVSS 8.2 — High)
- **CWE:** CWE-345 (Insufficient Verification of Data Authenticity), CWE-20 (Improper Input Validation).
- **Vulnerable Code:**
  ```typescript
  const isAllowedOrigin =
    !event.origin ||
    event.origin === window.location.origin ||
    event.origin.includes("localhost") ||
    event.origin.includes("127.0.0.1");
  ```
- **Exploit Scenario:**
  1. An attacker registers a domain like `https://attacker-localhost.com` or `https://127.0.0.1.attacker.com`.
  2. The attacker embeds a client's published storefront in an iframe on their site.
  3. The attacker's script executes `iframe.contentWindow.postMessage({ type: "GRIDRETAIL_PREVIEW_UPDATE", payload: { name: "PHISHING ATTACK", ... } }, "*")`.
  4. Because `"https://attacker-localhost.com".includes("localhost")` evaluates to `true`, the storefront accepted and applied the attacker's payload.
  5. Furthermore, allowing `!event.origin` allowed opaque `null` origins (e.g. from sandboxed iframes or `data:` URLs) to spoof messages.
- **Remediation:**
  Replaced with `isAllowedPreviewOrigin(event.origin, expectedPort)` in `src/lib/security/preview-origin.ts`:
  - Parses `parsed = new URL(origin)`.
  - Rejects `null`, empty strings, and non-http/https protocols.
  - In development:
    - Strictly permits exact hostnames `localhost` and `127.0.0.1`.
    - Strictly permits single-label subdomains ending in `.localhost` (e.g. `aura-minimalist.localhost`) verified against RFC 1035 (`/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.localhost$/`).
    - Enforces port matching (rejecting arbitrary ports).
  - In production:
    - Restricts exclusively to `window.location.origin`, `NEXTAUTH_URL`, or whitelisted storefront custom domains.

### Vulnerability 13-SEC-02: Arbitrary Message Payload Injection (CVSS 6.5 — Medium)
- **CWE:** CWE-20 (Improper Input Validation).
- **Previous State:** Handlers assumed `event.data.payload` had valid properties without schema verification.
- **Remediation:**
  Implemented `validatePreviewMessage(data: unknown)`:
  - Validates `type` against `["GRIDRETAIL_PREVIEW_READY", "GRIDRETAIL_PREVIEW_UPDATE", "GRIDRETAIL_PREVIEW_ACK"]`.
  - Type-checks and bounds-checks `name`, `templateId`, `themeId`, `enabledSections`, `orderedSections`, `sections`, `branding`, and `styling`.
  - Unrecognized properties are discarded.

### Vulnerability 13-SEC-03: Media URL Protocol Injection (CVSS 7.1 — High)
- **CWE:** CWE-79 (Cross-Site Scripting via `javascript:` URI).
- **Previous State:** `branding.logoUrl` and `branding.bannerUrl` could be updated to `javascript:alert(1)` through customizer messages.
- **Remediation:**
  Implemented `isSafeUrl(url)`:
  - Validates `url` protocol against `http:`, `https:`, relative `/` (rejecting protocol-relative `//` and directory traversal `/\\`), and valid base64 image data URIs (`data:image/...`).
  - Automatically neutralizes `javascript:`, `vbscript:`, `file:`, and non-image data URIs (`data:text/html`).

### Vulnerability 13-SEC-04: CSS Token Injection (CVSS 5.3 — Medium)
- **CWE:** CWE-74 (Improper Neutralization of Special Elements in Output Used by a Downstream Component).
- **Previous State:** Unsanitized custom CSS values could attempt style tag escapes or CSS expression execution.
- **Remediation:**
  Implemented `sanitizeCssValue(value)`:
  - Strips `<script>`, `<style>`, `expression(...)`, `behavior:`, and `javascript:` URIs from all CSS property values before applying to the DOM or CSS custom properties.

---

## 3. Automated Security Test Results

All security controls are verified by automated tests in `tests/phase13-security.test.ts`:
- **Allowed Origins:** `http://localhost:3000` (Pass), `http://127.0.0.1:3000` (Pass), `http://aura-minimalist.localhost:3000` (Pass).
- **Rejected Origins:** `http://attacker-localhost.com:3000` (Rejected), `https://attacker-localhost.com` (Rejected), `http://localhost.attacker.com:3000` (Rejected), `http://127.0.0.1.attacker.com:3000` (Rejected), `""` (Rejected), `"null"` (Rejected), `javascript:alert(1)` (Rejected).
- **Port Enforcement:** Mismatched ports on local subdomains are strictly rejected.
- **Safe URLs:** Relative `/logo.png` (Pass), HTTPS Unsplash (Pass), Base64 PNG data URI (Pass).
- **Rejected URLs:** `javascript:alert(1)` (Rejected), `vbscript:msgbox(1)` (Rejected), `//attacker.com/evil.png` (Rejected), `data:text/html,<script>` (Rejected).
- **CSS Sanitization:** Strips `expression(alert(1))` -> `""`, strips `javascript:alert(1)` -> `""`, strips `behavior: url(xss.htc);` -> `""`, preserves valid `#176B4D` and `Inter, sans-serif`.

**Security Audit Verdict:** PASSED (0 Critical, 0 High, 0 Medium, 0 Low outstanding vulnerabilities).
