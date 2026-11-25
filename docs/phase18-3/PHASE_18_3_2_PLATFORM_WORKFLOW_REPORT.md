# GridRetail — Phase 18.3.2 Milestone Report
## Platform Workflow Completion, State Persistence & Editor Integrity

**Milestone:** Phase 18.3.2  
**Date:** November 23, 2026  
**Status:** COMPLETE & VERIFIED  
**Test Suite:** `tests/phase18-3-2.test.ts` (9/9 tests passing)

---

## 1. Executive Summary

Milestone 18.3.2 focused on remediating 8 platform workflow defects:
- **DEF-006:** Store Delete, Archive, and Unpublish Lifecycle Transitions
- **DEF-013:** Appointment Atomic Rescheduling and Conflict Detection
- **DEF-002:** Persistent Header Notifications API & Dropdown Sync
- **DEF-003:** Activity Drawer Client Dismissal Cursor & Audit Immutability
- **DEF-007:** Apply Template to Existing Storefront Flow
- **DEF-009:** Page-Scoped Visual Editor Section Isolation (`pageSections`)
- **DEF-017:** Persistent Platform & Workspace Settings Repository
- **DEF-018:** Account Profile & Password Management with Bcrypt Verification

All remediation items were implemented following strict verification standards: no mock placeholders, genuine MongoDB repository persistence with graceful memory fallbacks, transactional safety, and full UI state synchronization.

---

## 2. Detailed Defect Remediation

### DEF-006: Store Delete, Archive, and Unpublish
- **Root Cause:** Stores page only provided view/edit links without deletion, archival, or unpublish triggers. Stores could not transition between `Draft` and `Archived` without manual database manipulation.
- **Remediation:**
  - Extended `src/app/stores/page.tsx` with:
    - **Delete Confirmation Modal** calling `DELETE /api/stores/[id]` with permanent cascade cleanup.
    - **Archive / Restore Action** updating status via `PATCH /api/stores/[id]` (`Archived` vs `Draft`).
    - **Unpublish Confirmation Modal** transitioning `Published` storefronts back to `Draft`.
    - Added `"Archived"` status filter dropdown item; archived stores are safely excluded from the active workspace view by default.
  - Added "Unpublish" action button to `src/components/editor/EditorToolbar.tsx`.

### DEF-013: Appointment Atomic Rescheduling
- **Root Cause:** Appointment calendar lacked a rescheduling mechanism. Rescheduling attempts required manual cancellation and re-booking, which risked losing slot reservations.
- **Remediation:**
  - Added `AppointmentRepository.reschedule(id, newStartUtc, newEndUtc, providerId)` in `src/lib/repositories/appointment.repository.ts`.
  - Implemented lock release and overlap verification excluding the appointment being rescheduled.
  - Extended `PATCH /api/stores/[id]/appointments/[appointmentId]/route.ts` to support atomic rescheduling.
  - Added `RescheduleModal` and "Reschedule" action buttons to both tabular and modal detail views in `src/app/stores/[id]/schedule/page.tsx`.

### DEF-002: Persistent Header Notifications
- **Root Cause:** `AppHeader.tsx` stored notifications in ephemeral React `useState`. Marking notifications as read or clearing them was lost on page refresh.
- **Remediation:**
  - Created `src/app/api/notifications/route.ts` supporting `GET` (returns `{ notifications, unreadCount }`) and `PATCH` (marks single notification or all notifications read).
  - Extended `NotificationRepository` with in-app notification persistence (`findAppNotifications`, `createAppNotification`, `markAppNotificationRead`, `markAllAppNotificationsRead`) in collection `app_notifications`.
  - Wired `AppHeader.tsx` to load from and mutate against `/api/notifications`. Read states survive hard reloads and multi-tab sessions.

