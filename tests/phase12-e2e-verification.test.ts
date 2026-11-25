import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { LeadFormRepository } from "../src/lib/repositories/lead-form.repository";
import { LeadSubmissionRepository } from "../src/lib/repositories/lead-submission.repository";
import { LeadRepository } from "../src/lib/repositories/lead.repository";
import { LEAD_STARTER_TEMPLATES } from "../src/constants/lead-templates";

describe("Phase 12 End-to-End: Form Lifecycle, Multi-Step Validation, Draft vs Published Isolation", () => {
  const storeId = "store_e2e_leadgen_001";

  beforeEach(() => {
    LeadFormRepository.clearMemory();
    LeadSubmissionRepository.clearMemory();
    LeadRepository.clearMemory();
  });

  test("1. All 5 starter templates load with valid multi-step structures, default fields, and layout settings", () => {
    for (const tmpl of LEAD_STARTER_TEMPLATES) {
      assert.ok(tmpl.id, `Template ${tmpl.name} has valid ID`);
      assert.ok(tmpl.name, `Template ${tmpl.id} has name`);
      assert.ok(tmpl.steps.length >= 1, `Template ${tmpl.id} has at least 1 step`);
      for (const step of tmpl.steps) {
        assert.ok(step.fields.length >= 1, `Step ${step.id} in ${tmpl.id} has fields`);
        for (const field of step.fields) {
          assert.ok(field.id, "Field has ID");
          assert.ok(field.type, "Field has Type");
          assert.ok(field.label, "Field has Label");
        }
      }
      assert.ok(["embedded", "modal", "page"].includes(tmpl.defaultSettings.presentationMode));
      assert.ok(["single_column", "two_column"].includes(tmpl.defaultSettings.layout));
      assert.strictEqual(tmpl.defaultSettings.enableHoneypot, true);
    }
  });

  test("2. Saving draft form DOES NOT alter public published form snapshot", async () => {
    const tmpl = LEAD_STARTER_TEMPLATES[1]; // Request a Quote

    // Create initial form and publish v1
    const form = await LeadFormRepository.create({
      storeId,
      name: tmpl.name,
      description: tmpl.description,
      isDefault: true,
      steps: tmpl.steps,
      settings: tmpl.defaultSettings,
    });

    const pub1 = await LeadFormRepository.publishVersion(storeId, form.id, "Admin User", "v1 Initial");
    assert.ok(pub1);
    assert.strictEqual(pub1.version.version, 1);

    // Initial published steps count in Step 1
    const initialPublishedFieldCount = pub1.form.publishedSteps![0].fields.length;

    // Mutate draft steps by adding a new field
    const draftSteps = JSON.parse(JSON.stringify(pub1.form.publishedSteps!));
    draftSteps[0].fields.push({
      id: "field_draft_only",
      type: "text",
      label: "Internal Reference Code",
    });

    const updatedForm = await LeadFormRepository.updateDraft(
      storeId,
      form.id,
      draftSteps,
      tmpl.defaultSettings
    );
    assert.ok(updatedForm);

    // Re-fetch form
    const reloaded = await LeadFormRepository.findById(storeId, form.id);
    assert.ok(reloaded);

    // Crucial isolation check: Draft has extra field, but published snapshot remains unmodified
    assert.strictEqual(
      reloaded.currentDraft.steps[0].fields.length,
      initialPublishedFieldCount + 1,
      "Draft reflects updated fields"
    );
    assert.strictEqual(
      reloaded.publishedSteps![0].fields.length,
      initialPublishedFieldCount,
      "Published snapshot is completely isolated and unchanged"
    );
    assert.strictEqual(reloaded.publishedVersion, 1, "Published version counter remains at 1");
  });

  test("3. Publishing new version creates immutable snapshot v2 and updates live storefront snapshot", async () => {
    const tmpl = LEAD_STARTER_TEMPLATES[0]; // Contact Form

    const form = await LeadFormRepository.create({
      storeId,
      name: tmpl.name,
      steps: tmpl.steps,
      settings: tmpl.defaultSettings,
    });

    await LeadFormRepository.publishVersion(storeId, form.id, "Admin", "v1");

    // Add field to draft
    const draftSteps = JSON.parse(JSON.stringify(tmpl.steps));
    draftSteps[0].fields.push({
      id: "field_v2_field",
      type: "phone",
      label: "Secondary Mobile",
    });
    await LeadFormRepository.updateDraft(storeId, form.id, draftSteps, tmpl.defaultSettings);

    // Publish v2
    const pub2 = await LeadFormRepository.publishVersion(storeId, form.id, "Admin", "v2 Release");
    assert.ok(pub2);
    assert.strictEqual(pub2.version.version, 2);

    const reloaded = await LeadFormRepository.findById(storeId, form.id);
    assert.ok(reloaded);
    assert.strictEqual(reloaded.publishedVersion, 2);
    assert.strictEqual(
      reloaded.publishedSteps![0].fields.some((f) => f.id === "field_v2_field"),
      true,
      "Live storefront now consumes published v2 fields"
    );

    // Check version 1 can still be retrieved intact
    const v1Record = await LeadFormRepository.getVersion(storeId, form.id, 1);
    assert.ok(v1Record);
    assert.strictEqual(
      v1Record.steps[0].fields.some((f) => f.id === "field_v2_field"),
      false,
      "Historical v1 version remains strictly immutable"
    );
  });

  test("4. Submission snapshots preserve exact fields and values even if form is subsequently modified or deleted", async () => {
    const tmpl = LEAD_STARTER_TEMPLATES[4]; // Request Callback

    const form = await LeadFormRepository.create({
      storeId,
      name: tmpl.name,
      steps: tmpl.steps,
      settings: tmpl.defaultSettings,
    });

    await LeadFormRepository.publishVersion(storeId, form.id, "Admin", "v1");

    // Visitor submits callback form
    const { lead } = await LeadRepository.upsertLeadFromSubmission(storeId, {
      fullName: "Maya Lin",
      phone: "+91 98765 43210",
      source: form.name,
      submittedAt: "2026-10-24T12:00:00Z",
    });

    const sub = await LeadSubmissionRepository.create({
      storeId,
      leadId: lead.id,
      formId: form.id,
      formVersion: 1,
      formName: form.name,
      data: {
        field_name: "Maya Lin",
        field_phone: "+91 98765 43210",
        field_best_time: "morning",
      },
      submittedFieldsSnapshot: form.currentDraft.steps[0].fields,
      isTest: false,
    });
    assert.ok(sub.id);

    // Form builder now deletes the 'best_time' field from form
    const strippedSteps = JSON.parse(JSON.stringify(tmpl.steps));
    strippedSteps[0].fields = strippedSteps[0].fields.filter(
      (f: { id: string }) => f.id !== "field_best_time"
    );
    await LeadFormRepository.updateDraft(storeId, form.id, strippedSteps, tmpl.defaultSettings);
    await LeadFormRepository.publishVersion(storeId, form.id, "Admin", "v2 Removed Best Time");

    // Retrieve original submission for Lead CRM
    const submissions = await LeadSubmissionRepository.findByLead(storeId, lead.id);
    assert.strictEqual(submissions.length, 1);
    assert.strictEqual(submissions[0].formVersion, 1);
    assert.strictEqual(submissions[0].data.field_best_time, "morning");
    assert.strictEqual(
      submissions[0].submittedFieldsSnapshot.some((f) => f.id === "field_best_time"),
      true,
      "Historical snapshot in submission retains original schema prior to field removal"
    );
  });
});
