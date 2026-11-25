# GridRetail — Phase 18.2: Clients Management, Lead Generation & CRM Audit

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Inspected Components:**
- Clients Roster Page: [src/app/clients/page.tsx](file:///d:/grid/src/app/clients/page.tsx)
- Mock Clients Data: [src/mock/clients.ts](file:///d:/grid/src/mock/clients.ts)
- Client Repository: [src/lib/repositories/client.repository.ts](file:///d:/grid/src/lib/repositories/client.repository.ts)
- Lead CRM Page: [src/app/stores/[id]/leads/page.tsx](file:///d:/grid/src/app/stores/[id]/leads/page.tsx)
- Lead Repository: [src/lib/repositories/lead.repository.ts](file:///d:/grid/src/lib/repositories/lead.repository.ts)
- Lead Form Repository: [src/lib/repositories/lead-form.repository.ts](file:///d:/grid/src/lib/repositories/lead-form.repository.ts)
- Public Lead Gen View: [src/components/storefront/LeadGenWebsiteView.tsx](file:///d:/grid/src/components/storefront/LeadGenWebsiteView.tsx)

---

## 1. Clients Management Hub (`/clients`)

### 1.1 In-Memory Mock Isolation & Placeholder Actions (DEF-014, DEF-015)
The platform-wide Clients page ([src/app/clients/page.tsx](file:///d:/grid/src/app/clients/page.tsx)) was audited for database persistence and client operations.

#### Key Findings:
1. **Disconnected from Database / API (DEF-014):**
   - The page imports static client data: `import { MOCK_CLIENTS } from '@/mock/clients';`.
   - It does not fetch from `GET /api/clients` or interact with `ClientRepository`.
   - New stores created in the system do not link their client identities back to this page.
2. **"Add Client Account" Shows Placeholder Modal (DEF-015):**
   - Clicking `+ Add Client Account` triggers `setShowAddModal(true)`.
   - This opens a `PlaceholderModal` with message:
     `"Add Client Account is currently in development. Client organization provisioning will be available in a subsequent phase."`
3. **"Details" / Row Actions Show Placeholder Modal:**
   - Clicking `"Details"` or `"Edit"` on any client card or row displays the same `PlaceholderModal`.
   - Operators cannot edit contact emails, update corporate addresses, or adjust client tier levels from this UI.
- **Severity:** P2 (Medium Severity — Mock Isolation & Placeholder Actions).

---

## 2. Lead CRM Pipeline & Table Views (`/stores/[id]/leads`)

### 2.1 Kanban Board Pipeline
For stores generated with `websiteType: 'lead-generation'` (e.g. Apex Growth, Velocity Partners):
- The pipeline organizes inquiries across 5 stages:
  1. `New` (Initial inquiries)
  2. `Contacted` (Outreach initiated)
  3. `Qualified` (Sales qualified lead)
  4. `Proposal` (Pitch / proposal sent)
  5. `Won` (Closed contract)
- **Stage Progression:** Moving a card between columns triggers `PATCH /api/stores/[id]/leads/[leadId]` and immediately updates the lead's status and timestamp.
- **Lead Score:** Color-coded badge (`0–100`) calculated based on form completion, budget tier, and engagement.

### 2.2 Tabular View, Search & Filtering
- Switching to the Table view displays a searchable, sortable list with columns: Lead Name, Company, Email, Phone, Status, Score, Date Received, and Actions.
- Real-time search query filtering and stage dropdown filter work seamlessly.

### 2.3 Lead Detail Modal, Notes & Reminders
Clicking any lead opens the comprehensive detail drawer:
- **Full Form Submission Data:** Displays custom answers (e.g., Annual Revenue, Services Required, Project Timeline).
- **Internal Notes:** Operators can append timestamped notes via `POST /api/stores/[id]/leads/[leadId]/notes`.
- **Scheduled Reminders:** Operators can create follow-up reminder alerts via `POST /api/stores/[id]/leads/[leadId]/reminders`.

### 2.4 CSV Import & Export Operations
- **Export CSV:** Clicking `"Export Leads"` downloads a RFC-4180 compliant CSV file containing all leads and custom field responses.
- **Import CSV:** Clicking `"Import CSV"` provides a file picker and preview dialog. Submitting uploads the file to `POST /api/stores/[id]/leads/import`, parses records, checks for duplicate email addresses, and inserts new leads into the CRM.

---

## 3. Absence of Drag-and-Drop Form Builder UI (DEF-016)

### 3.1 Technical Analysis
- **Inspected Files:**
  - [src/lib/repositories/lead-form.repository.ts](file:///d:/grid/src/lib/repositories/lead-form.repository.ts)
  - [src/app/stores/[id]/leads/page.tsx](file:///d:/grid/src/app/stores/[id]/leads/page.tsx)
  - [src/components/forms/](file:///d:/grid/src/components/forms/)
- **The Issue:**
  1. The backend has a fully capable `LeadFormRepository` supporting custom field definitions (text, email, select, textarea, checkbox) and validation constraints.
  2. When a lead gen store is created via the wizard, a default lead form is programmatically generated.
  3. However, there is **NO user interface in the application for an operator to visually build or modify forms**. There is no form builder page, no field drag-and-drop tool, and no UI dialog to add/remove/reorder input fields on an existing store's intake form.
- **Consequence:**
  Operators cannot customize form questions or adjust field requirements after generation without manually editing MongoDB documents or database seed fixtures.
- **Severity:** P2 (Medium Severity — Missing Builder Interface).

---

## 4. Public Lead Intake Storefront Experience

### 4.1 Form Submission (`LeadGenWebsiteView.tsx`)
Audited on the live public storefront for Apex Growth (`/store/apex-growth/forms/default`):
1. **Hero & Value Proposition:** Clear headline, benefits list, and client logos.
2. **Interactive Form:** Fields for Full Name, Corporate Email, Company Name, Service Interest (Select), and Project Description.
3. **Validation & Honeypot:** Client-side validation ensures email syntax is valid and required inputs are populated; includes honeypot field to block automated spam.
4. **Submission Handler:** Submits to `POST /api/public/leads`.
5. **Confirmation:** Displays an animated green checkmark and "Thank You! An advisor will reach out within 24 hours."

---

## 5. Visual Proof Screenshot References

| Screenshot Filename | Viewport | Verified Behavior |
|---|---|---|
| [21-clients-page.png](file:///d:/grid/docs/screenshots/phase18-2/21-clients-page.png) | 1440 × 900 | Clients management page displaying mock enterprise accounts |
| [22-add-client-placeholder-modal.png](file:///d:/grid/docs/screenshots/phase18-2/22-add-client-placeholder-modal.png) | 1440 × 900 | Evidence of `DEF-015`: Placeholder modal triggered by "Add Client Account" |
| [25-lead-crm-kanban.png](file:///d:/grid/docs/screenshots/phase18-2/25-lead-crm-kanban.png) | 1440 × 900 | Lead CRM Kanban board with stage columns and lead score badges |
| [26-lead-crm-table-view.png](file:///d:/grid/docs/screenshots/phase18-2/26-lead-crm-table-view.png) | 1440 × 900 | Lead CRM Tabular view with search filter and CSV action buttons |
| [36-storefront-lead-gen.png](file:///d:/grid/docs/screenshots/phase18-2/36-storefront-lead-gen.png) | 1440 × 900 | Public Lead Generation storefront with hero and intake form |