### DEF-003: Activity Drawer Clear Behavior
- **Root Cause:** Clearing activities from the drawer mutated local state without backend persistence, while clearing audit logs would violate audit immutability compliance.
- **Remediation:**
  - Maintained complete immutability of audit records in MongoDB `activities` collection.
  - Implemented persistent user dismissal cursor (`gridretail_activities_dismissed_until`) in `localStorage` in `src/components/shared/ActivityDrawerModal.tsx`.
  - Filtered out historical activities prior to the dismissal timestamp on subsequent drawer openings and across page refreshes.
  - Added "Clear View" and "Restore All" options with status banner to restore visibility anytime.

### DEF-007: Apply Template to Existing Storefront
- **Root Cause:** Template catalog only allowed using a template to create a new store (`/stores/new?templateId=...`), with no way to apply a layout template to an existing project.
- **Remediation:**
  - Added "Apply to Store" button on template cards and in the interactive preview modal in `src/app/templates/page.tsx`.
  - Built `ApplyTemplateModal` with target store dropdown.
  - Connected to `PATCH /api/stores/[id]` updating `templateId` and `templateName` with `serverAutoVersion: true`, preserving business profile, products, appointments, leads, and custom branding tokens.

### DEF-009: Page-Scoped Visual Editor Section Isolation
- **Root Cause:** Visual Editor page switcher allowed selecting subpages (Catalog, Services, Booking, Inquiry, Contact), but adding, reordering, and updating sections mutated global `sections`, overwriting the Home Page layout.
- **Remediation:**
  - Introduced `pageSections: Record<string, SectionInstance[]>` in `Store` and `EditorSnapshot` types.
  - In `src/components/editor/VisualEditorWorkspace.tsx`, derived `activeSections` based on `currentPageId`.
  - Directed all section operations (`handleAddSection`, `handleDeleteSection`, `handleReorderSections`, etc.) to mutate only the currently active page's section list.
  - Isolated subpage layouts from Home Page sections; edits to subpages persist cleanly without cross-page corruption.

### DEF-017: Persistent Platform & Workspace Settings
- **Root Cause:** Settings forms saved only to client `localStorage`, resetting to defaults on server refresh.
- **Remediation:**
  - Created `src/lib/repositories/settings.repository.ts` with `SystemSettings` schema stored in collection `system_settings`.
  - Created `src/app/api/settings/route.ts` (`GET`, `PATCH`).
  - Connected `src/app/settings/page.tsx` tabs (General, Notifications) to fetch and mutate server settings, ensuring multi-session persistence.

### DEF-018: Account Profile & Password Management
- **Root Cause:** Account tab was read-only with no password change capabilities.
- **Remediation:**
  - Added editable Display Name and Email inputs with "Save Profile Changes" in `src/app/settings/page.tsx`.
  - Created `PATCH /api/users/profile` verifying email format and uniqueness.
  - Created `POST /api/users/password` verifying current password with bcrypt, enforcing 8-character minimum complexity, hashing with salt, and updating user records in `UserRepository`.

---

## 3. Automated Test Verification Results

All unit and integration tests executed via Node Test Runner:
```
▶ Phase 18.3.2 — Platform Workflow Remediation Suite
  ✔ DEF-006: Store status transitions between Published, Draft, and Archived, plus deletion (5.8585ms)
  ✔ DEF-013: Appointment rescheduling atomically updates times and validates overlaps (5.2001ms)
  ✔ DEF-002: Notifications persist read states and support mark-all-read (1.4071ms)
  ✔ DEF-003: Activity drawer dismissed cursor filters activities prior to cursor timestamp (0.3759ms)
  ✔ DEF-007: Apply template to existing store updates template pairing and preserves metadata (0.5164ms)
  ✔ DEF-009: Visual Editor page-scoped section sets isolate subpage sections from home sections (0.6819ms)
  ✔ DEF-017: Platform settings persist across calls and updates (0.8428ms)
  ✔ DEF-018: User profile update and password change with bcrypt verification (678.1509ms)
✔ Phase 18.3.2 — Platform Workflow Remediation Suite (702.8079ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
```

---

## 4. Milestone Sign-off

Milestone 18.3.2 is complete, fully functional, type-safe, and passes all regression tests. Proceeding to Milestone 18.3.3.
