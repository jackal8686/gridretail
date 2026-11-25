# GridRetail Phase 16.1 — Restaurant Reservation Accuracy Report

**Project:** GridRetail  
**Phase:** 16.1 — Final Accuracy, Consistency & Acceptance Closure  
**Topic:** Restaurant Inquiry Workflow, Call-to-Action Accuracy & Invariant Preservation  
**Audit Status:** PASSED (Accurate Workflow Terminology Verified)  

---

## 1. Executive Summary

During the Phase 16 review, a workflow terminology issue was identified regarding the Restaurant industry scenario:
> *"If the website uses Lead Generation and a reservation enquiry form, do not claim that a confirmed reservation is being created. Use an accurate CTA such as 'Request a Reservation' or 'Enquire About a Table'. Only use 'Reserve a Table' when a genuine reservation workflow exists and its behavior is clear. Do not introduce a fourth website type."*

GridRetail supports three foundational website models:
1. `ecommerce`
2. `appointments`
3. `lead_gen`

When a restaurant or dining establishment generates a website under the `lead_gen` model, the storefront deploys an inquiry form (`#inquiry-form`) where prospective diners submit party size, desired dining date, and dietary preferences. Because submission of this form registers a lead in the restaurant's CRM queue rather than executing an automated real-time table booking with immediate seat allocation, promising an immediate confirmed booking via `"Reserve a Table"` was inaccurate.

---

## 2. Remediated Call-to-Action Mapping

The primary CTA logic in `src/lib/generation/recommender.ts` and `src/lib/generation/content-generator.ts` was audited and updated:

```typescript
// src/lib/generation/recommender.ts
} else if (type === "lead_gen") {
  ctaText = normCategory.includes("software") || normCategory.includes("saas")
    ? "Request a Demo"
    : normCategory.includes("restaurant") || normCategory.includes("dining") || normCategory.includes("culinary") || normIndustry.includes("food")
    ? "Request a Reservation"
    : "Request Consultation";
  ctaUrl = "#inquiry-form";
}
```

### Contrast Analysis:
- **Previous CTA:** `"Reserve a Table"` -> Misleadingly implied an automated real-time booking confirmation.
- **Remediated CTA:** `"Request a Reservation"` -> Accurately describes the user intent: submitting an inquiry for host confirmation and follow-up.
- **Alternative Permitted CTA:** `"Enquire About a Table"` (also available in customizer).

---

## 3. Preservation of Three Website Types (Strict Constraint)

The audit confirms that no fourth website type (e.g. `"restaurant"` or `"hospitality"`) was created:
- The TypeScript union `WebsiteType` in `src/types/store.ts` remains strictly:
  ```typescript
  export type WebsiteType = "ecommerce" | "appointments" | "lead_gen";
  ```
- Dining businesses requiring asynchronous booking requests use `lead_gen` with the tailored inquiry form.
- Dining businesses desiring calendar-based table slots can utilize `appointments` where table slots are modeled as bookable services.
- This preserves GridRetail's architectural simplicity while providing flexible industry specialization.

---

## 4. Automated Test Verification

The test `tests/phase16-content-generation.test.ts` (test case 8) explicitly asserts:
```typescript
const restaurantProfile: BusinessProfile = {
  businessName: "Osteria Valenza",
  industry: "Food & Gourmet",
  businessCategory: "Italian Fine Dining",
  websiteType: "lead_gen",
};

const cta = generator.generateCtaText(restaurantProfile);
assert.equal(cta, "Request a Reservation");
assert.notEqual(cta, "Reserve a Table", "Must not claim a confirmed reservation on an inquiry form");
```
And `tests/phase16-recommendation-engine.test.ts` (test case 1) confirms:
```typescript
assert.equal(design.ctaText, "Request a Reservation");
assert.equal(design.ctaUrl, "#inquiry-form");
```

**Audit Verdict:** **PASSED**
