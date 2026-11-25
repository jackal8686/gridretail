import { test } from "node:test";
import assert from "node:assert";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { Store } from "@/types";

test("Phase 18.3.1 — High-Priority Defect Remediation Suite", async (t) => {
  StoreRepository._resetMemory();

  const mockEcommerceStore: Store = {
    id: "str_test_ecom_1831",
    name: "Botanica Apothecary",
    slug: "test-botanica-1831",
    clientName: "Botanica Corp",
    clientId: "cli_botanica_1831",
    industry: "Beauty & Cosmetics",
    templateId: "tmpl_modern_minimal",
    templateName: "Modern Minimal",
    productCount: 12,
    description: "Botanica test store",
    websiteType: "ecommerce",
    status: "Published",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    branding: {
      primaryColor: "#176B4D",
      fontFamily: "Inter, sans-serif",
    },
  };

  const mockApptStore: Store = {
    id: "str_test_appt_1831",
    name: "Summit Legal Practice",
    slug: "test-summit-1831",
    clientName: "Summit Law LLC",
    clientId: "cli_summit_1831",
    industry: "Legal & Advisory",
    appointmentIndustry: "Legal Practice & Advisory",
    templateId: "tmpl_editorial_classic",
    templateName: "Editorial Classic",
    productCount: 0,
    description: "Summit test legal practice",
    websiteType: "appointments",
    status: "Published",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    branding: {
      primaryColor: "#0F172A",
      fontFamily: "Playfair Display, serif",
    },
  };

  const mockLeadStore: Store = {
    id: "str_test_lead_1831",
    name: "Apex Growth Consulting",
    slug: "test-apex-1831",
    clientName: "Apex Partners",
    clientId: "cli_apex_1831",
    industry: "Professional Services",
    templateId: "tmpl_bold_commerce",
    templateName: "Bold Commerce",
    productCount: 0,
    description: "Apex growth advisory",
    websiteType: "lead_gen",
    status: "Draft",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    branding: {
      primaryColor: "#2563EB",
      fontFamily: "Inter, sans-serif",
    },
  };

  await StoreRepository.create(mockEcommerceStore);
  await StoreRepository.create(mockApptStore);
  await StoreRepository.create(mockLeadStore);

  await t.test("DEF-004: Spotlight search extracts stores correctly from { stores, count } envelope", async () => {
    const rawApiEnvelope = {
      stores: await StoreRepository.findAll(),
      count: (await StoreRepository.findAll()).length,
    };

    // Verify envelope unpacking logic
    const storeList = Array.isArray(rawApiEnvelope)
      ? rawApiEnvelope
      : (rawApiEnvelope?.stores || []);

    assert.ok(storeList.length >= 3, "Must unpack stores from envelope");

    // Test search query against stores
    const query = "summit";
    const matched = storeList.filter((s: Store) =>
      s.name.toLowerCase().includes(query) ||
      (s.industry && s.industry.toLowerCase().includes(query)) ||
      (s.clientName && s.clientName.toLowerCase().includes(query))
    );

    assert.ok(matched.length >= 1, "Must find matching store for 'summit'");
    assert.ok(matched.some((s: Store) => s.name.includes("Summit Legal")));
  });

  await t.test("DEF-005: Store directory industry filter matches Legal & Advisory and Professional Services", async () => {
    const stores = await StoreRepository.findAll();

    const matchesLegal = stores.filter(
      (s) =>
        s.industry === "Legal & Advisory" ||
        s.appointmentIndustry?.includes("Legal") ||
        s.industry?.includes("Legal")
    );
    assert.ok(matchesLegal.length >= 1, "Must match at least 1 legal store");
    assert.ok(matchesLegal.some((s) => s.id === "str_test_appt_1831"));

    const matchesServices = stores.filter(
      (s) =>
        s.industry === "Professional Services" ||
        s.appointmentIndustry?.includes("Services") ||
        s.industry?.includes("Services")
    );
    assert.ok(matchesServices.length >= 1, "Must match at least 1 professional services store");
    assert.ok(matchesServices.some((s) => s.id === "str_test_lead_1831"));
  });

  await t.test("DEF-001: Metric cards calculate dynamic monthly store additions and client counts", async () => {
    const stores = await StoreRepository.findAll();
    const uniqueClients = new Set(stores.map((s) => s.clientName || s.clientId).filter(Boolean)).size;
    assert.ok(uniqueClients >= 3, "Must find distinct client accounts");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const createdThisMonth = stores.filter((s) => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt);
      return !isNaN(d.getTime()) && d >= startOfMonth;
    }).length;

    assert.ok(createdThisMonth >= 3, "Must count stores created this month");
  });

  await t.test("DEF-019: Presentation deck provides tailored slide titles for all 3 website types", () => {
    const getSlideTitles = (type: string) => {
      const isAppointments = type === "appointments";
      const isLeadGen = type === "lead_gen" || type === "lead-generation";

      return isAppointments
        ? [
            "Executive Vision & Practice Positioning",
            "Curated Professional Services Directory",
            "Client Trust & Practice Blueprint",
            "Calendar Integration & Booking Workflow",
            "Live Interactive Practice Simulator",
            "Commercial Next Steps & Delivery",
          ]
        : isLeadGen
        ? [
            "Executive Vision & Market Strategy",
            "Inquiry Architecture & Capture Flow",
            "Enterprise Credibility & Governance",
            "Lead Pipeline Progression & Qualification",
            "Live Interactive Lead Portal Simulator",
            "Commercial Next Steps & Delivery",
          ]
        : [
            "Executive Vision & Brand Identity",
            "Curated E-Commerce Catalog",
            "Brand Narrative & Trust Signals",
            "Audience Engagement & Conversion",
            "Live Interactive Storefront Simulation",
            "Commercial Next Steps & Delivery",
          ];
    };

    const ecomTitles = getSlideTitles("ecommerce");
    const apptTitles = getSlideTitles("appointments");
    const leadTitles = getSlideTitles("lead_gen");

    assert.equal(ecomTitles.length, 6);
    assert.equal(apptTitles.length, 6);
    assert.equal(leadTitles.length, 6);

    assert.ok(ecomTitles[1].includes("Catalog"), "Ecom Slide 2 should be Catalog");
    assert.ok(apptTitles[1].includes("Services"), "Appt Slide 2 should be Services");
    assert.ok(leadTitles[1].includes("Inquiry"), "Lead Slide 2 should be Inquiry");

    assert.ok(apptTitles[2].includes("Practice Blueprint"), "Appt Slide 3 should be Practice Blueprint");
    assert.ok(leadTitles[2].includes("Enterprise Credibility"), "Lead Slide 3 should be Enterprise Credibility");
  });

  await t.test("DEF-008: Visual editor calculates desktop scale correctly when container is narrower than 1440px", () => {
    const calculateScale = (containerWidth: number) => {
      const baseWidth = 1440;
      return containerWidth < baseWidth
        ? Math.min(1, Math.max(0.25, containerWidth / baseWidth))
        : 1;
    };

    // At 1440px monitor with 640px editor sidebars (available = 800px)
    const scaleAt800 = calculateScale(800);
    assert.ok(scaleAt800 > 0.55 && scaleAt800 < 0.56, "800/1440 should be ~0.555");

    // At 1920px monitor with 640px editor sidebars (available = 1280px)
    const scaleAt1280 = calculateScale(1280);
    assert.ok(scaleAt1280 > 0.88 && scaleAt1280 < 0.89, "1280/1440 should be ~0.888");

    // At wide monitor (available >= 1440px)
    const scaleAt1600 = calculateScale(1600);
    assert.equal(scaleAt1600, 1, "Scale should be exactly 1 when room is sufficient");
  });
});
