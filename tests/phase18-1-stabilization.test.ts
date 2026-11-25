import test from "node:test";
import assert from "node:assert/strict";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { AppointmentRepository } from "../src/lib/repositories/appointment.repository";
import { LeadRepository } from "../src/lib/repositories/lead.repository";
import { ActivityRepository } from "../src/lib/repositories/activity.repository";
import { resolveStoreSections } from "../src/lib/sections/resolver";
import { siteConfig } from "../src/config/site";
import { MOCK_STORES } from "../src/mock/stores";

test("Phase 18.1 — Stabilization & Architecture Verification", async (t) => {
  await t.test("Priority 1 & 2: Dual-Key Store Resolution & Builder Loading", async (t2) => {
    await t2.test("resolves stores by canonical ID (str_01, str_07, str_08)", async () => {
      const ecom = await StoreRepository.findById("str_01");
      const appt = await StoreRepository.findById("str_07");
      const lead = await StoreRepository.findById("str_08");

      assert.ok(ecom, "E-commerce store str_01 should be found");
      assert.equal(ecom?.name, "Aura Minimalist Living");
      assert.equal(ecom?.websiteType, "ecommerce");

      assert.ok(appt, "Appointment store str_07 should be found");
      assert.equal(appt?.name, "Summit Legal Practice");
      assert.equal(appt?.websiteType, "appointments");

      assert.ok(lead, "Lead-gen store str_08 should be found");
      assert.equal(lead?.name, "Apex Growth Advisory");
      assert.equal(lead?.websiteType, "lead_gen");
    });

    await t2.test("resolves stores by slug fallback (summit-legal, apex-growth, aura-minimalist)", async () => {
      const ecomBySlug = await StoreRepository.findById("aura-minimalist");
      const apptBySlug = await StoreRepository.findById("summit-legal");
      const leadBySlug = await StoreRepository.findById("apex-growth");

      assert.ok(ecomBySlug, "Should resolve by aura-minimalist slug");
      assert.equal(ecomBySlug?.id, "str_01");

      assert.ok(apptBySlug, "Should resolve by summit-legal slug");
      assert.equal(apptBySlug?.id, "str_07");

      assert.ok(leadBySlug, "Should resolve by apex-growth slug");
      assert.equal(leadBySlug?.id, "str_08");
    });

    await t2.test("resolves stores by legacy aliases (str_summit -> str_07, str_apex -> str_08)", async () => {
      const summitAlias = await StoreRepository.findById("str_summit");
      const apexAlias = await StoreRepository.findById("str_apex");

      assert.ok(summitAlias, "Should resolve str_summit alias");
      assert.equal(summitAlias?.id, "str_07");
      assert.equal(summitAlias?.name, "Summit Legal Practice");

      assert.ok(apexAlias, "Should resolve str_apex alias");
      assert.equal(apexAlias?.id, "str_08");
      assert.equal(apexAlias?.name, "Apex Growth Advisory");
    });

    await t2.test("supports findBySlug directly", async () => {
      const store = await StoreRepository.findBySlug("summit-legal");
      assert.ok(store, "Should find summit-legal by findBySlug");
      assert.equal(store?.id, "str_07");
    });
  });

  await t.test("Priority 3: Single Source of Truth & Editor Section Synchronization", async (t2) => {
    await t2.test("ensures all mock stores are seeded with non-empty sections", () => {
      assert.ok(MOCK_STORES.length > 0, "MOCK_STORES should not be empty");
      for (const s of MOCK_STORES) {
        assert.ok(Array.isArray(s.sections), `Store ${s.id} should have sections array`);
        assert.ok(s.sections!.length >= 4, `Store ${s.id} should have at least 4 sections`);
      }
    });

    await t2.test("guarantees resolveStoreSections generates identical layer count for unsectioned store", () => {
      const mockRawStore = {
        id: "test_store",
        name: "Test Storefront",
        websiteType: "ecommerce" as const,
        industry: "Home & Living" as const,
      };

      const resolved = resolveStoreSections(mockRawStore);
      assert.equal(resolved.length, 5);
      assert.equal(resolved[0].type, "hero_split");
      assert.equal(resolved[1].type, "featured_products");
      assert.equal(resolved[2].type, "brand_story");
      assert.equal(resolved[3].type, "newsletter_signup");
      assert.equal(resolved[4].type, "footer_custom");
    });
  });

  await t.test("Priority 4 & 6: Clean Cross-Industry Content & Zero Leakage", async (t2) => {
    await t2.test("synthesizes appointment sections with consultation-specific copy", () => {
      const apptStore = {
        id: "test_appt",
        name: "Metro Legal Practice",
        websiteType: "appointments" as const,
        appointmentIndustry: "Legal Practice & Advisory" as const,
        industry: "Legal & Advisory" as const,
      };

      const sections = resolveStoreSections(apptStore);
      const types = sections.map((s) => s.type);
      assert.ok(types.includes("hero_split"));
      assert.ok(types.includes("benefits_grid"));
      assert.ok(types.includes("brand_story"));
      assert.ok(types.includes("faq_accordion"));
      assert.ok(types.includes("footer_custom"));

      // Verify no e-commerce terms in appointment sections
      const serialized = JSON.stringify(sections);
      assert.ok(!serialized.includes("Curated catalog"), "Should not contain Curated catalog");
      assert.ok(!serialized.includes("product specifications"), "Should not contain product specifications");
      assert.ok(!serialized.includes("sustainable tactile materials"), "Should not contain sustainable tactile materials");
      assert.ok(!serialized.includes("Explore Catalog"), "Should not contain Explore Catalog");
    });

    await t2.test("synthesizes lead-gen sections with advisory and inquiry copy", () => {
      const leadStore = {
        id: "test_lead",
        name: "Horizon Strategic Partners",
        websiteType: "lead_gen" as const,
        industry: "Professional Services" as const,
      };

      const sections = resolveStoreSections(leadStore);
      const types = sections.map((s) => s.type);
      assert.ok(types.includes("hero_split"));
      assert.ok(types.includes("benefits_grid"));
      assert.ok(types.includes("how_it_works"));
      assert.ok(types.includes("faq_accordion"));

      const serialized = JSON.stringify(sections);
      assert.ok(!serialized.includes("Curated catalog"));
      assert.ok(!serialized.includes("sustainable tactile materials"));
      assert.ok(serialized.includes("Growth Advisory"));
    });
  });

  await t.test("Workstream 4: Appointment Scheduling End-to-End Persistence", async (t2) => {
    await t2.test("retrieves seeded test appointment for Summit Legal Practice", async () => {
      const appts = await AppointmentRepository.findByStoreId("str_07");
      assert.ok(appts.length >= 1, "Summit Legal Practice should have at least 1 scheduled appointment");
      const first = appts[0];
      assert.equal(first.customerName, "David Sterling");
      assert.equal(first.serviceName, "Corporate Mergers & Acquisitions Advisory");
      assert.equal(first.status, "Confirmed");
    });

    await t2.test("updates operational status of an appointment", async () => {
      const updated = await AppointmentRepository.update("apt_mock_01", { status: "Confirmed" });
      assert.ok(updated, "Status update should succeed");
      assert.equal(updated?.status, "Confirmed");
    });
  });

  await t.test("Workstream 3 & 4: Lead CRM End-to-End Persistence", async (t2) => {
    await t2.test("retrieves seeded test lead for Apex Growth Advisory", async () => {
      const leads = await LeadRepository.findByStore("str_08");
      assert.ok(leads.length >= 1, "Apex Growth Advisory should have at least 1 lead");
      const first = leads[0];
      assert.equal(first.fullName, "Victoria Thorne");
      assert.equal(first.company, "Thorne Dynamics Global");
      assert.equal(first.status, "Contacted");
    });
  });

  await t.test("Workstream 5: Activity Feed & Audit Logging", async (t2) => {
    await t2.test("retrieves activities and logs platform events", async () => {
      const initial = await ActivityRepository.findAll(5);
      assert.ok(initial.length > 0, "Activities should be discoverable");

      const recorded = await ActivityRepository.record({
        type: "store_updated",
        title: "Test Platform Action",
        description: "Verified automated audit logging in Phase 18.1",
        targetId: "str_01",
        targetName: "Aura Minimalist Living",
        user: { name: "Test Runner", avatarInitial: "T" },
      });

      assert.ok(recorded.id.startsWith("act_"), "Generated activity should have valid ID");
      const updated = await ActivityRepository.findAll(5);
      assert.equal(updated[0].title, "Test Platform Action");
    });
  });

  await t.test("Priority 5 & 10: Versioning & Platform Branding", async (t2) => {
    await t2.test("confirms canonical platform version is 1.0.0", () => {
      assert.equal(siteConfig.version, "1.0.0");
    });

    await t2.test("verifies Summit Legal and Apex Growth have appropriate real industries", () => {
      const summit = MOCK_STORES.find((s) => s.id === "str_07");
      const apex = MOCK_STORES.find((s) => s.id === "str_08");

      assert.equal(summit?.industry, "Legal & Advisory");
      assert.equal(apex?.industry, "Professional Services");
    });
  });
});
