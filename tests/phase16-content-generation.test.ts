import test from "node:test";
import assert from "node:assert/strict";
import { ContentGenerator } from "../src/lib/generation/content-generator";
import { BusinessProfile } from "../src/types/business-profile";
import { ALL_SECTION_DEFINITIONS } from "../src/constants/sections";

test("Phase 16 — Context-Aware Content Generation & Safety Suite", async (t) => {
  const generator = new ContentGenerator();

  await t.test("1. Generates context-appropriate headlines and subheadlines", () => {
    const lawProfile: BusinessProfile = {
      businessName: "Sterling & Vance LLP",
      industry: "Legal Practice & Advisory",
      businessCategory: "Commercial Litigation",
      description: "Representing enterprises in high-stakes disputes.",
      websiteType: "lead_gen",
    };

    const lawHeadline = generator.generateHeroHeadline(lawProfile);
    const lawSubheadline = generator.generateHeroSubheadline(lawProfile);
    assert.match(lawHeadline, /Legal Counsel|Advocacy|Litigation/i);
    assert.match(lawSubheadline, /legal/i);

    const fitnessProfile: BusinessProfile = {
      businessName: "Apex Athletic Conditioning",
      industry: "Health & Wellness",
      businessCategory: "Strength & Conditioning Studio",
      description: "Structured conditioning programs.",
      websiteType: "appointments",
    };

    const fitHeadline = generator.generateHeroHeadline(fitnessProfile);
    const fitSubheadline = generator.generateHeroSubheadline(fitnessProfile);
    assert.match(fitHeadline, /Fitness|Conditioning/i);
    assert.match(fitSubheadline, /training|conditioning/i);
  });

  await t.test("2. Generates context-appropriate primary CTAs by website type", () => {
    assert.equal(
      generator.generateCtaText({ businessName: "Law Firm", industry: "Legal Practice & Advisory", businessCategory: "Law", websiteType: "lead_gen" }),
      "Request Consultation"
    );
    assert.equal(
      generator.generateCtaText({ businessName: "Gym", industry: "Health & Wellness", businessCategory: "Fitness", websiteType: "appointments" }),
      "Book a Session"
    );
    assert.equal(
      generator.generateCtaText({ businessName: "SaaS", industry: "Electronics & Gadgets", businessCategory: "Software SaaS", websiteType: "lead_gen" }),
      "Request a Demo"
    );
    assert.equal(
      generator.generateCtaText({ businessName: "Boutique", industry: "Fashion & Apparel", businessCategory: "Apparel", websiteType: "ecommerce" }),
      "Explore Collection"
    );
  });

  await t.test("3. Safety Rule: Never fabricates customer testimonials or reviews", () => {
    // When no testimonials are provided, the generator never hallucinates fake customer quotes
    const profileWithoutReviews: BusinessProfile = {
      businessName: "New Practice LLC",
      industry: "Legal Practice & Advisory",
      businessCategory: "General Practice",
      description: "New legal advisory firm.",
      websiteType: "lead_gen",
    };

    const section = generator.generateSectionContent(profileWithoutReviews, "brand_story", 1);
    const textContent = JSON.stringify(section.settings);

    // Verify no fake quotes or fake client names like "John D.", "Sarah M." exist
    assert.equal(textContent.includes("5 stars"), false);
    assert.equal(textContent.includes("John D."), false);
    assert.equal(textContent.includes("Sarah M."), false);
  });

  await t.test("4. Safety Rule: Never fabricates unverified statistics or performance claims", () => {
    const profile: BusinessProfile = {
      businessName: "Alpha Consulting",
      industry: "Consulting & Strategy",
      businessCategory: "Management Advisory",
      description: "Corporate consulting practice.",
      websiteType: "lead_gen",
    };

    const section = generator.generateSectionContent(profile, "trust_badges", 1);
    const badges = (section.settings.badges as Array<{ title: string; description: string }>);

    // Badges must be process commitments, NOT fabricated metrics like "99.9% success rate" or "10,000+ happy clients"
    for (const b of badges) {
      assert.equal(/99%|100%|50,000|\$10M|#1 in/i.test(b.title), false);
      assert.equal(/99%|100%|50,000|\$10M|#1 in/i.test(b.description), false);
    }
  });

  await t.test("5. Safety Rule: Uses neutral placeholders for missing contact details", () => {
    const profileMissingContact: BusinessProfile = {
      businessName: "Apex Living",
      industry: "Home & Living",
      businessCategory: "Furniture Design",
      description: "Contemporary handcrafted furnishings.",
      websiteType: "ecommerce",
    };

    const contactSec = generator.generateSectionContent(profileMissingContact, "contact_info", 1);
    assert.equal(contactSec.settings.phone, "[Direct Office Phone]");
    assert.equal(contactSec.settings.email, "[Contact Email Address]");
    assert.equal(contactSec.settings.address, "[Office / Studio Address]");
    assert.equal(contactSec.settings.hours, "[Operating Hours: e.g. Mon - Fri 9:00 AM - 6:00 PM]");
  });

  await t.test("6. Uses merchant-supplied contact details when provided", () => {
    const profileWithContact: BusinessProfile = {
      businessName: "Sterling & Vance LLP",
      industry: "Legal Practice & Advisory",
      businessCategory: "Commercial Litigation",
      description: "Strategic commercial litigation.",
      websiteType: "lead_gen",
      contactInfo: {
        phone: "+91 22 6600 4400",
        email: "intake@sterlingvance.com",
        address: "Express Towers, 14th Floor, Nariman Point",
        city: "Mumbai",
        businessHours: "Mon - Fri 9:00 AM - 7:00 PM IST",
      },
    };

    const contactSec = generator.generateSectionContent(profileWithContact, "contact_info", 1);
    assert.equal(contactSec.settings.phone, "+91 22 6600 4400");
    assert.equal(contactSec.settings.email, "intake@sterlingvance.com");
    assert.equal(contactSec.settings.address, "Express Towers, 14th Floor, Nariman Point");
    assert.equal(contactSec.settings.hours, "Mon - Fri 9:00 AM - 7:00 PM IST");
  });

  await t.test("7. Safety Rule: Rejects unverified business claims across all 5 industry scenarios", () => {
    const unverifiedPatterns = [
      /certified coaches/i,
      /gots-certified/i,
      /fair-trade production/i,
      /carbon-neutral delivery/i,
      /sub-millisecond latency/i,
      /soc2 compliance/i,
      /99\.999% uptime/i,
      /guaranteed results/i,
      /locally sourced/i,
      /evidence-based/i,
      /tracked dispatch/i,
      /durable fabrics/i,
      /high-reliability software/i,
      /consistent performance/i,
      /secure access control/i,
      /guarantees dependable/i,
      /curated ingredients/i,
      /seasonally driven/i,
      /progressive conditioning/i,
      /rigorous standards/i,
      /protected data/i,
      /secure packaging/i,
      /prompt dispatch/i,
      /scalable design/i,
    ];

    const scenarios: BusinessProfile[] = [
      { businessName: "Trattoria Roma", industry: "Food & Gourmet", businessCategory: "Italian Dining", websiteType: "lead_gen" },
      { businessName: "Apex Fitness", industry: "Health & Wellness", businessCategory: "Fitness Studio", websiteType: "appointments" },
      { businessName: "Vance Legal", industry: "Legal Practice & Advisory", businessCategory: "Law Practice", websiteType: "lead_gen" },
      { businessName: "Loom & Thread", industry: "Fashion & Apparel", businessCategory: "Clothing Boutique", websiteType: "ecommerce" },
      { businessName: "CloudScale SaaS", industry: "Electronics & Gadgets", businessCategory: "Software Company", websiteType: "lead_gen" },
    ];

    for (const scenario of scenarios) {
      const subheadline = generator.generateHeroSubheadline(scenario);
      const benefits = generator.generateBenefits(scenario);
      const steps = generator.generateProcessSteps(scenario);
      const values = generator.generateValues(scenario);

      const allGeneratedText = JSON.stringify({
        subheadline,
        benefits,
        steps,
        values,
      });

      for (const pattern of unverifiedPatterns) {
        assert.equal(
          pattern.test(allGeneratedText),
          false,
          `Scenario "${scenario.businessCategory}" must not contain unverified claim matching ${pattern}. Found in: ${allGeneratedText}`
        );
      }
    }
  });

  await t.test("8. Safety Rule: Restaurant on Lead Gen uses 'Request a Reservation', not confirmed 'Reserve a Table'", () => {
    const restaurantProfile: BusinessProfile = {
      businessName: "Osteria Valenza",
      industry: "Food & Gourmet",
      businessCategory: "Italian Fine Dining",
      websiteType: "lead_gen",
    };

    const cta = generator.generateCtaText(restaurantProfile);
    assert.equal(cta, "Request a Reservation");
    assert.notEqual(cta, "Reserve a Table", "Must not claim a confirmed reservation on an inquiry form");
  });

  await t.test("9. Preserves genuine merchant-provided specifications and key features", () => {
    const profileWithFeatures: BusinessProfile = {
      businessName: "EcoCraft Studio",
      industry: "Fashion & Apparel",
      businessCategory: "Organic Knitwear",
      websiteType: "ecommerce",
      keyFeatures: [
        "100% Organic Linen",
        "Hand-Dyed Indigo",
        "Small-Batch European Mills",
      ],
      differentiators: [
        "Sourced from audited cooperative farms",
        "Natural plant-based dyeing methods",
        "Limited runs of 200 pieces per colorway",
      ],
    };

    const benefits = generator.generateBenefits(profileWithFeatures);
    assert.equal(benefits.length, 3);
    assert.equal(benefits[0].title, "100% Organic Linen");
    assert.equal(benefits[0].description, "Sourced from audited cooperative farms");
    assert.equal(benefits[1].title, "Hand-Dyed Indigo");
    assert.equal(benefits[2].title, "Small-Batch European Mills");
  });

  await t.test("10. Certifications Safety: Unverified merchant certifications are labeled as merchant-provided declarations", () => {
    const unverifiedProfile: BusinessProfile = {
      businessName: "EcoTextiles Co",
      industry: "Fashion & Apparel",
      businessCategory: "Apparel",
      websiteType: "ecommerce",
      certifications: [
        "GOTS Certified Organic",
        { name: "Fair Trade Certified", issuingBody: "Fair Trade USA", isVerified: false },
      ],
    };

    const section = generator.generateSectionContent(unverifiedProfile, "trust_badges", 1);
    const badges = section.settings.badges as Array<{ title: string; description: string }>;

    assert.equal(badges.length, 2);
    assert.equal(badges[0].title, "GOTS Certified Organic");
    assert.match(badges[0].description, /Merchant-provided declaration \(unverified\)/i);
    assert.equal(badges[1].title, "Fair Trade Certified");
    assert.match(badges[1].description, /Merchant-provided declaration \(Declared: Fair Trade USA\)/i);
  });

  await t.test("11. Certifications Safety: Unverified claims cannot self-verify into 'Verified by [issuing body]' without independent evidence", () => {
    const verifiedProfile: BusinessProfile = {
      businessName: "SecureCloud Ops",
      industry: "Electronics & Gadgets",
      businessCategory: "Cloud SaaS",
      websiteType: "lead_gen",
      certifications: [
        { name: "SOC 2 Type II", issuingBody: "AICPA", isVerified: true },
        { name: "ISO 27001", issuingBody: "BSI Group", isVerified: true },
      ],
    };

    const section = generator.generateSectionContent(verifiedProfile, "trust_badges", 1);
    const badges = section.settings.badges as Array<{ title: string; description: string }>;

    assert.equal(badges.length, 2);
    assert.equal(badges[0].title, "SOC 2 Type II");
    assert.equal(badges[0].description, "Merchant-provided declaration (Declared: AICPA).");
    assert.equal(badges[1].title, "ISO 27001");
    assert.equal(badges[1].description, "Merchant-provided declaration (Declared: BSI Group).");
    assert.equal(/verified by/i.test(JSON.stringify(badges)), false);
  });

  await t.test("12. Certifications Safety: No merchant certifications yields generic process commitments, not fabricated credentials", () => {
    const plainProfile: BusinessProfile = {
      businessName: "Simple Bakery",
      industry: "Food & Gourmet",
      businessCategory: "Artisan Bakery",
      websiteType: "lead_gen",
    };

    const section = generator.generateSectionContent(plainProfile, "trust_badges", 1);
    const badges = section.settings.badges as Array<{ title: string; description: string }>;

    assert.equal(badges.length, 3);
    assert.equal(badges[0].title, "Direct Inquiries");
    assert.equal(badges[1].title, "Service Overview");
    assert.equal(badges[2].title, "Consultation Scheduling");

    const badgesText = JSON.stringify(badges);
    assert.equal(/certified|iso|soc|accredited|award-winning|rigorous|protected data|consistent procedures|client privacy/i.test(badgesText), false);
  });

  await t.test("13. Shipping & Delivery Safety: Neutral store policy wording when unsupplied; displays merchant shipping policy when supplied", () => {
    const ecommerceProfile: BusinessProfile = {
      businessName: "Loom & Thread",
      industry: "Fashion & Apparel",
      businessCategory: "Clothing Boutique",
      websiteType: "ecommerce",
    };

    // When merchant has not supplied shipping details: neutral fallback, no implied shipping policy
    const shippingSec = generator.generateSectionContent(ecommerceProfile, "shipping_returns", 1);
    assert.match(shippingSec.settings.deliveryPolicy as string, /Order terms and store policies are provided directly by the merchant/i);
    assert.equal(/shipping methods|dispatch timeframes|fulfillment options|live courier tracking|real-time gps tracking|guaranteed 24-hour|prompt dispatch|secure packaging/i.test(shippingSec.settings.deliveryPolicy as string), false);

    // When merchant has supplied shipping policy: preserve genuine merchant specification
    const profileWithShipping: BusinessProfile = {
      ...ecommerceProfile,
      shippingPolicy: "Standard delivery within 3-5 business days; shipping rates calculated at checkout.",
      returnPolicy: "Items eligible for exchange within 14 days of receipt.",
    };
    const withShippingSec = generator.generateSectionContent(profileWithShipping, "shipping_returns", 1);
    assert.equal(withShippingSec.settings.deliveryPolicy, "Standard delivery within 3-5 business days; shipping rates calculated at checkout.");
    assert.equal(withShippingSec.settings.returnPolicy, "Items eligible for exchange within 14 days of receipt.");
  });

  await t.test("14. Phase 16.1.2 Safety Audit: Comprehensive rejection of operational, technical, clinical, and sourcing claims", () => {
    const strictBlacklist = [
      /curated ingredients/i,
      /seasonally driven/i,
      /progressive conditioning/i,
      /rigorous standards/i,
      /protected data/i,
      /secure packaging/i,
      /prompt dispatch/i,
      /scalable design/i,
    ];

    const testProfiles: BusinessProfile[] = [
      { businessName: "Trattoria Roma", industry: "Food & Gourmet", businessCategory: "Italian Dining", websiteType: "lead_gen" },
      { businessName: "Apex Fitness", industry: "Health & Wellness", businessCategory: "Fitness Studio", websiteType: "appointments" },
      { businessName: "Vance Legal", industry: "Legal Practice & Advisory", businessCategory: "Law Practice", websiteType: "lead_gen" },
      { businessName: "Loom & Thread", industry: "Fashion & Apparel", businessCategory: "Clothing Boutique", websiteType: "ecommerce" },
      { businessName: "CloudScale SaaS", industry: "Electronics & Gadgets", businessCategory: "Software Company", websiteType: "lead_gen" },
    ];

    for (const p of testProfiles) {
      const hero = generator.generateSectionContent(p, "hero_split", 0);
      const benefits = generator.generateSectionContent(p, "benefits_grid", 1);
      const story = generator.generateSectionContent(p, "brand_story", 2);
      const values = generator.generateSectionContent(p, "brand_values", 3);
      const shipping = generator.generateSectionContent(p, "shipping_returns", 4);
      const trust = generator.generateSectionContent(p, "trust_badges", 5);

      const combined = JSON.stringify({ hero, benefits, story, values, shipping, trust });

      for (const phrase of strictBlacklist) {
        assert.equal(
          phrase.test(combined),
          false,
          `Profile "${p.businessCategory}" section content must not contain flagged phrase ${phrase}. Context: ${combined}`
        );
      }
    }
  });

  await t.test("15. Phase 16.1.5 Business Claim Final Review: Comprehensive rejection of merchant operational/SLA commitments", () => {
    const commitmentsBlacklist = [
      /consistent procedures/i,
      /standard fulfillment schedules/i,
      /client privacy/i,
      /direct responses to inquiries/i,
      /service delivery aligned with client needs/i,
      /specified by the merchant upon order confirmation/i,
      /individualized schedules/i,
      /session tracking/i,
      /kitchen preparation/i,
      /direct advisor contact/i,
      /document review/i,
      /finished construction/i,
      /workflow integration/i,
      /account segregation/i,
      /via email/i,
      /treated with professional discretion/i,
      /respond to all consultation inquiries within one business day/i,
      /without penalty/i,
    ];

    const testProfiles: BusinessProfile[] = [
      { businessName: "Trattoria Roma", industry: "Food & Gourmet", businessCategory: "Italian Dining", websiteType: "lead_gen" },
      { businessName: "Apex Fitness", industry: "Health & Wellness", businessCategory: "Fitness Studio", websiteType: "appointments" },
      { businessName: "Vance Legal", industry: "Legal Practice & Advisory", businessCategory: "Law Practice", websiteType: "lead_gen" },
      { businessName: "Loom & Thread", industry: "Fashion & Apparel", businessCategory: "Clothing Boutique", websiteType: "ecommerce" },
      { businessName: "CloudScale SaaS", industry: "Electronics & Gadgets", businessCategory: "Software Company", websiteType: "lead_gen" },
    ];

    for (const p of testProfiles) {
      const hero = generator.generateSectionContent(p, "hero_split", 0);
      const benefits = generator.generateSectionContent(p, "benefits_grid", 1);
      const story = generator.generateSectionContent(p, "brand_story", 2);
      const values = generator.generateSectionContent(p, "brand_values", 3);
      const shipping = generator.generateSectionContent(p, "shipping_returns", 4);
      const trust = generator.generateSectionContent(p, "trust_badges", 5);
      const faq = generator.generateSectionContent(p, "faq_accordion", 6);

      const combined = JSON.stringify({ hero, benefits, story, values, shipping, trust, faq });

      for (const phrase of commitmentsBlacklist) {
        assert.equal(
          phrase.test(combined),
          false,
          `Profile "${p.businessCategory}" section content must not contain operational commitment ${phrase}. Context: ${combined}`
        );
      }
    }
  });

  await t.test("16. Phase 16.1.6 Conditional Business Copy: Rejects unsupplied merchant details as unsupported factual claims", () => {
    const unsuppliedDetailsBlacklist = [
      /published shipping rates/i,
      /carrier options/i,
      /estimated transit times/i,
      /dispatch timeframes/i,
      /fulfillment options/i,
      /standard business hours/i,
      /standard operating hours/i,
      /instructor rosters/i,
      /instructor listings/i,
      /studio availability/i,
      /secure web form/i,
      /verified reviews/i,
      /instant shipping/i,
      /express dispatch/i,
      /verified buyers/i,
      /confirmation email/i,
    ];

    const testProfiles: BusinessProfile[] = [
      { businessName: "Trattoria Roma", industry: "Food & Gourmet", businessCategory: "Italian Dining", websiteType: "lead_gen" },
      { businessName: "Apex Fitness", industry: "Health & Wellness", businessCategory: "Fitness Studio", websiteType: "appointments" },
      { businessName: "Vance Legal", industry: "Legal Practice & Advisory", businessCategory: "Law Practice", websiteType: "lead_gen" },
      { businessName: "Loom & Thread", industry: "Fashion & Apparel", businessCategory: "Clothing Boutique", websiteType: "ecommerce" },
      { businessName: "CloudScale SaaS", industry: "Electronics & Gadgets", businessCategory: "Software Company", websiteType: "lead_gen" },
    ];

    for (const p of testProfiles) {
      const hero = generator.generateSectionContent(p, "hero_split", 0);
      const benefits = generator.generateSectionContent(p, "benefits_grid", 1);
      const story = generator.generateSectionContent(p, "brand_story", 2);
      const values = generator.generateSectionContent(p, "brand_values", 3);
      const shipping = generator.generateSectionContent(p, "shipping_returns", 4);
      const trust = generator.generateSectionContent(p, "trust_badges", 5);
      const faq = generator.generateSectionContent(p, "faq_accordion", 6);
      const howItWorks = generator.generateProcessSteps(p);
      const valuesArr = generator.generateValues(p);
      const benefitsArr = generator.generateBenefits(p);
      const faqsArr = generator.generateFaqs(p);

      const combined = JSON.stringify({
        hero,
        benefits,
        story,
        values,
        shipping,
        trust,
        faq,
        howItWorks,
        valuesArr,
        benefitsArr,
        faqsArr,
      });

      for (const phrase of unsuppliedDetailsBlacklist) {
        assert.equal(
          phrase.test(combined),
          false,
          `Profile "${p.businessCategory}" must not contain unsupplied factual claim ${phrase}. Context: ${combined}`
        );
      }
    }
  });

  await t.test("17. Phase 16.1.8 Unsupported Claims Audit: Universal blacklist across all 30 section definitions and storefront templates", () => {
    const prohibitedPromotionalClaims = [
      /handcrafted in limited runs/i,
      /sustainably sourced certified materials/i,
      /complimentary express delivery/i,
      /new season 2026/i,
      /grade-a aerospace alloy/i,
      /zero carbon footprint/i,
      /lifetime craft warranty/i,
      /fsc-certified timber/i,
      /b-corp certified/i,
      /carbon neutral shipping/i,
      /upload brand banner in visual customizer/i,
      /curated showcase visual/i,
    ];

    assert.equal(ALL_SECTION_DEFINITIONS.length, 30);
    const serializedSections = JSON.stringify(ALL_SECTION_DEFINITIONS);

    for (const pattern of prohibitedPromotionalClaims) {
      assert.equal(
        pattern.test(serializedSections),
        false,
        `Section definitions registry must not contain unsupported promotional claim ${pattern}`
      );
    }
  });

  await t.test("18. Phase 16.1.8 Content Preservation & Fallback Reliability across E-Commerce, Appointments, and Lead Gen", () => {
    // 1. Merchant-provided features & differentiators are preserved verbatim
    const merchantProfiles: BusinessProfile[] = [
      {
        businessName: "Loom Heritage",
        industry: "Fashion & Apparel",
        websiteType: "ecommerce",
        keyFeatures: ["100% Recycled Cotton", "Natural Indigo Vats", "Small-Batch Weaving"],
        differentiators: ["Artisanal batching", "Direct weaver partnership", "Traceable yarn origins"],
      },
      {
        businessName: "Vanguard Legal",
        industry: "Legal Practice & Advisory",
        websiteType: "appointments",
        keyFeatures: ["Mergers & Acquisitions", "Cross-Border Arbitration", "Corporate Governance"],
        differentiators: ["Senior advocate lead", "Confidential case reviews", "Structured engagement terms"],
      },
      {
        businessName: "Catalyst Growth",
        industry: "Electronics & Gadgets",
        websiteType: "lead_gen",
        keyFeatures: ["Enterprise Pipeline Audit", "Architecture Roadmap", "Growth Engineering"],
        differentiators: ["Rapid milestone analysis", "Dedicated executive advisor", "Custom delivery plans"],
      },
    ];

    for (const p of merchantProfiles) {
      const benefits = generator.generateBenefits(p);
      assert.equal(benefits.length, 3);
      assert.equal(benefits[0].title, p.keyFeatures![0]);
      assert.equal(benefits[0].description, p.differentiators![0]);
      assert.equal(benefits[1].title, p.keyFeatures![1]);
      assert.equal(benefits[1].description, p.differentiators![1]);
      assert.equal(benefits[2].title, p.keyFeatures![2]);
      assert.equal(benefits[2].description, p.differentiators![2]);
    }

    // 2. Fallbacks for profiles without merchant data use neutral, industry-aligned copy
    const bareProfile: BusinessProfile = {
      businessName: "Neutral Store",
      industry: "Home & Living",
      websiteType: "ecommerce",
    };
    const bareBenefits = generator.generateBenefits(bareProfile);
    assert.ok(bareBenefits.length > 0);
    const bareCombined = JSON.stringify(bareBenefits);
    assert.equal(/handcrafted in limited runs/i.test(bareCombined), false);
    assert.equal(/complimentary express delivery/i.test(bareCombined), false);
    assert.equal(/sustainably sourced/i.test(bareCombined), false);
  });

  await t.test("19. Cross-Industry Copy Separation across E-Commerce, Appointments, and Lead Gen", () => {
    // 1. Appointment Scheduling — Summit Legal Practice Scenario
    const appointmentProfile: BusinessProfile = {
      businessName: "Summit Legal Practice",
      industry: "Legal Practice & Advisory",
      businessCategory: "Corporate Litigation & Advisory",
      description: "Corporate litigation, intellectual property, and executive advisory.",
      websiteType: "appointments",
    };

    const appointmentHero = generator.generateSectionContent(appointmentProfile, "hero_split", 0);
    const appointmentSettings = appointmentHero.settings as Record<string, unknown>;

    // Eyebrow / badge must be consultation-oriented, NEVER "Featured Collection"
    assert.notEqual(appointmentSettings.badge, "Featured Collection");
    assert.match(String(appointmentSettings.badge), /Legal Consultation|Practice Overview|Consultation/i);

    // Bullet points must NEVER leak e-commerce copy
    const apptBullets = appointmentSettings.bulletPoints as string[];
    assert.ok(Array.isArray(apptBullets) && apptBullets.length === 3);
    for (const b of apptBullets) {
      assert.equal(/curated catalog/i.test(b), false);
      assert.equal(/product specifications/i.test(b), false);
      assert.equal(/direct merchant ordering/i.test(b), false);
    }
    assert.ok(apptBullets.some((b) => /consultation/i.test(b)));

    // CTA must be appointment-oriented
    assert.match(String(appointmentSettings.ctaText), /Book Strategy Session|Book Consultation/i);
    assert.equal(appointmentSettings.ctaUrl, "#booking-section");

    // 2. Lead Generation — Apex Growth Advisory Scenario
    const leadGenProfile: BusinessProfile = {
      businessName: "Apex Growth Advisory",
      industry: "Health & Wellness",
      businessCategory: "Growth Advisory",
      description: "Strategic expansion consulting and pipeline acceleration.",
      websiteType: "lead_gen",
    };

    const leadGenHero = generator.generateSectionContent(leadGenProfile, "hero_split", 0);
    const leadGenSettings = leadGenHero.settings as Record<string, unknown>;

    // Eyebrow / badge must be advisory-oriented, NEVER "Featured Collection"
    assert.notEqual(leadGenSettings.badge, "Featured Collection");
    assert.match(String(leadGenSettings.badge), /Growth Advisory|Advisory Services|Business Strategy/i);

    // Bullet points must NEVER leak e-commerce copy
    const leadBullets = leadGenSettings.bulletPoints as string[];
    assert.ok(Array.isArray(leadBullets) && leadBullets.length === 3);
    for (const b of leadBullets) {
      assert.equal(/curated catalog/i.test(b), false);
      assert.equal(/product specifications/i.test(b), false);
      assert.equal(/direct merchant ordering/i.test(b), false);
    }
    assert.ok(leadBullets.some((b) => /business goals|advisory services|assessment/i.test(b)));

    // CTA must be inquiry-oriented
    assert.match(String(leadGenSettings.ctaText), /Request Growth Assessment|Request Consultation/i);
    assert.equal(leadGenSettings.ctaUrl, "#inquiry-form");

    // 3. E-Commerce — Retains standard catalog copy
    const ecommerceProfile: BusinessProfile = {
      businessName: "Aura Home Goods",
      industry: "Home & Living",
      businessCategory: "Home Essentials",
      websiteType: "ecommerce",
    };

    const ecommerceHero = generator.generateSectionContent(ecommerceProfile, "hero_split", 0);
    const ecommerceSettings = ecommerceHero.settings as Record<string, unknown>;
    assert.equal(ecommerceSettings.badge, "Featured Collection");
    const ecomBullets = ecommerceSettings.bulletPoints as string[];
    assert.ok(ecomBullets.includes("Curated catalog selections"));
    assert.ok(ecomBullets.includes("Detailed product specifications"));
    assert.ok(ecomBullets.includes("Direct merchant ordering"));

    // 4. Custom merchant overrides are preserved verbatim across all types
    const customAppointmentProfile: BusinessProfile = {
      businessName: "Custom Chambers",
      industry: "Legal Practice & Advisory",
      websiteType: "appointments",
      badge: "Senior Counsel & Chambers",
      keyFeatures: ["Appellate Advocacy", "International Arbitration", "Private Mediation"],
    };
    const customHero = generator.generateSectionContent(customAppointmentProfile, "hero_split", 0);
    assert.equal((customHero.settings as Record<string, unknown>).badge, "Senior Counsel & Chambers");
    assert.deepEqual((customHero.settings as Record<string, unknown>).bulletPoints, [
      "Appellate Advocacy",
      "International Arbitration",
      "Private Mediation",
    ]);
  });
});
