# GridRetail — Phase 18.2: Advanced Visual Editor Audit

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Inspected Components:**
- Visual Editor Page: [src/app/stores/[id]/editor/page.tsx](file:///d:/grid/src/app/stores/[id]/editor/page.tsx)
- Editor Toolbar: [src/components/editor/EditorToolbar.tsx](file:///d:/grid/src/components/editor/EditorToolbar.tsx)
- Editor Canvas & Iframe: [src/components/editor/EditorCanvas.tsx](file:///d:/grid/src/components/editor/EditorCanvas.tsx)
- Left Panel (Sections, Pages, Theme): [src/components/editor/EditorLeftPanel.tsx](file:///d:/grid/src/components/editor/EditorLeftPanel.tsx)
- Right Panel (Section Inspector): [src/components/editor/EditorRightPanel.tsx](file:///d:/grid/src/components/editor/EditorRightPanel.tsx)
- Add Section Modal: [src/components/editor/AddSectionModal.tsx](file:///d:/grid/src/components/editor/AddSectionModal.tsx)

---

## 1. Editor Layout & Architecture Overview

The Advanced Visual Editor provides a 3-column workspace:
1. **Left Panel (320px width):**
   - **Sections Tab:** Reorderable section list, visibility toggles (eye icon), duplicate, delete, and "+ Add Section" trigger.
   - **Pages Tab:** Directory of subpages corresponding to the store's website type.
   - **Theme Tab:** Global color scheme selector, font typography options, border radii controls.
2. **Center Canvas (Flexible width):**
   - Live iframe rendering `/stores/[id]/preview?embed=true`.
   - Viewport switcher bar: Desktop (`1440px`), Tablet (`768px`), Mobile (`375px`).
   - Zoom controls and refresh iframe trigger.
3. **Right Panel (320px width):**
   - Dynamic Inspector for the currently selected section.
   - Text field editors, layout options, alignment toggles, image upload pickers, button links, and color overrides.

---

## 2. Editor Canvas Viewport Sizing Discrepancy (DEF-008)

### 2.1 Technical Analysis & Root Cause
- **Component:** [src/components/editor/EditorCanvas.tsx](file:///d:/grid/src/components/editor/EditorCanvas.tsx#L55-L95)
- **Code:**
```tsx
const VIEWPORT_CONFIGS = {
  desktop: { width: "100%", maxWidth: "1440px", label: "1440px • Desktop" },
  tablet: { width: "768px", maxWidth: "768px", label: "768px • Tablet" },
  mobile: { width: "375px", maxWidth: "375px", label: "375px • Mobile" },
};
```
- **The Issue:**
  1. The Left Panel occupies `320px` and the Right Panel occupies `320px`. Total sidebar width = `640px`.
  2. On a standard 1080p desktop monitor (`1920 × 1080`) or laptop screen (`1440 × 900`), the center canvas container only has `1920 - 640 = 1280px` or `1440 - 640 = 800px` of available width.
  3. In Desktop mode, the canvas wrapper is set to `w-full max-w-[1440px]`. Because the wrapper has no room to expand beyond `800px` (or `1280px`), the iframe receives an actual rendered viewport width of `~800px`.
  4. There is no CSS `transform: scale(...)` or scaled container implementation.
- **Visual Consequence:**
  The header and components inside the preview iframe trigger tablet breakpoint rules (`< 1024px`) even while the top status bar proudly states `"1440px • Desktop"`. Elements like navigation links condense or switch to mobile menus unexpectedly.
- **Severity:** P2 (Medium).
- **Suggested Fix:**
  Implement CSS transform scaling for the desktop canvas:
  ```tsx
  const scale = Math.min(1, availableWidth / 1440);
  // Apply style={{ width: '1440px', transform: `scale(${scale})`, transformOrigin: 'top center' }}
  ```

---

## 3. Left Panel: Pages Tab Scope & Limitation (DEF-009)

### 3.1 Pages Tab Analysis
- **Component:** [src/components/editor/EditorLeftPanel.tsx](file:///d:/grid/src/components/editor/EditorLeftPanel.tsx#L140-L195)
- **Audit Finding:**
  The Pages tab lists sub-pages according to the store's website type:
  - For E-Commerce: `Home`, `Catalog / Collections`, `Product Detail`, `Shopping Cart`, `Checkout`.
  - For Appointments: `Home`, `Booking Calendar`, `Service Directory`, `Cancellation Portal`.
  - For Lead Gen: `Home`, `Lead Form Intake`, `Thank You / Confirmation`.
- **Limitation:**
  Clicking on these page items instructs the iframe to navigate to the subpage URL (e.g. `/store/[slug]/cart`). However, the section list in the Left Panel and the Inspector in the Right Panel only manage sections on the **Home / Landing Page**.
  Sub-pages (such as the Cart Page or Checkout) are template-rendered client components and do not support dynamic section insertion, section reordering, or block customization in the editor.
- **Severity:** P3 (Architectural Limitation / Scope Boundary).

---

## 4. Undo / Redo History & State Management

### 4.1 History Stack Verification
- **Component:** [src/app/stores/[id]/editor/page.tsx](file:///d:/grid/src/app/stores/[id]/editor/page.tsx#L85-L135)
- **Mechanism:**
  - Maintains `history: StoreSection[][]` and `historyIndex: number`.
  - Each time a section is added, reordered, deleted, or edited, the new section array is appended to `history`.
  - Clicking `Undo`: Decrements `historyIndex` and pushes the prior section state to the iframe via `postMessage`.
  - Clicking `Redo`: Increments `historyIndex` and restores the next state.
  - Buttons disable appropriately (`disabled={historyIndex <= 0}` and `disabled={historyIndex >= history.length - 1}`).
- **Finding:** History undo/redo works accurately without memory leaks or race conditions.

---

## 5. Section CRUD & Inspector Operations

1. **Add Section:**
   - Clicking `+ Add Section` opens `AddSectionModal` displaying categories (Hero, Features, Media, Pricing, Social Proof, Conversion).
   - Selecting a section inserts it at the bottom of the stack, auto-generates a unique `id`, and scrolls the preview iframe to the newly inserted block.
2. **Reordering Sections:**
   - Drag handles and arrow buttons (`Move Up` / `Move Down`) reorder items in the array and trigger an immediate re-render in the canvas.
3. **Visibility Toggling:**
   - Clicking the eye icon sets `section.visible = !section.visible`. Hidden sections are filtered out of the live preview.
4. **Inspector Controls:**
   - Editing title, subtitle, alignment, background color, or button text updates the canvas in real-time with zero latency.
5. **Save & Publish:**
   - `Save Draft` sends `PATCH /api/stores/[id]` updating the `sections` array and theme.
   - `Publish` updates store status to `published`, triggers static revalidation, and displays a modal with the live URL.

---

## 6. Visual Proof Screenshot References

| Screenshot Filename | Viewport | Verified Behavior |
|---|---|---|
| [15-editor-desktop-canvas.png](file:///d:/grid/docs/screenshots/phase18-2/15-editor-desktop-canvas.png) | 1440 × 900 | Editor 3-column layout showing Left Panel, Center Canvas, and Right Inspector |
| [16-editor-section-inspector.png](file:///d:/grid/docs/screenshots/phase18-2/16-editor-section-inspector.png) | 1440 × 900 | Close-up of Right Panel Inspector modifying Hero section props |
| [17-editor-pages-tab.png](file:///d:/grid/docs/screenshots/phase18-2/17-editor-pages-tab.png) | 1440 × 900 | Left Panel Pages tab displaying available subpage routes |
| [18-editor-theme-panel.png](file:///d:/grid/docs/screenshots/phase18-2/18-editor-theme-panel.png) | 1440 × 900 | Left Panel Theme tab displaying font and palette pickers |
| [19-editor-add-section-modal.png](file:///d:/grid/docs/screenshots/phase18-2/19-editor-add-section-modal.png) | 1440 × 900 | Add Section modal dialog displaying section categories |
| [38-tablet-editor-768.png](file:///d:/grid/docs/screenshots/phase18-2/38-tablet-editor-768.png) | 768 × 1024 | Visual Editor responsive layout at tablet breakpoint |
| [41-mobile-editor-390.png](file:///d:/grid/docs/screenshots/phase18-2/41-mobile-editor-390.png) | 390 × 844 | Visual Editor responsive layout on mobile viewport |
