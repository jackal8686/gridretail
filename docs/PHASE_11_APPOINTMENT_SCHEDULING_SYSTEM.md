# GridRetail — Phase 11: Professional Appointment Scheduling System & Customizer Layout Engine

**Document Code:** `PHASE_11_APPOINTMENT_SCHEDULING_SYSTEM`  
**Phase:** 11 — Professional Appointment Scheduling System, Concurrency Control, Security Hardening & Customizer Layout Engine  
**Status:** Complete & Fully Verified  
**Date:** October 2026  
**Auditor / Lead Engineer:** Senior Full-Stack Engineer, Multi-Tenant Architect & Security Lead  

---

## 1. Executive Summary & Scope

Phase 11 transformed GridRetail into a dual-model website generator by adding first-class support for **Appointment Scheduling Websites** (`websiteType === "appointments"`) alongside existing e-commerce storefronts.

In addition to implementing core scheduling workflows, Phase 11 delivered:
1. **Concurrency Control:** Atomic slot-locking engine preventing double-bookings.
2. **Security & Privacy Hardening:** Cryptographic cancellation tokens, zero-log PII redaction, and strict tenant isolation.
3. **Customizer Compatibility & Layout Engine:** Full visual customizer parity across all 8 design templates and 12 color themes, including responsive headers, heroes, service cards, provider profiles, and modular content sections.

---

## 2. Architecture & Domain Models

### 2.1 Dual-Model Platform Architecture
The system supports two distinct website categories within a single codebase:
- **E-Commerce (`websiteType: "ecommerce"` or undefined):** Product catalog, variant management, cart drawer, and order simulation.
- **Appointments (`websiteType: "appointments"`):** Practitioner profiles, bookable services, working schedules, break windows, buffer times, timezone handling, and self-service cancellation tokens.

```
                      ┌───────────────────────────────────────┐
                      │    Store Model (websiteType Enum)     │
                      └──────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
    "ecommerce" (Default)                              "appointments"
 ┌─────────────────────────────┐                ┌─────────────────────────────┐
 │ • Catalog & Product SKUs    │                │ • Service Catalog           │
 │ • PDP & Category Filtering  │                │ • Practitioner Profiles     │
 │ • Cart Drawer & Checkout    │                │ • Slot Locking Engine       │
 │ • 29 Modular Sections       │                │ • 8 Template Layouts        │
 └─────────────────────────────┘                └─────────────────────────────┘
```

### 2.2 Appointment Domain Schemas (`src/types/appointment.ts`)
- **AppointmentService:** Defines service title, duration in minutes, price (INR), buffer time, and provider assignment.
- **PractitionerProvider:** Practitioner profile, bio, specialties, avatar, and individual weekly working hours.
- **ProviderSchedule:** Working windows per day of week, lunch breaks, and blackout dates.
- **AppointmentBooking:** Customer name, normalized email, phone, service ID, provider ID, start time, end time, status (`confirmed`, `cancelled`, `completed`), and cryptographic cancellation token hash.

---

## 3. Concurrency Control & Security Architecture

### 3.1 Dual-Layer Concurrency Control
To prevent simultaneous double-booking collisions:
1. **In-Process Mutex:** Node.js memory lock serializes concurrent booking requests targeting the same store and provider.
2. **Atomic Discrete Time Quanta Index (MongoDB):** A compound unique index on discrete 1-minute blocks:
   ```typescript
   await db.collection("appointment_slot_locks").createIndex(
     { storeId: 1, providerId: 1, slotMinute: 1 },
     { unique: true }
   );
   ```
   If two clients attempt to book overlapping 30-minute intervals, the secondary write triggers a duplicate key error (code `11000`) and safely aborts.

### 3.2 Reservation Lease Strategy & Rollback
- Mid-flight booking transactions claim a temporary reservation lease with a 5-minute TTL.
- If payment or client processing fails mid-flight, an automatic deterministic rollback releases the claimed slot locks.
- Stale locks from crashed processes are cleaned up autonomously via background TTL indexes.

### 3.3 Cancellation Token Security & PII Redaction
- **SHA-256 Hashed Tokens:** Raw cancellation tokens are generated using `crypto.randomBytes(32)` and returned once in customer confirmation emails. Only the SHA-256 hash is persisted.
- **HTTP Header Protection:** Cancellation endpoints return `Cache-Control: no-store` and `Referrer-Policy: no-referrer` to prevent token leakage in proxy caches and referrer logs.
- **Zero-Log PII Redaction:** Customer names, emails, phone numbers, and raw tokens are scrubbed from stdout and system loggers.

---

## 4. Customizer Compatibility & Layout Customization Fix

### 4.1 Root Causes Diagnosed
Before remediation, the visual customizer had significant gaps on appointment websites:
1. **Missing Handshake:** `AppointmentWebsiteView.tsx` did not broadcast `GRIDRETAIL_PREVIEW_READY`, leaving the parent customizer stuck on "Connecting...".
2. **Ignored Live Updates:** Lacked a `GRIDRETAIL_PREVIEW_UPDATE` listener, ignoring theme, styling, or text updates.
3. **Hardcoded Layouts:** Ignored `headerLayout`, `heroLayout`, and `cardLayout` tokens, rendering rigid fallback components.
4. **False-Positive Dirty State:** Initial customizer load triggered unsaved changes warnings because comparison logic evaluated appointment websites against e-commerce copy defaults.

### 4.2 Implemented Architectural Repairs
- **Bidirectional Handshake:** Integrated full `postMessage` protocol in `AppointmentWebsiteView.tsx` with instant state reactivity and `GRIDRETAIL_PREVIEW_ACK` responses.
- **Dynamic Hero & Sections:** Injected `branding.bannerUrl` as a responsive cover background and integrated `<SectionRenderer />` for modular blocks (FAQ Accordion, Trust Badges, Benefits Grid).
- **Normalized Dirty State:** Adjusted `isDirty` calculation in `/stores/[id]/preview/page.tsx` to use website-type-aware defaults.
- **8 Template-Driven Architectures:**
  - **Headers:** `floating-minimal`, `centered-luxury`, `bold-announcement`, `multi-tier-utility`, `magazine-headline`, `organic-soft`, `technical-hud`, `playful-banner`.
  - **Heroes:** `split-showcase`, `cinematic-framed`, `high-impact-blocks`, `commercial-banner`, `magazine-story`, `organic-flow`, `cyber-specs`, `asymmetric-cards`.
  - **Service & Provider Cards:** `understated`, `tall-editorial`, `block-solid`, `classic-rating`, `captioned-story`, `soft-rounded`, `monospaced-grid`, `sticker-playful`.

---

## 5. Testing, Verification & Quality Gates

Automated tests expanded to **287 automated tests** across 18 test suites:
- `tests/phase11-appointments.test.ts`: Service catalog, provider schedules, booking creation, and cancellation workflows.
- `tests/phase11-concurrency.test.ts`: Slot lock mutex, discrete time quanta collisions, and lease rollback.
- `tests/appointment-customizer-compatibility.test.ts`: Verifies live preview handshake, style token updates, and layout switching.

### Verification Results:
- **Lint Check:** `npm run lint` — 0 errors, 0 warnings.
- **TypeScript Check:** `npm run type-check` — 0 errors.
- **Automated Tests:** `npm test` — **287 / 287 passed (0 failed)**.
- **Production Build:** `npm run build` — Clean compilation across 25 routes.
