# Phase 16: Persistence & Safe Regeneration Report

**Project:** GridRetail  
**Date:** 2026-11-22  
**Author:** Antigravity Engineering Agent  
**Phase:** 16 — Context-Aware Website Generation  

---

## 1. Executive Summary

This report documents the persistence architecture, concurrency controls, and safe regeneration mechanisms implemented for Phase 16. A core mandate of this phase is guaranteeing that context-aware generation preserves the strict versioned write policies established in Phase 15.1.1.4 and Phase 15.1.1.5, while ensuring that manual edits made by merchants are never silently destroyed during content regeneration.

---

## 2. Persistence & Versioning Architecture

### 2.1 Initial Version Assignment (`POST /api/stores`)
When a context-aware website is generated through the wizard, the store entity is initialized with `version: 1` alongside its `businessProfile`:
```typescript
const newStore: Store = {
  id: storeId,
  name: sanitized.name,
  slug: sanitized.slug,
  // ...
  sections: sanitized.sections || resolveStoreSections(...),
  businessProfile: sanitized.businessProfile,
  version: 1, // Atomic version counter initialized
};
```
This guarantees that newly generated stores immediately enter the versioned persistence lifecycle.

### 2.2 Versioned Write Policy Enforcement (`StoreRepository.ts`)
`businessProfile` is explicitly registered in `EDITOR_MANAGED_FIELDS`:
```typescript
export const EDITOR_MANAGED_FIELDS: readonly string[] = [
  "name",
  "description",
  "branding",
  "styling",
  "sections",
  "enabledSections",
  "orderedSections",
  "themeId",
  "themeName",
  "templateId",
  "templateName",
  "slug",
  "businessProfile",
];
```
- **Atomicity Guard:** Any update modifying `businessProfile` or generated section content must provide an incremented version number (`version === existing.version + 1`).
- **Unversioned Write Rejection:** Any unversioned update targeting a versioned store is rejected with HTTP 409 Conflict.
- **Asynchronous FIFO Mutex:** Concurrent write operations are serialized per-store using `withStoreLock()`, eliminating interleaving or lost-update anomalies.

---

## 3. Safe Regeneration Strategy

A critical hazard in automated content platforms is accidental loss of merchant edits when invoking regeneration. GridRetail implements a multi-tiered safety protocol:

### 3.1 Non-Destructive Initial Plan Selection
During the generation wizard (Step 4), merchants review recommended sections, design pairings, and copy previews. Recommended sections are not locked; merchants can include or exclude modules via interactive toggles before the store is committed to the database.

### 3.2 In-Editor Granular Section Regeneration
Merchants working inside the Visual Editor (`/stores/[id]/preview`) can regenerate copy for an individual section without resetting the rest of the page:
1. **Trigger:** The property inspector (`EditorRightPanel.tsx`) features an **AI Context Copy** card with the action `Regenerate with AI Context`.
2. **Safety Notice & Confirmation Modal:**
   - A warning alert informs the merchant: *"Regenerating this section will refresh its headline, subheadline, and copy using your store's business profile. Any manual edits to this section will be replaced, but can be undone anytime via the Editor Undo button."*
   - Requires explicit click on `Confirm & Apply Context Copy`.
3. **Dedicated API Endpoint (`POST /api/generation/section`):**
   - Synthesizes fresh copy specifically for the chosen section type using the store's persisted `businessProfile`.
4. **History Snapshot & Undo Protection:**
   - The regenerated section settings are applied via `onUpdateSectionSettings()`.
   - This automatically creates an `EditorSnapshot` in the 30-snapshot history buffer (`useEditorHistory.ts`).
   - If the merchant dislikes the regenerated copy, they can click the **Undo** button in the top toolbar (or press `Ctrl+Z`) to instantly restore their prior manual edits.
5. **Autosave Integration:**
   - Once confirmed, the updated section is queued for 2.5s debounced autosave with a version increment (`version = version + 1`).

---

## 4. Tenant Isolation & Test Fixture Security

- **Merchant Isolation:** Updates to store profiles and sections require valid session credentials and ownership permissions (`permissions.ts`).
- **Test Runner Containment:** Automated test runners are strictly confined to registered test fixture stores (`TEST_RUNNER_FIXTURE_STORE_IDS`). Live merchant data cannot be accessed or modified by automated test suites.
- **Production Guard:** Test-runner bypasses are permanently disabled when `NODE_ENV === "production"`.

---

## 5. Verification Summary

- Initial store versioning verified (`version: 1`).
- `businessProfile` field inclusion in `EDITOR_MANAGED_FIELDS` verified.
- Safe section regeneration endpoint `/api/generation/section` verified.
- Visual Editor inspector integration with confirmation modal verified.
- History undo/redo snapshot safety verified.
