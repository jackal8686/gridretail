# GridRetail — Phase 15.1.1.5: Versioned Write Policy Audit

## Executive Summary

Phase 15.1.1.5 establishes a definitive **Versioned Write Policy** for GridRetail. Previously, when `incomingVersion` was undefined, the persistence layer fell back to `{ id }`, allowing unversioned updates to overwrite versioned editor snapshots and bypass revision protection.

Under the new policy, all mutations modifying editor-managed store data require revision participation, unversioned bypasses are blocked, safe server-side auto-versioning is provided for internal services, and administrative lifecycle workflows are preserved.

---

## 1. Vulnerability Analysis: The Unversioned Bypass

### The Prior Flaw
```typescript
// DEFECT in Phase 15.1.1.4:
const atomicFilter =
  incomingVersion !== undefined
    ? {
        id,
        $or: [
          { version: { $exists: false } },
          { version: { $lt: incomingVersion } },
        ],
      }
    : { id }; // BUG: Unversioned write matched any store regardless of version!
```

### Risk Scenario
1. Store is edited in Visual Editor and saved at `version = 5`.
2. An external, legacy, or stale unversioned request arrives at `PATCH /api/stores/[id]` with `{ name: "Old Overwrite" }`.
3. Because `incomingVersion` was `undefined`, the filter fell back to `{ id }`.
4. The unversioned request overwrote the store's data, bypassing revision checks and corrupting the editor's revision timeline.

---

## 2. GridRetail Versioned Write Policy Specification

### 2.1 Scope of Editor-Managed Store Data
Editor-managed store data comprises all design, layout, content, and branding tokens managed by the Visual Editor:
- `name`, `description`
- `branding` (colors, fonts, logo, banner, headlines, aboutText, ctaText)
- `styling` (buttons, cards, width, spacing, shadows, forms)
- `sections` (component instances, settings, layout variations)
- `enabledSections`, `orderedSections`
- `themeId`, `themeName`, `templateId`, `templateName`
- `slug`

### 2.2 Scope of Administrative & Lifecycle Metadata
Operational metadata not managed by the Visual Editor:
- `status` ("Draft", "Published", "Approved", "Changes Requested", "Archived")
- `productCount`
- `lastUpdated`, `createdAt`

### 2.3 Write Policy Rules Matrix

| Store State | Mutation Type | Incoming Version | Policy Action | Concurrency Protection Mechanism |
|---|---|---|---|---|
| **Versioned** (`v >= 1`) | Editor Data | Valid (`v > current`) | **ACCEPT** | Advances store to `v = incomingVersion`. |
| **Versioned** (`v >= 1`) | Editor Data | Stale (`v <= current`) | **REJECT (409 Conflict)** | Returns HTTP 409 Conflict. Data unchanged. |
| **Versioned** (`v >= 1`) | Editor Data | Undefined (Unversioned) | **BLOCK (409 Conflict)** | Unversioned write cannot bypass versioned store. |
| **Versioned** (`v >= 1`) | Editor Data | Undefined + `serverAutoVersion: true` | **ACCEPT (Auto-Bump)** | Safe server auto-versioning: atomically bumps `v = current + 1`. |
| **Versioned** (`v >= 1`) | Metadata Only (`status`) | Undefined (Unversioned) | **ACCEPT (Preserve Version)** | Updates `status`; strictly preserves current version `v`. |
| **Unversioned** (`v = undefined`) | Any | Undefined (Legacy) | **ACCEPT (Legacy Path)** | Matched via `{ id, version: { $exists: false } }`. |

---

## 3. Storage Engine Implementation Parity

Both MongoDB and Fallback Memory Storage strictly enforce this write policy:

