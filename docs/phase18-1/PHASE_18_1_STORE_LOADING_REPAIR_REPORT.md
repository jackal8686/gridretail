# GridRetail — Phase 18.1 Store Loading Repair Report

**Author:** GridRetail Engineering  
**Date:** November 23, 2026  
**Document ID:** GR-P18-1-STORE-LOAD-001  
**Status:** Remediated & Verified

---

## 1. Scope & Objective

This report documents the resolution of the store loading failures affecting Appointment Scheduling and Lead Generation website builders in Phase 18.

---

## 2. Technical Implementation

### 2.1 Repository Resolution Layer (`src/lib/repositories/store.repository.ts`)
The `findById` method was enhanced to support dual-key resolution:
```ts
async findById(id: string): Promise<Store | null> {
  const ALIAS_MAP: Record<string, string> = {
    str_summit: "str_07",
    str_apex: "str_08",
  };
  const lookupId = ALIAS_MAP[id] || id;

  const db = await getDb();
  if (db) {
    try {
      const store = await db.collection<Store>("stores").findOne({
        $or: [{ id: lookupId }, { slug: lookupId.toLowerCase() }],
      });
      if (store) {
        const raw = { ...store } as Record<string, unknown>;
        const storeId = store.id || (raw._id ? String(raw._id) : "");
        delete raw._id;
        return { ...raw, id: storeId } as unknown as Store;
      }
    } catch (err) {
      console.warn("MongoDB query error in StoreRepository.findById:", err);
    }
  }
  return (
    memoryStores.find((s) => s.id === lookupId || s.slug === lookupId.toLowerCase()) || null
  );
}
```

### 2.2 API Route Handler Layer (`src/app/api/stores/[id]/route.ts`)
Both `GET` and `PATCH` endpoints were upgraded to check `findById` followed by `findBySlug`:
```ts
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let store = await StoreRepository.findById(id);
  if (!store) {
    store = await StoreRepository.findBySlug(id);
  }

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  // Draft store security verification follows...
  return NextResponse.json({ store });
}
```

### 2.3 Navigation & Spotlight Consistency (`src/components/shared/GlobalSpotlightModal.tsx`)
Updated fallback stores from `str_summit` / `str_apex` to canonical IDs:
- Summit Legal Practice: `id: "store-str_07"`, `href: "/stores/str_07"`
- Apex Growth Advisory: `id: "store-str_08"`, `href: "/stores/str_08"`

---

## 3. Verification & Evidence

Automated tests in `tests/phase18-1-stabilization.test.ts` verify:
1. Lookup by canonical IDs (`str_01`, `str_07`, `str_08`) succeeds.
2. Lookup by slug (`summit-legal`, `apex-growth`, `aura-minimalist`) succeeds.
3. Lookup by legacy aliases (`str_summit`, `str_apex`) resolves to `str_07` and `str_08`.
4. Browser capture `appointment-builder.png` confirms Summit Legal Practice loads cleanly without error cards.
5. Browser capture `leadgen-builder.png` confirms Apex Growth Advisory loads cleanly with all form controls.
