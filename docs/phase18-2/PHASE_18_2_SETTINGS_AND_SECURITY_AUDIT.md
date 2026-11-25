# GridRetail — Phase 18.2: Settings, Profile & Platform Security Audit

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Inspected Components:**
- Settings Page: [src/app/settings/page.tsx](file:///d:/grid/src/app/settings/page.tsx)
- Auth Configuration: [src/auth.ts](file:///d:/grid/src/auth.ts), [src/auth.config.ts](file:///d:/grid/src/auth.config.ts)
- User Repository: [src/lib/repositories/user.repository.ts](file:///d:/grid/src/lib/repositories/user.repository.ts)
- Middleware & Route Guards: [src/middleware.ts](file:///d:/grid/src/middleware.ts)

---

## 1. Platform Settings Page Tabs & Functional Scoping

The Settings page ([src/app/settings/page.tsx](file:///d:/grid/src/app/settings/page.tsx)) was audited across all four tabs:

### 1.1 General Tab (DEF-017)
- **Controls:** Platform Title, Default Currency (`USD`, `EUR`, `GBP`), Default Timezone (`UTC`, `America/New_York`, etc.), and Theme Mode (Light / Dark).
- **Finding:**
  Clicking "Save Changes" shows a green confirmation toast and serializes settings to browser `localStorage` (`gridretail_general_settings`).
  These settings are client-side only and are not persisted to a server database table or platform config repository.
- **Severity:** P3 (Low Severity — Local Storage Scope).

### 1.2 Account Profile Tab (DEF-018)
- **Controls:** Displays current user information (`Alex Mercer`, `alex.mercer@gridretail.internal`, Role: `Admin`).
- **Finding:**
  The input fields for Name and Email are marked `readOnly` or `disabled`.
  There is **no password change or reset mechanism** available for existing authenticated users from this UI, and no `PATCH /api/users/profile` endpoint exists.
- **Severity:** P2 (Medium Severity — Read-Only Profile & Missing Password Management).

### 1.3 Team Management Tab
- **Controls:** Lists registered team members, their assigned email addresses, roles (`Admin`, `Operator`, `Viewer`), and status (`Active`).
- **Invite Member:** Clicking `"Invite Team Member"` opens a modal allowing input of email and role selection. Submits to `POST /api/users` and appends the user to the team roster.

### 1.4 Notifications Tab
- **Controls:** Toggles for email alerts, in-app sounds, and browser push notifications.
- **Persistence:** Persists to `localStorage` with instant local reactivity.

---

## 2. Platform Security, Authentication & Tenant Isolation

### 2.1 Authentication Architecture
- Built on **Auth.js (v5 / NextAuth)** with JWT session strategy.
- Password hashing uses `bcryptjs` with salt rounds = 10.
- Protected routes (`/dashboard`, `/stores`, `/settings`, etc.) are intercepted by `src/middleware.ts`. Unauthenticated sessions are redirected to `/login` with a `callbackUrl` parameter.

### 2.2 Role-Based Access Control (RBAC)
- Supported roles: `admin`, `operator`, `viewer`.
- Verified authorization guards:
  - System maintenance endpoint (`/api/admin/maintenance`): Requires `role === 'admin'`. When requested with an `operator` session, correctly returns `HTTP 403 Forbidden`.
  - Store modifications (`PUT /api/stores/[id]`): Allows `admin` and `operator`; blocks `viewer`.

### 2.3 Multi-Tenant Isolation
- In all store repositories (`StoreRepository`, `AppointmentRepository`, `LeadRepository`), every query includes the active session's `tenantId`:
  `{ _id: storeId, tenantId: session.user.tenantId }`
- Verified that cross-tenant access attempts return `HTTP 404 Not Found` or `HTTP 403 Forbidden`, preventing data leakage between clients.

---

## 3. Visual Proof Screenshot References

| Screenshot Filename | Viewport | Verified Behavior |
|---|---|---|
| [27-settings-general-tab.png](file:///d:/grid/docs/screenshots/phase18-2/27-settings-general-tab.png) | 1440 × 900 | Settings General tab with platform branding and currency options |
| [28-settings-account-tab.png](file:///d:/grid/docs/screenshots/phase18-2/28-settings-account-tab.png) | 1440 × 900 | Settings Account tab showing read-only profile information |
| [29-settings-team-tab.png](file:///d:/grid/docs/screenshots/phase18-2/29-settings-team-tab.png) | 1440 × 900 | Settings Team tab showing operator accounts and roles |
| [30-settings-notifications-tab.png](file:///d:/grid/docs/screenshots/phase18-2/30-settings-notifications-tab.png) | 1440 × 900 | Settings Notifications tab with alert toggles |