### 3.1 MongoDB Atomic Conditional Update (`src/lib/repositories/store.repository.ts`)
```typescript
let effectiveVersion: number | undefined;
let atomicFilter: Record<string, unknown>;

if (incomingVersion !== undefined) {
  effectiveVersion = incomingVersion;
  atomicFilter = {
    id,
    $or: [
      { version: { $exists: false } },
      { version: { $lt: incomingVersion } },
    ],
  };
} else if (typeof existing.version === "number") {
  if (isScopedAutoVersion) {
    effectiveVersion = existing.version + 1;
    atomicFilter = { id, version: existing.version };
  } else if (isScopedAllowUnversioned || !touchesEditorData) {
    effectiveVersion = existing.version;
    atomicFilter = { id, version: existing.version };
  } else {
    // Unversioned write policy violation: cannot overwrite versioned store
    return existing;
  }
} else {
  // Legacy unversioned store
  effectiveVersion = undefined;
  atomicFilter = { id, version: { $exists: false } };
}

const dataToUpdate = computeMergedStoreUpdates(existing, updates, effectiveVersion);
const updateResult = await db.collection<Store>("stores").updateOne(atomicFilter, { $set: dataToUpdate });
```

### 3.2 JSON / In-Memory Fallback Persistence
```typescript
return withStoreLock(id, async () => {
  const index = memoryStores.findIndex((s) => s.id === id);
  if (index === -1) return null;
  const existing = memoryStores[index];

  let effectiveVersion: number | undefined;

  if (incomingVersion !== undefined) {
    if (typeof existing.version === "number" && incomingVersion <= existing.version) {
      return existing;
    }
    effectiveVersion = incomingVersion;
  } else if (typeof existing.version === "number") {
    if (isScopedAutoVersion) {
      effectiveVersion = existing.version + 1;
    } else if (isScopedAllowUnversioned || !touchesEditorData) {
      effectiveVersion = existing.version;
    } else {
      // Unversioned write policy violation: cannot overwrite versioned store
      return existing;
    }
  } else {
    effectiveVersion = undefined;
  }

  const dataToUpdate = computeMergedStoreUpdates(existing, updates, effectiveVersion);
  memoryStores[index] = { ...existing, ...dataToUpdate };
  return memoryStores[index];
});
```

### 3.3 HTTP API Route Enforcement (`src/app/api/stores/[id]/route.ts`)
```typescript
if (existing.version !== undefined) {
  if (typeof updates.version === "number") {
    if (updates.version <= existing.version) {
      return NextResponse.json(
        {
          error: "Conflict: Store was modified in another session or tab.",
          conflict: true,
          currentVersion: existing.version,
        },
        { status: 409 }
      );
    }
  } else if (touchesEditorData && !isScopedAutoVersion && !isScopedAllowUnversioned) {
    return NextResponse.json(
      {
        error: "Conflict: Unversioned update cannot modify editor-managed data on a versioned store. A valid revision version is required.",
        conflict: true,
        currentVersion: existing.version,
      },
      { status: 409 }
    );
  }
}
```

---

## 4. Verification & Defense Evidence

The policy was empirically verified in `tests/phase15-1-1-5-mutex-and-write-policy.test.ts`:
1. **Newer Version Accepted:** Update with `version = 6` on a store at `version = 5` commits cleanly.
2. **Stale Version Rejected:** Update with `version = 4` on a store at `version = 5` is rejected without modifying database/memory.
3. **Unversioned Bypass Blocked:** Unversioned update with `{ name: "Bypass Overwrite" }` on a store at `version = 5` is blocked; store remains at `version = 5` with original name.
4. **Legacy Compatibility Preserved:** Legacy store without version accepts unversioned updates cleanly.
5. **Metadata Update Preserved:** Status update to `"Published"` on a store at `version = 8` succeeds while strictly preserving `version = 8`.
6. **Scoped Auto-Version:** Media upload passing `serverAutoVersion: true` atomically increments version from 8 to 9.
7. **Concurrent Writes:** Simultaneous versioned write (`v=6`) and unversioned write competing; versioned write succeeds, unversioned write cannot corrupt or overwrite data.
