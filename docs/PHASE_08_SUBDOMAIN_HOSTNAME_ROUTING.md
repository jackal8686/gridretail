# GridRetail — Phase 08: Multi-Tenant Hostname Resolution & Local Subdomain Routing

**Document Code:** `PHASE_08_SUBDOMAIN_HOSTNAME_ROUTING`  
**Phase:** 8 — Local Store Subdomains, Critical Rendering, Auth.js Session, Preview & Publishing Lifecycle  
**Status:** Complete & Fully Verified  
**Date:** October 15, 2026  
**Auditor / Lead Engineer:** Senior Full-Stack Engineer, Multi-Tenant Systems Architect & Security Reviewer  

---

## 1. Executive Summary & Scope

Phase 8 introduced native **local store subdomain routing** to GridRetail without requiring external DNS configuration or cloud deployment. It resolved critical Server-to-Client component serialization defects, eliminated Auth.js session fetch errors on public domains, restored visual customizer iframe rendering, and completed the store publishing lifecycle.

Stores can be accessed locally via two complementary schemes:
- **Branded Subdomain:** `http://{store-slug}.localhost:3000/` (e.g. `http://aura-minimalist.localhost:3000/`)
- **Path-Based Fallback:** `http://localhost:3000/store/{store-slug}`

---

## 2. Architecture & Request Routing

### 2.1 RFC 6761 Loopback Resolution & Middleware Rewrites
- **Standard Loopback Resolution:** Relies on [RFC 6761 Section 6.3](https://tools.ietf.org/html/rfc6761#section-6.3), where modern operating systems and browsers resolve any `*.localhost` hostname to `127.0.0.1`.
- **Hostname Extraction (`src/lib/urls.ts`):** `parseSubdomain(hostname)` evaluates the Host header. If a subdomain is detected (excluding `www`, `api`, `admin`), it extracts the store slug.
- **Transparent Server Rewrite (`src/middleware.ts`):** Requests targeting `http://{slug}.localhost:3000/` are rewritten internally to `/store/{slug}` while keeping the client address bar unchanged.
- **Internal Route Redirect Guard:** Requests hitting internal paths on a subdomain (e.g. `http://aura-minimalist.localhost:3000/dashboard`) are redirected to the root origin (`http://localhost:3000/dashboard`).

```
Incoming Request: http://aura-minimalist.localhost:3000/
                         │
                         ▼
        Windows / Browser DNS Resolver (RFC 6761)
                  Resolves to 127.0.0.1
                         │
                         ▼
             Next.js Middleware (src/middleware.ts)
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    Internal Route?                 Store Subdomain?
(/dashboard, /login, etc.)     (aura-minimalist.localhost)
         │                               │
         ▼                               ▼
Redirect to Root Origin         NextResponse.rewrite()
http://localhost:3000/...                 │
                                         ▼
                             Bypass Root AppShell
                             (src/app/layout.tsx)
                                         │
                                         ▼
                            Unified Storefront Page
                          (src/app/store/[slug]/page.tsx)
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
                 Store Published?               Store Unpublished?
                         │                               │
                         ▼                               ▼
                Render Storefront                Check Auth Session
             (Products, Cart, Theme)                     │
                                                 ┌───────┴───────┐
                                                 ▼               ▼
                                           Auth Staff       Public Visitor
                                                 │               │
                                                 ▼               ▼
                                          Internal Preview  <UnpublishedStoreView>
                                          Bar + Customizer  Token link info
```

---

## 3. Critical Defects Resolved

### 3.1 MongoDB BSON Serialization Boundary Fix
- **Defect:** `Only plain objects can be passed to Client Components from Server Components. Objects with toJSON methods are not supported.`
- **Root Cause:** Native MongoDB driver documents contain BSON `ObjectId` and `Date` instances that break Next.js App Router boundary serialization.
- **Remediation:** Authored [`src/lib/serialization.ts`](file:///D:/grid/src/lib/serialization.ts) with `serializeMongoDoc()` and `serializeArray()`. Normalized all repository outputs into plain, JSON-serializable JavaScript objects before passing them across the Server/Client component boundary.

### 3.2 Auth.js Session Fetch Fix (`ClientFetchError`)
- **Defect:** Public visitors on subdomains encountered `ClientFetchError: Failed to fetch` in browser console.
- **Root Cause:** `<SessionProvider>` was mounted globally in `src/app/layout.tsx`, forcing public storefronts to query `/api/auth/session`. On a subdomain, this caused cross-origin redirects.
- **Remediation:** 
  1. Removed `<SessionProvider>` wrapper from public storefronts and store subdomains.
  2. Allowed `/api/auth/` pass-through in middleware on subdomains, returning HTTP 200 `null` sessions without CORS redirects.

### 3.3 Visual Customizer Iframe Preview Restoration
- **Defect:** The customizer canvas iframe prompted the operator to log in.
- **Remediation:** The customizer iframe `src` was pointed to `/store/{slug}` on the same root origin, allowing authenticated employee session cookies to authenticate the preview and enabling instant `postMessage` synchronization between drawer and iframe.

### 3.4 Store Publishing Lifecycle & Security Gating
- **Lifecycle Controls:** Implemented **Publish Store**, **Save & Republish**, and **Unpublish** triggers in customizer header and store management tables.
- **Security Boundary:** A subdomain hostname is **not** an authorization bypass. Unpublished stores (Draft, In Progress, Review) cannot be viewed by unauthorized public visitors. Unauthorized requests render `<UnpublishedStoreView>` with clear guidance for client review tokens or employee sign-in.

---

## 4. Testing, Verification & Quality Gates

Automated tests in `tests/phase8-subdomains.test.ts` verify:
- Subdomain slug parsing and RFC 6761 matching.
- Rewriting to `/store/{slug}` and redirection of internal dashboard routes.
- Serialization normalization of MongoDB BSON objects.
- Unpublished store gating and staff preview access.

### Verification Results:
- **Lint Check:** `npm run lint` — 0 errors, 0 warnings.
- **TypeScript Check:** `npm run type-check` — 0 errors.
- **Automated Tests:** `npm test` — 100% passing.
- **Production Build:** `npm run build` — Clean compilation across all application routes.
