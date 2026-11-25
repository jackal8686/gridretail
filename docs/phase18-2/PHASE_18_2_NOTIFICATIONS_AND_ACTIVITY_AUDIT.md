# GridRetail — Phase 18.2: Activity Logging & Notification System Audit

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Inspected Components:**
- Header Notification Menu: [src/components/layout/AppHeader.tsx](file:///d:/grid/src/components/layout/AppHeader.tsx)
- Activity Drawer Modal: [src/components/shared/ActivityDrawerModal.tsx](file:///d:/grid/src/components/shared/ActivityDrawerModal.tsx)
- Notification Repository: [src/lib/repositories/notification.repository.ts](file:///d:/grid/src/lib/repositories/notification.repository.ts)
- Activity Repository: [src/lib/repositories/activity.repository.ts](file:///d:/grid/src/lib/repositories/activity.repository.ts)
- Activity API Route: [src/app/api/activities/route.ts](file:///d:/grid/src/app/api/activities/route.ts)
- Settings Notifications Tab: [src/app/settings/page.tsx](file:///d:/grid/src/app/settings/page.tsx)

---

## 1. Notification System Architecture & Defect Diagnosis

### 1.1 Header Notification Dropdown (DEF-002)
- **Component:** [src/components/layout/AppHeader.tsx](file:///d:/grid/src/components/layout/AppHeader.tsx#L40-L75)
- **Current Implementation:**
  The notification badge in the platform header shows an unread count of `2`.
  When clicked, a dropdown opens displaying two static notifications:
  1. *"Aura Minimalist review request submitted — 15m ago"*
  2. *"Botanica Apothecary published to production — 1h ago"*
- **The Defect:**
  ```tsx
  const [notifications, setNotifications] = useState([
    { id: "n-1", title: "Aura Minimalist review request submitted", unread: true },
    { id: "n-2", title: "Botanica Apothecary published to production", unread: true },
  ]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };
  ```
  - The notification list is defined in component-level React state.
  - It does NOT call `GET /api/notifications` or query `NotificationRepository`.
  - When the operator clicks "Mark all as read", the UI updates locally, but upon page reload or navigation, the state resets back to the two hardcoded items.
- **Severity:** P2 (Medium Severity — Mock Isolation).
- **Suggested Remediation:**
  Create an endpoint `GET /api/notifications` and `PATCH /api/notifications` powered by `NotificationRepository`, and connect `AppHeader.tsx` via SWR or React Query.

---

## 2. Activity Feed Drawer (`ActivityDrawerModal.tsx`)

### 2.1 Live Data Fetching & Audit Log
- **Component:** [src/components/shared/ActivityDrawerModal.tsx](file:///d:/grid/src/components/shared/ActivityDrawerModal.tsx)
- **Data Source:** Fetches from `GET /api/activities` on open.
- **Verification:**
  - Auditing confirmed that real audit log events created across the platform are returned.
  - The feed correctly parses and renders action badges:
    - `store.created` (Green badge)
    - `store.updated` (Blue badge)
    - `store.published` (Purple badge)
    - `store.exported` (Amber badge)
  - Timestamps are formatted with human-readable relative intervals ("2 minutes ago", "1 hour ago").
  - Includes user avatar, store link, and description.

### 2.2 "Clear All Activities" Frontend-Only Limitation (DEF-003)
- **Component:** [src/components/shared/ActivityDrawerModal.tsx](file:///d:/grid/src/components/shared/ActivityDrawerModal.tsx#L90-L110)
- **Code:**
```tsx
const handleClearAll = () => {
  setActivities([]);
};
```
- **Finding:**
  Clicking "Clear all" clears the local state variable, making the drawer appear empty. However, no `DELETE /api/activities` request is sent to the server. Closing and reopening the drawer or reloading the page re-fetches and displays all activity items.
- **Severity:** P3 (Low Severity — Inconsistent Clearing).

---

## 3. Settings: Notification Preferences Persistence

### 3.1 Preferences Configuration
- In `/settings` under the "Notifications" tab ([src/app/settings/page.tsx](file:///d:/grid/src/app/settings/page.tsx#L310-L365)), operators can toggle preferences for:
  - *Email Notifications on New Feedback*
  - *Email Notifications on Store Publishing*
  - *Browser Desktop Notifications*
  - *Weekly Analytics Digest*
- **Persistence Mechanism:**
  These preferences are saved to `localStorage` under the key `gridretail_notification_preferences`.
  They persist across sessions on the same browser, but are not synchronized across multiple operator devices.

---

## 4. Visual Proof Screenshot References

| Screenshot Filename | Viewport | Verified Behavior |
|---|---|---|
| [06-notifications-dropdown.png](file:///d:/grid/docs/screenshots/phase18-2/06-notifications-dropdown.png) | 1440 × 900 | Header notification popup displaying hardcoded items |
| [07-activity-drawer-modal.png](file:///d:/grid/docs/screenshots/phase18-2/07-activity-drawer-modal.png) | 1440 × 900 | Slide-out Activity Log drawer fetching dynamic audit records |
| [30-settings-notifications-tab.png](file:///d:/grid/docs/screenshots/phase18-2/30-settings-notifications-tab.png) | 1440 × 900 | Settings Notifications tab with toggle preferences |
