# GridRetail — Phase 18.1: Notifications & Activity Audit

## 1. Executive Summary

This audit assesses the platform's operator feedback systems: the global header Notifications Dropdown (`src/components/layout/NotificationsDropdown.tsx`) and the Full Platform Activity Feed Drawer (`src/components/shared/ActivityDrawerModal.tsx`).

---

## 2. Activity Logging Architecture

### 2.1 Backend Persistence (`src/lib/repositories/activity.repository.ts`)
* Activities are logged via `ActivityRepository.record()` across key operator actions:
  * Store generation & status transitions (`Published`, `Draft`).
  * Appointment bookings, reschedules, and cancellations.
  * Lead captures, qualification updates, and CRM notes.
  * Preview share link generation and client approval feedback.
* Events are persisted with UTC timestamps, operator metadata, store identifiers, and typed actions.

---

## 3. UI Fixes & Navigation Accuracy

### 3.1 Target Link Normalization
* **Issue:** Several activity entries previously contained hardcoded dead links to `str_summit` and `str_apex`.
* **Fix:** Corrected all target navigation links to canonical store IDs (`str_07`, `str_08`). Operators clicking activity entries now navigate directly to the correct store customizer or dashboard.

### 3.2 Header Dropdown Usability
* Displays the 5 most recent unread activities with human-readable relative timestamps.
* Includes a "Mark all as read" action that clears notification badges immediately.
* "View all platform activity" button triggers the full slide-over activity drawer modal.

---

## 4. Visual Evidence
Screenshots captured and stored in `docs/screenshots/phase18-1/`:
* `notifications-dropdown.png` (Desktop 1440 × 900)
* `activity-feed.png` (Desktop 1440 × 900)
