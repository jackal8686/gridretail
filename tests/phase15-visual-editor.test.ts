import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SECTION_DEFINITIONS, getSectionDefinition } from "../src/constants/sections";
import { DESIGN_TEMPLATES } from "../src/constants/design-templates";
import { COLOR_THEMES } from "../src/constants/themes";
import { SectionInstance } from "../src/types/section";
import { StoreStylingTokens } from "../src/types/store";
import { validatePreviewMessage } from "../src/lib/security/preview-origin";
import { EditorSnapshot, EditorPageItem } from "../src/components/editor/types";
import { generateSectionId, deepCloneSectionSettings } from "../src/lib/sections/id-generator";

test("Phase 15 — Advanced Visual Editor Test Suite", async (t) => {
  await t.test("1. Workspace Page Generation per Website Type", () => {
    const getPagesForType = (websiteType: "ecommerce" | "appointments" | "lead_gen"): EditorPageItem[] => [
      { id: "home", label: "Home Page", path: "/", category: "main", description: "Storefront primary landing page", isAvailable: true },
      ...(websiteType === "ecommerce"
        ? [
            { id: "catalog", label: "Product Catalog", path: "#products", category: "catalog" as const, description: "Product inventory showcase", isAvailable: true },
            { id: "cart", label: "Cart & Checkout", path: "#cart", category: "catalog" as const, description: "Customer cart and checkout flow", isAvailable: true },
          ]
        : websiteType === "appointments"
        ? [
            { id: "services", label: "Services Menu", path: "#services", category: "service" as const, description: "Practitioner and service offerings", isAvailable: true },
            { id: "booking", label: "Appointment Scheduler", path: "#booking", category: "service" as const, description: "Interactive booking calendar", isAvailable: true },
          ]
        : [
            { id: "inquiry", label: "Consultation Form", path: "#inquiry", category: "main" as const, description: "High-intent client qualification form", isAvailable: true },
            { id: "case_studies", label: "Case Studies & Proof", path: "#proof", category: "info" as const, description: "Client success metrics and reviews", isAvailable: true },
          ]),
      { id: "contact", label: "Contact & Location", path: "#contact", category: "info", description: "Operating hours and business contacts", isAvailable: true },
    ];

    const ecommercePages = getPagesForType("ecommerce");
    assert.ok(ecommercePages.some((p) => p.id === "catalog"), "E-commerce must include catalog page");
    assert.ok(ecommercePages.some((p) => p.id === "cart"), "E-commerce must include cart page");

    const appointmentPages = getPagesForType("appointments");
    assert.ok(appointmentPages.some((p) => p.id === "services"), "Appointments must include services page");
    assert.ok(appointmentPages.some((p) => p.id === "booking"), "Appointments must include booking page");
    assert.ok(!appointmentPages.some((p) => p.id === "catalog"), "Appointments must not include catalog page");

    const leadGenPages = getPagesForType("lead_gen");
    assert.ok(leadGenPages.some((p) => p.id === "inquiry"), "Lead Gen must include inquiry page");
    assert.ok(leadGenPages.some((p) => p.id === "case_studies"), "Lead Gen must include case studies page");
    assert.ok(!leadGenPages.some((p) => p.id === "cart"), "Lead Gen must not include cart page");
  });

  await t.test("2. Section Library Categorization & Compatibility Filtering", () => {
    const definitions = ALL_SECTION_DEFINITIONS;
    assert.ok(definitions.length >= 20, "Section library must define at least 20 section types");

    const heroDefs = definitions.filter((d) => d.category === "hero");
    assert.ok(heroDefs.length >= 5, "Hero category must contain at least 5 variants");

    const productDefs = definitions.filter((d) => d.category === "products");
    assert.ok(productDefs.length >= 3, "Product category must contain e-commerce showcase sections");

    const editorialDefs = definitions.filter((d) => d.category === "editorial");
    assert.ok(editorialDefs.length >= 3, "Editorial category must contain brand story sections");

    const infoDefs = definitions.filter((d) => d.category === "info");
    assert.ok(infoDefs.length >= 5, "Info category must contain FAQs, statistics, trust badges, and benefits");

    // Every definition must have default settings and at least one layout variant
    for (const def of definitions) {
      assert.ok(def.type, "Definition must specify a type");
      assert.ok(def.name, `Definition ${def.type} must specify a display name`);
      assert.ok(def.defaultSettings, `Definition ${def.type} must provide defaultSettings`);
      assert.ok(Array.isArray(def.availableLayouts), `Definition ${def.type} must provide availableLayouts array`);
      assert.ok(def.availableLayouts.length >= 1, `Definition ${def.type} must have at least 1 layout variant`);
    }
  });

  await t.test("3. Section Management: Add, Reorder, Duplicate, Delete & Visibility", () => {
    let sections: SectionInstance[] = [
      {
        id: "sec_hero_1",
        type: "hero_split",
        order: 0,
        visible: true,
        settings: { headline: "Original Headline" },
      },
      {
        id: "sec_benefits_2",
        type: "benefits_grid",
        order: 1,
        visible: true,
        settings: { title: "Key Benefits" },
      },
      {
        id: "sec_footer_3",
        type: "footer_custom",
        order: 2,
        visible: true,
        settings: {},
      },
    ];

    // 3a. Add Section
    const def = getSectionDefinition("faq_accordion");
    assert.ok(def, "faq_accordion definition must exist");
    const newId = generateSectionId("faq_accordion");
    const addedSection: SectionInstance = {
      id: newId,
      type: "faq_accordion",
      order: sections.length,
      visible: true,
      settings: deepCloneSectionSettings(def.defaultSettings),
    };
    sections = [...sections, addedSection];
    assert.equal(sections.length, 4, "Sections count should be 4 after addition");
    assert.equal(sections[3].type, "faq_accordion");

    // 3b. Duplicate Section
    const targetIdx = 1; // benefits_grid
    const source = sections[targetIdx];
    const duplicateId = generateSectionId(source.type);
    const duplicateInstance: SectionInstance = {
      ...source,
      id: duplicateId,
      order: targetIdx + 1,
      settings: deepCloneSectionSettings(source.settings),
    };
    sections.splice(targetIdx + 1, 0, duplicateInstance);
    sections = sections.map((s, idx) => ({ ...s, order: idx }));
    assert.equal(sections.length, 5, "Sections count should be 5 after duplication");
    assert.equal(sections[2].id, duplicateId, "Duplicate section should be inserted immediately after source");
    assert.notEqual(sections[2].id, sections[1].id, "Duplicate must have unique stable ID");

    // 3c. Reorder Sections (Move duplicate down)
    const [moved] = sections.splice(2, 1);
    sections.splice(3, 0, moved);
    sections = sections.map((s, idx) => ({ ...s, order: idx }));
    assert.equal(sections[3].id, duplicateId, "Moved section should now occupy index 3");

    // 3d. Toggle Visibility
    sections = sections.map((s) => (s.id === duplicateId ? { ...s, visible: !s.visible } : s));
    assert.equal(sections[3].visible, false, "Visibility toggle must update section visible flag to false");

    // 3e. Delete Section
    sections = sections.filter((s) => s.id !== duplicateId);
    sections = sections.map((s, idx) => ({ ...s, order: idx }));
    assert.equal(sections.length, 4, "Sections count should be 4 after deletion");
    assert.ok(!sections.some((s) => s.id === duplicateId), "Deleted section must no longer exist in array");
  });

  await t.test("4. Property Inspector Content & Styling Token Mutations", () => {
    const mockStyling: StoreStylingTokens = {
      buttonRadius: "rounded",
      cardStyle: "bordered",
      contentWidth: "normal",
      spacingDensity: "normal",
      typographyScale: "balanced",
      formStyle: "bordered",
      shadowScale: "subtle",
    };

    // Mutate styling tokens
    const updatedStyling: StoreStylingTokens = {
      ...mockStyling,
      buttonRadius: "pill",
      contentWidth: "wide",
      spacingDensity: "spacious",
      typographyScale: "prominent",
      shadowScale: "medium",
    };

    assert.equal(updatedStyling.buttonRadius, "pill");
    assert.equal(updatedStyling.contentWidth, "wide");
    assert.equal(updatedStyling.spacingDensity, "spacious");
    assert.equal(updatedStyling.typographyScale, "prominent");
    assert.equal(updatedStyling.shadowScale, "medium");
    // Ensure untouched keys preserved
    assert.equal(updatedStyling.cardStyle, "bordered");
    assert.equal(updatedStyling.formStyle, "bordered");
  });

  await t.test("5. All 12 Color Themes & 8 Design Templates Availability in Editor", () => {
    assert.equal(COLOR_THEMES.length, 12, "Editor must provide exactly 12 colour themes");
    for (const theme of COLOR_THEMES) {
      assert.ok(theme.id.startsWith("theme_"), `Theme ID ${theme.id} must start with theme_`);
      assert.ok(theme.tokens.primary, `Theme ${theme.name} must specify primary token`);
      assert.ok(theme.tokens.secondary, `Theme ${theme.name} must specify secondary token`);
    }

    assert.equal(DESIGN_TEMPLATES.length, 8, "Editor must provide exactly 8 design templates");
    for (const tmpl of DESIGN_TEMPLATES) {
      assert.ok(tmpl.id.startsWith("tmpl_"), `Template ID ${tmpl.id} must start with tmpl_`);
      assert.ok(tmpl.layoutFamily, `Template ${tmpl.name} must specify layoutFamily`);
      assert.ok(tmpl.headerLayout, `Template ${tmpl.name} must specify headerLayout`);
      assert.ok(tmpl.heroLayout, `Template ${tmpl.name} must specify heroLayout`);
    }
  });

  await t.test("6. Undo / Redo Stack State Machine Simulation", () => {
    const history: EditorSnapshot[] = [];
    let historyIndex = -1;

    const push = (snap: EditorSnapshot) => {
      // Truncate redo
      history.splice(historyIndex + 1);
      history.push(snap);
      if (history.length > 30) history.shift();
      historyIndex = history.length - 1;
    };

    const undo = (): EditorSnapshot | null => {
      if (historyIndex <= 0) return null;
      historyIndex -= 1;
      return history[historyIndex];
    };

    const redo = (): EditorSnapshot | null => {
      if (historyIndex >= history.length - 1) return null;
      historyIndex += 1;
      return history[historyIndex];
    };

    const snap0: EditorSnapshot = {
      templateId: "tmpl_modern_minimal",
      themeId: "theme_nordic_pine",
      storeName: "Initial Store",
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      fontFamily: "Inter, sans-serif",
      heroHeadline: "Initial Headline",
      heroSubheadline: "Initial Subheadline",
      aboutText: "About us",
      ctaText: "Explore",
      enabledSections: ["sec_1"],
      orderedSections: ["sec_1"],
      sections: [],
      styling: {},
    };

    push(snap0);
    assert.equal(historyIndex, 0);
    assert.equal(history.length, 1);
    assert.equal(undo(), null, "Cannot undo with 1 item in stack");

    // Push edit 1
    const snap1 = { ...snap0, heroHeadline: "Second Headline" };
    push(snap1);
    assert.equal(historyIndex, 1);
    assert.equal(history.length, 2);

    // Push edit 2
    const snap2 = { ...snap1, heroHeadline: "Third Headline" };
    push(snap2);
    assert.equal(historyIndex, 2);

    // Undo edit 2 -> restores snap1
    const undone = undo();
    assert.ok(undone);
    assert.equal(undone?.heroHeadline, "Second Headline");
    assert.equal(historyIndex, 1);

    // Redo edit 2 -> restores snap2
    const redone = redo();
    assert.ok(redone);
    assert.equal(redone?.heroHeadline, "Third Headline");
    assert.equal(historyIndex, 2);

    // Test 30-item stack bound
    for (let i = 0; i < 40; i++) {
      push({ ...snap0, heroHeadline: `Headline ${i}` });
    }
    assert.ok(history.length <= 30, "History stack must never exceed 30 snapshots");
  });

  await t.test("7. Preview Security Protocol: Section Selection & Inline Updates", () => {
    // 7a. Section Selection Message
    const selectMsg = {
      type: "GRIDRETAIL_SECTION_SELECT",
      sectionId: "sec_hero_split_test123",
    };
    const validatedSelect = validatePreviewMessage(selectMsg);
    assert.equal(validatedSelect.valid, true, "Valid section select message must pass validation");
    assert.equal(validatedSelect.type, "GRIDRETAIL_SECTION_SELECT");
    assert.equal(validatedSelect.sectionId, "sec_hero_split_test123");

    // 7b. Inline Update Message
    const inlineMsg = {
      type: "GRIDRETAIL_INLINE_UPDATE",
      sectionId: "sec_hero_123",
      field: "headline",
      value: "Live Updated Headline",
    };
    const validatedInline = validatePreviewMessage(inlineMsg);
    assert.equal(validatedInline.valid, true, "Valid inline update message must pass validation");
    assert.equal(validatedInline.type, "GRIDRETAIL_INLINE_UPDATE");
    assert.equal(validatedInline.inlineUpdate?.field, "headline");
    assert.equal(validatedInline.inlineUpdate?.value, "Live Updated Headline");

    // 7c. Rejection of Invalid Message
    const maliciousMsg = {
      type: "GRIDRETAIL_UNKNOWN_HACK",
      payload: { eval: "malicious" },
    };
    const rejected = validatePreviewMessage(maliciousMsg);
    assert.equal(rejected.valid, false, "Unknown message type must be rejected");
  });
});
