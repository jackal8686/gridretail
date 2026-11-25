import test from "node:test";
import assert from "node:assert/strict";
import { validateBusinessProfile } from "../src/lib/validation/business-profile";
import { BusinessProfile } from "../src/types/business-profile";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { Store } from "../src/types/store";

test("Phase 16 — Business Profile Data Model & Validation Suite", async (t) => {
  await t.test("1. Validates required fields: businessName, industry, websiteType", () => {
    const valid = validateBusinessProfile({
      businessName: "Sterling & Vance LLP",
      industry: "Legal Practice & Advisory",
      businessCategory: "Commercial Litigation",
      websiteType: "lead_gen",
    });

    assert.equal(valid.valid, true);
    assert.ok(valid.sanitized);
    assert.equal(valid.sanitized?.businessName, "Sterling & Vance LLP");
    assert.equal(valid.sanitized?.websiteType, "lead_gen");
    assert.equal(valid.sanitized?.businessCategory, "Commercial Litigation");
  });

  await t.test("2. Rejects invalid businessName or missing industry", () => {
    const invalidName = validateBusinessProfile({
      businessName: "A", // too short
      industry: "Legal Practice & Advisory",
      websiteType: "lead_gen",
    });
    assert.equal(invalidName.valid, false);
    assert.ok(invalidName.errors.businessName);

    const missingInd = validateBusinessProfile({
      businessName: "Valid Business Name",
      industry: "",
      websiteType: "lead_gen",
    });
    assert.equal(missingInd.valid, false);
    assert.ok(missingInd.errors.industry);
  });

  await t.test("3. Enforces valid websiteType constraint (ecommerce | appointments | lead_gen)", () => {
    const invalidType = validateBusinessProfile({
      businessName: "Invalid Co",
      industry: "Retail",
      websiteType: "unsupported_4th_type",
    });
    assert.equal(invalidType.valid, false);
    assert.ok(invalidType.errors.websiteType);
  });

  await t.test("4. Sanitizes hex colors, arrays, and optional profile fields", () => {
    const profile = validateBusinessProfile({
      businessName: "Osteria Valenza",
      industry: "Food & Gourmet",
      businessCategory: "Italian Fine Dining",
      websiteType: "lead_gen",
      primaryColor: "#176B4D",
      secondaryColor: "#INVALID_HEX",
      customerNeeds: ["Authentic scratch pasta", "Private event dining", "  "],
      differentiators: ["Farm-to-table daily sourcing", ""],
      contactInfo: {
        phone: "+91 22 5550 1928",
        email: "reservations@valenza.it",
        city: "Mumbai",
      },
      faqs: [
        { question: "Do you accommodate dietary restrictions?", answer: "Yes, please inform us when reserving." },
        { question: "", answer: "Empty question ignored." },
      ],
    });

    assert.equal(profile.valid, true);
    const sanitized = profile.sanitized!;
    assert.equal(sanitized.primaryColor, "#176B4D");
    assert.equal(sanitized.secondaryColor, undefined, "Invalid hex color should be ignored");
    assert.deepEqual(sanitized.customerNeeds, ["Authentic scratch pasta", "Private event dining"]);
    assert.deepEqual(sanitized.differentiators, ["Farm-to-table daily sourcing"]);
    assert.equal(sanitized.contactInfo?.city, "Mumbai");
    assert.equal(sanitized.faqs?.length, 1);
  });

  await t.test("5. Store persistence stores businessProfile on Store entity", async () => {
    const storeId = `str_test_profile_${Date.now()}`;
    const testProfile: BusinessProfile = {
      businessName: "Apex Athletic Conditioning",
      industry: "Health & Wellness",
      businessCategory: "High-Performance Strength Studio",
      description: "Dedicated athletic training and personal conditioning.",
      websiteType: "appointments",
      primaryAudience: "Athletes and busy professionals",
      primaryColor: "#06B6D4",
    };

    const newStore: Store = {
      id: storeId,
      name: "Apex Athletic Conditioning",
      slug: `apex-athletic-${Date.now()}`,
      clientName: "Apex Fitness Group",
      clientId: "cli_test_01",
      industry: "Health & Wellness",
      templateId: "tmpl_bold_vibrant",
      templateName: "Bold & Vibrant",
      themeId: "theme_obsidian_slate",
      themeName: "Obsidian Slate",
      status: "Draft",
      productCount: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Dedicated athletic training and personal conditioning.",
      websiteType: "appointments",
      businessProfile: testProfile,
      version: 1,
    };

    const created = await StoreRepository.create(newStore);
    assert.ok(created);
    assert.equal(created.id, storeId);
    assert.equal(created.businessProfile?.businessName, "Apex Athletic Conditioning");
    assert.equal(created.businessProfile?.businessCategory, "High-Performance Strength Studio");
    assert.equal(created.version, 1);

    // Verify retrieval
    const retrieved = await StoreRepository.findById(storeId);
    assert.ok(retrieved);
    assert.equal(retrieved?.businessProfile?.businessName, "Apex Athletic Conditioning");
    assert.equal(retrieved?.businessProfile?.primaryAudience, "Athletes and busy professionals");

    // Clean up
    await StoreRepository.delete(storeId);
  });

  await t.test("6. Credential Provenance: Rejects merchant attempts to self-verify credentials and forces isVerified: false", () => {
    const rawProfile = {
      businessName: "BioCert Labs",
      industry: "Electronics & Gadgets",
      businessCategory: "Security Testing",
      websiteType: "lead_gen",
      certifications: [
        {
          name: "ISO 27001",
          issuingBody: "Self-Reported Body",
          isVerified: true, // Malicious or unvetted attempt to claim verification
          year: 2026,
        },
        "Unverified String Cert",
      ],
    };

    const validated = validateBusinessProfile(rawProfile);
    assert.equal(validated.valid, true);
    assert.ok(validated.sanitized?.certifications);
    const certs = validated.sanitized!.certifications!;
    assert.equal(certs.length, 2);

    const firstCert = certs[0] as import("../src/types/business-profile").BusinessCertification;
    assert.equal(firstCert.name, "ISO 27001");
    assert.equal(firstCert.isVerified, false, "Ordinary merchant cannot set isVerified = true");
    assert.equal(firstCert.source, "merchant-supplied");
    assert.equal(certs[1], "Unverified String Cert");
  });
});
