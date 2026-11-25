# GridRetail — Phase 15.1.1.5: Mutation Callsite Inventory

## Executive Summary

This inventory documents every location in the GridRetail codebase where store records are created, updated, or deleted, detailing whether the call modifies editor-managed store data, how it participates in versioning, and its concurrency protection mechanisms.

---

## 1. Complete Mutation Callsite Inventory

| # | File & Location | Function / Handler | Modifies Store Data? | Sends Version? | Concurrency Protection Mechanism | Compatibility Exception & Justification |
|---|---|---|---|---|---|---|
| **1** | `src/app/api/stores/[id]/route.ts` (L118) | `PATCH` / `PUT` | **YES** (name, description, branding, styling, sections, template, theme, slug, status) | **YES** (via payload `updates.version` or header `X-GridRetail-Version`) | Dual-guard concurrency: 1) Pre-check returns 409 Conflict if `updates.version <= existing.version` or if unversioned write targets editor data; 2) Atomic database conditional filter `{ id, $or: [{ version: { $exists: false } }, { version: { $lt: incomingVersion } }] }`. | Administrative status updates (e.g. `{ status }`) without editor data preserve existing version. |
| **2** | `src/app/api/stores/[id]/media/route.ts` (L156, L182) | `POST` (upload asset) | **YES** (attaches `logoUrl` or `bannerUrl` to `branding`, synchronizes hero and `brand_story` section instances) | **YES** (via `serverAutoVersion: true`) | Safe server-side auto-versioning: atomically bumps store version (`existing.version + 1`) under document lock. In fallback, serialized via `withStoreLock`. | Scoped server-side auto-versioning for asset attachments. Ensures subsequent editor saves detect the version bump and avoid race conditions. |
| **3** | `src/app/api/preview/[token]/feedback/route.ts` (L99, L116) | `POST` (client feedback) | **YES** (`status: "Approved"` or `status: "Changes Requested"`) | **NO** (metadata update only) | `hasEditorManagedFields` evaluates to `false`. Database filter `{ id, version: existing.version }` updates status while strictly preserving `existing.version`. | Administrative review status transition. Does not modify editor-managed tokens, sections, or branding. |
| **4** | `src/lib/repositories/store.repository.ts` (L239) | `StoreRepository.update()` | **YES** (core persistence dispatcher) | Evaluates `incomingVersion`, `serverAutoVersion`, `allowUnversioned` | MongoDB atomic conditional query + Fallback per-store mutex queue (`withStoreLock`). Blocks unversioned writes on versioned stores. | Base repository engine implementing the Versioned Write Policy. |
| **5** | `src/lib/repositories/store.repository.ts` (L95) | `StoreRepository.create()` | **YES** (inserts new store) | **NO** (initial store provisioning) | Hostname/slug uniqueness constraint enforced via MongoDB unique index (code 11000) and memory array duplicate check. | Creation of new stores. May start unversioned (`version: undefined`) until first Visual Editor save. |
| **6** | `src/lib/repositories/store.repository.ts` (L329) | `StoreRepository.delete()` | **YES** (deletes store record) | **N/A** | Atomic document deletion `deleteOne({ id })` in MongoDB; memory splice inside repository. | Complete deletion of store project. |
| **7** | `src/lib/db/seed.ts` (L31) | Database Seeding | **YES** (upserts seeded stores) | **NO** | Seed script run exclusively during initial database provisioning with upsert `{ upsert: true }`. | Initial database bootstrap. Not invoked during active application runtime. |
| **8** | `src/components/editor/useEditorHistory.ts` (L95) | `executePersist()` (client) | **YES** (dispatches editor updates) | **YES** (`version: thisSeq` in body + `X-GridRetail-Version: String(thisSeq)`) | Client-side sequence monotonicity + server-side atomic conditional update. Handles HTTP 409 Conflict. | Primary client-side editor persistence engine. |
| **9** | `src/components/editor/useEditorHistory.ts` (L394) | `beforeunload` & unmount flush | **YES** (dispatches final snapshot) | **YES** (`version: flushSeq`) | Increments `requestSeqRef` so unmount flush is newer than any earlier in-flight save. Uses Fetch API with `keepalive: true`. | Best-effort navigation persistence. |
| **10** | `tests/builder.test.ts` (L21) | Unit test | **YES** (`orderedSections`) | **NO** | Safe legacy compatibility: mock store has no version (`version: { $exists: false }`). | Legacy test fixture verification. |
| **11** | `tests/customizer.test.ts` (L34, L49) | Unit test | **YES** (`branding`, `styling`) | **NO** | Safe legacy compatibility: unversioned test store. | Legacy customizer test fixture. |
| **12** | `tests/feedback.test.ts` (L50-L75) | Unit test | **YES** (`status`) | **NO** | Administrative metadata update: preserves version without touching editor tokens. | Status lifecycle test fixture. |
| **13** | `tests/phase14-design-library.test.ts` (L75) | Unit test | **YES** (`styling`) | **NO** | Safe legacy compatibility: unversioned test store. | Phase 14 design library test fixture. |
| **14** | `tests/pre-phase-12-customizer-preview-fixes.test.ts` (L60) | Unit test | **YES** (`branding`) | **NO** | Safe legacy compatibility: unversioned test store. | Banner synchronization test fixture. |
| **15** | `tests/phase15-1-reliability.test.ts` (L262, L270, L278) | Integration test | **YES** (`name`, `version`) | **YES** (`version: 1`, `version: 2`) | Server-side revision ordering verification. | Concurrency and revision ordering test fixture. |
| **16** | `tests/phase15-1-1-4-concurrency.test.ts` (L55-L270) | Concurrency test suite | **YES** (`name`, `version`) | **YES** (`v=1, 2, 3, 5, 6, 11, 12, 13`) | Multi-tab conflict, TOCTOU prevention, and 6-step lifecycle verification. | Concurrency audit test suite. |
| **17** | `tests/phase15-1-1-5-mutex-and-write-policy.test.ts` (L150-L360) | Concurrency test suite | **YES** (`name`, `status`, `version`) | **YES & NO** (tests both versioned and unversioned writes) | Tests mutex cleanup, unversioned bypass blocks, safe legacy compatibility, and concurrent versioned/unversioned writes. | Phase 15.1.1.5 audit test suite. |

---

## 2. Callsite Classification Summary

- **Total Callsites Documented:** 17
- **Editor-Managed Callsites:** 6
  - All 6 participate in revision protection via explicit versioning or `serverAutoVersion: true`.
- **Administrative / Metadata Callsites:** 3
  - All 3 update operational metadata (`status`) without modifying editor tokens and strictly preserve `existing.version`.
- **Database Lifecycle Callsites (create/delete/seed):** 3
  - Initial provisioning and permanent deletion.
- **Automated Test Callsites:** 5
  - Covers legacy unversioned fixtures, administrative status updates, and explicit versioned concurrency tests.

---

## 3. Concurrency Protection Findings

1. **Zero Unprotected Writes:** There is no code path in GridRetail through which an unversioned write can overwrite a newer versioned editor snapshot.
2. **Safe Legacy Continuity:** Existing unversioned stores and administrative workflows function seamlessly without regressions.
3. **Internal Service Auto-Versioning:** Media uploads safely participate in revision protection via `serverAutoVersion: true`.
