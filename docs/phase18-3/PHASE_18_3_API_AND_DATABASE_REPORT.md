# GridRetail — Phase 18.3: API & Database Persistence Report

**Application:** GridRetail — Multi-Tenant Website Generation Platform  
**Milestone:** Phase 18.3  
**Status:** Approved & Implemented  
**Date:** November 2026  
**Stack:** Next.js 15 App Router, MongoDB, Auth.js

---

## 1. Overview & Data Architecture

Phase 18.3 expanded and hardened the GridRetail persistence layer, eliminating disconnected frontend mock state and ensuring every user action is backed by schema validation and atomic database writes.

### Primary Collections & Schema Definitions

| Collection | Model Interface | Primary Key | Key Fields & Secondary Indexes |
| :--- | :--- | :--- | :--- |
| `stores` | `Store` | `id` | `slug` (unique), `clientId`, `industry`, `templateId`, `themeId`, `status`, `pageSections` |
| `products` | `Product` | `id` | `sku` (unique), `price`, `currency`, `category`, `stockStatus`, `storeId` |
| `clients` | `Client` | `id` | `company`, `contactEmail`, `status`, `storeCount` |
| `appointments`| `AppointmentBooking` | `id` | `storeId`, `serviceId`, `providerId`, `startUtc`, `endUtc`, `status`, `customerEmail` |
| `orders` | `StoreOrder` | `id` | `orderNumber` (unique), `storeId`, `storeSlug`, `customer`, `items`, `grandTotal`, `status` |
| `lead_forms` | `LeadForm` | `id` | `storeId`, `isDefault`, `currentDraft`, `publishedVersion`, `publishedSteps`, `publishedSettings` |
| `lead_form_versions`| `LeadFormVersion` | `id` | `formId`, `storeId`, `version`, `steps`, `settings`, `publishedAt`, `publishedBy` |
| `app_notifications` | `AppNotification` | `id` | `userId`, `tenantId`, `title`, `message`, `type`, `read`, `createdAt` |
| `settings` | `SystemSettings` | `id` | `workspaceName`, `storeExpiryDays`, `emailAlerts`, `reviewAlerts`, `updatedAt` |
| `users` | `User` | `id` | `email` (unique), `passwordHash`, `name`, `role`, `status` |

---

## 2. API Route Expansions & Enhancements

### 1. Products API
- `POST /api/products`: Validates product payload, generates unique SKU code and ID, sets default `stockStatus` and currency, and writes to `ProductRepository`.
- `GET /api/products/[id]`: Retrieves specific product by ID.
- `PATCH /api/products/[id]`: Validates numeric price, category, and stock status updates; applies atomic update.
- `DELETE /api/products/[id]`: Removes product from database and memory cache.

### 2. Clients API
- `POST /api/clients`: Validates corporate client details and persists client record.
- `GET /api/clients/[id]`: Returns client details along with all associated storefronts resolved via `StoreRepository.findByClientId(id)`.
- `PATCH /api/clients/[id]`: Updates company name, contact email, phone, and status (`Active`, `Prospect`, `Archived`).
- `DELETE /api/clients/[id]`: Removes client record with GDPR confirmation.

### 3. Public Orders API
- `POST /api/public/orders`: Validates cart items, customer name, email, and shipping address; calculates subtotal and 18% GST demo tax; generates persistent `ORD-XXXX` order number; and writes to `orders` collection.

### 4. Lead Forms API
- `GET /api/stores/[id]/forms`: Returns store default `LeadForm`. If unseeded, automatically seeds a standard Consultation Assessment template and publishes version 1.
- `PATCH /api/stores/[id]/forms`: Accepts `steps`, `settings`, and optional `publish: true`. When publishing, creates an immutable `LeadFormVersion` record, increments `publishedVersion`, and updates the public storefront snapshot.

### 5. Notifications API
- `GET /api/notifications`: Retrieves notifications scoped to authenticated user and tenant, returning unread count.
- `PATCH /api/notifications`: Supports individual notification read toggling (`{ id, read }`) or bulk mark-all-read (`{ markAllRead: true }`).

### 6. Settings API
- `GET /api/settings`: Returns platform workspace settings for active tenant.
- `PATCH /api/settings`: Updates workspace name, expiry thresholds, and notification alert preferences.

### 7. User Profile & Password APIs
- `PATCH /api/users/profile`: Updates name and email of authenticated user with duplicate prevention.
- `POST /api/users/password`: Validates current password using `bcrypt.compare`, enforces 8-character complexity, and writes new bcrypt hash.

---

## 3. Resilience & In-Memory Fallbacks

All repositories maintain dual persistence:
1. **Primary Production Mode:** Direct atomic writes to MongoDB using official driver connection pool.
2. **In-Memory Development / Test Fallback:** Seamless in-memory arrays enabled when `ALLOW_IN_MEMORY_FALLBACK="true"`, ensuring full functionality during offline development and continuous integration test runners.
