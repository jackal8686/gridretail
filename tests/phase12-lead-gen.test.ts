import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { LeadRepository } from "../src/lib/repositories/lead.repository";
import { LeadFormRepository } from "../src/lib/repositories/lead-form.repository";
import { LeadSubmissionRepository } from "../src/lib/repositories/lead-submission.repository";
import { LeadReminderRepository } from "../src/lib/repositories/lead-reminder.repository";
import { LEAD_STARTER_TEMPLATES } from "../src/constants/lead-templates";

describe("Phase 12: Lead Generation Engine, Form Builder & CRM Lifecycle", () => {
  const testStoreId = "store_lead_gen_test_001";
  const otherStoreId = "store_lead_gen_test_002";

  beforeEach(() => {
    LeadRepository.clearMemory();
    LeadFormRepository.clearMemory();
    LeadSubmissionRepository.clearMemory();
    LeadReminderRepository.clearMemory();
  });

  test("1. Lead Starter Templates cover all 5 required use cases with steps and default settings", () => {
    assert.strictEqual(LEAD_STARTER_TEMPLATES.length, 5);
    const templateIds = LEAD_STARTER_TEMPLATES.map((t) => t.id);
    assert.ok(templateIds.includes("contact_form"));
    assert.ok(templateIds.includes("request_quote"));
    assert.ok(templateIds.includes("consultation_request"));
    assert.ok(templateIds.includes("registration_form"));
    assert.ok(templateIds.includes("request_callback"));

    for (const tmpl of LEAD_STARTER_TEMPLATES) {
      assert.ok(tmpl.name.length > 0);
      assert.ok(tmpl.steps.length >= 1);
      assert.ok(tmpl.steps[0].fields.length >= 2);
      assert.ok(tmpl.defaultSettings.submitButtonText.length > 0);
      assert.ok(tmpl.defaultSettings.successMessage.length > 0);
      assert.strictEqual(tmpl.defaultSettings.enableHoneypot, true);
    }
  });

  test("2. LeadFormRepository manages drafts, version publishing, and immutable history snapshots", async () => {
    const contactTemplate = LEAD_STARTER_TEMPLATES[0];

    // Create draft form
    const form = await LeadFormRepository.create({
      storeId: testStoreId,
      name: contactTemplate.name,
      description: contactTemplate.description,
      isDefault: true,
      steps: contactTemplate.steps,
      settings: contactTemplate.defaultSettings,
    });

    assert.ok(form.id.startsWith("form_"));
    assert.strictEqual(form.isDefault, true);
    assert.strictEqual(form.publishedVersion, undefined);

    // Publish Version 1
    const pub1 = await LeadFormRepository.publishVersion(
      testStoreId,
      form.id,
      "Lead Engineer",
      "Initial launch"
    );
    assert.ok(pub1);
    assert.strictEqual(pub1.version.version, 1);
    assert.strictEqual(pub1.form.publishedVersion, 1);

    // Edit Draft Steps
    const modifiedSteps = JSON.parse(JSON.stringify(contactTemplate.steps));
    modifiedSteps[0].fields.push({
      id: "field_custom_budget",
      type: "number",
      label: "Estimated Budget",
    });

    await LeadFormRepository.updateDraft(
      testStoreId,
      form.id,
      modifiedSteps,
      contactTemplate.defaultSettings
    );

    // Publish Version 2
    const pub2 = await LeadFormRepository.publishVersion(
      testStoreId,
      form.id,
      "Lead Engineer",
      "Added budget question"
    );
    assert.ok(pub2);
    assert.strictEqual(pub2.version.version, 2);
    assert.strictEqual(pub2.form.publishedVersion, 2);

    // Verify Version History
    const history = await LeadFormRepository.getVersionHistory(testStoreId, form.id);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].version, 2);
    assert.strictEqual(history[1].version, 1);

    // Restore Version 1 to Draft
    const restored = await LeadFormRepository.restoreVersionToDraft(testStoreId, form.id, 1);
    assert.ok(restored);
    assert.strictEqual(restored.currentDraft.steps[0].fields.length, contactTemplate.steps[0].fields.length);
  });

  test("3. Duplicate Detection & Merge Engine: Email priority & Phone fallback", async () => {
    // 1st submission
    const sub1 = await LeadRepository.upsertLeadFromSubmission(testStoreId, {
      fullName: "Alice Morgan",
      email: "alice@example.com",
      phone: "+1 555-0100",
      company: "Morgan Advisory",
      source: "Contact Form",
      submittedAt: "2026-10-24T10:00:00.000Z",
    });

    assert.strictEqual(sub1.isNew, true);
    assert.strictEqual(sub1.lead.submissionCount, 1);
    assert.strictEqual(sub1.lead.status, "New");

    // 2nd submission with normalized uppercase/spaced email match
    const sub2 = await LeadRepository.upsertLeadFromSubmission(testStoreId, {
      fullName: "Alice M.",
      email: "  ALICE@example.com ",
      phone: "+1 555-0100",
      company: "Morgan Advisory LLC",
      source: "Request a Quote",
      submittedAt: "2026-10-24T11:00:00.000Z",
    });

    assert.strictEqual(sub2.isNew, false);
    assert.strictEqual(sub2.lead.id, sub1.lead.id); // Same lead record merged
    assert.strictEqual(sub2.lead.submissionCount, 2);
    assert.strictEqual(sub2.lead.lastSubmissionAt, "2026-10-24T11:00:00.000Z");

    // 3rd submission without email, but matching phone
    const sub3 = await LeadRepository.upsertLeadFromSubmission(testStoreId, {
      fullName: "Alice",
      phone: "+1 555-0100",
      source: "Request a Callback",
      submittedAt: "2026-10-24T12:00:00.000Z",
    });

    assert.strictEqual(sub3.isNew, false);
    assert.strictEqual(sub3.lead.id, sub1.lead.id);
    assert.strictEqual(sub3.lead.submissionCount, 3);

    // 4th submission with conflicting email and matching phone: MUST NOT MERGE
    const sub4 = await LeadRepository.upsertLeadFromSubmission(testStoreId, {
      fullName: "Bob Smith",
      email: "bob@example.com",
      phone: "+1 555-0100", // shared family or office phone
      source: "Contact Form",
      submittedAt: "2026-10-24T13:00:00.000Z",
    });

    assert.strictEqual(sub4.isNew, true);
    assert.notStrictEqual(sub4.lead.id, sub1.lead.id); // Distinct lead identity protected
  });

  test("4. Strict Tenant Isolation: Cross-store matching is prohibited", async () => {
    // Create lead in store 1
    const lead1 = await LeadRepository.create({
      storeId: testStoreId,
      fullName: "Corporate Partner",
      email: "partner@enterprise.com",
      source: "Website",
    });

    // Check from store 2
    const foundInOtherStore = await LeadRepository.findExistingLead(
      otherStoreId,
      "partner@enterprise.com"
    );
    assert.strictEqual(foundInOtherStore, null);

    // Submitting in store 2 creates a new, completely isolated lead
    const subOther = await LeadRepository.upsertLeadFromSubmission(otherStoreId, {
      fullName: "Corporate Partner",
      email: "partner@enterprise.com",
      source: "Website",
      submittedAt: new Date().toISOString(),
    });

    assert.strictEqual(subOther.isNew, true);
    assert.notStrictEqual(subOther.lead.id, lead1.id);
    assert.strictEqual(subOther.lead.storeId, otherStoreId);
  });

  test("5. Status Lifecycle Transitions, Notes & Follow-up Reminders", async () => {
    const lead = await LeadRepository.create({
      storeId: testStoreId,
      fullName: "Charles Xavier",
      email: "charles@mansion.edu",
      source: "Consultation Request",
    });

    assert.strictEqual(lead.status, "New");

    // Move to Contacted
    const updated1 = await LeadRepository.update(testStoreId, lead.id, { status: "Contacted" });
    assert.strictEqual(updated1?.status, "Contacted");

    // Move to Qualified
    const updated2 = await LeadRepository.update(testStoreId, lead.id, { status: "Qualified" });
    assert.strictEqual(updated2?.status, "Qualified");

    // Add internal note
    const note = await LeadRepository.addNote(testStoreId, lead.id, {
      authorId: "usr_admin",
      authorName: "Sarah Connor",
      content: "Client expressed interest in annual enterprise plan with SLA.",
    });
    assert.ok(note?.id.startsWith("note_"));

    // Add reminder
    const reminder = await LeadReminderRepository.create({
      storeId: testStoreId,
      leadId: lead.id,
      title: "Follow up regarding proposal feedback",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.strictEqual(reminder.status, "pending");

    // Complete reminder
    const completedRem = await LeadReminderRepository.updateStatus(
      testStoreId,
      reminder.id,
      "completed"
    );
    assert.strictEqual(completedRem?.status, "completed");
    assert.ok(completedRem?.completedAt);

    // Verify activity stream recorded transitions and actions
    const activities = await LeadRepository.getActivities(testStoreId, lead.id);
    assert.ok(activities.length >= 3);
  });

  test("6. Permanent GDPR Deletion Cascade completely cleans up personal data", async () => {
    const lead = await LeadRepository.create({
      storeId: testStoreId,
      fullName: "Private Citizen",
      email: "private@citizen.org",
      phone: "+1 555-0999",
      source: "Confidential Form",
    });

    // Create submissions and reminders
    await LeadSubmissionRepository.create({
      storeId: testStoreId,
      leadId: lead.id,
      formId: "form_123",
      formVersion: 1,
      formName: "Confidential Form",
      data: { sensitiveNotes: "High privacy requirements" },
      submittedFieldsSnapshot: [],
      isTest: false,
    });

    await LeadReminderRepository.create({
      storeId: testStoreId,
      leadId: lead.id,
      title: "Confidential check-in",
      dueAt: new Date().toISOString(),
    });

    // Perform permanent deletion
    const deleted = await LeadRepository.permanentlyDelete(testStoreId, lead.id);
    assert.strictEqual(deleted, true);

    // Verify lead is gone
    const leadCheck = await LeadRepository.findById(testStoreId, lead.id);
    assert.strictEqual(leadCheck, null);

    // Verify submissions are wiped
    const subsCheck = await LeadSubmissionRepository.findByLead(testStoreId, lead.id);
    assert.strictEqual(subsCheck.length, 0);

    // Verify reminders are wiped
    const remsCheck = await LeadReminderRepository.findByLead(testStoreId, lead.id);
    assert.strictEqual(remsCheck.length, 0);

    // Verify activities are wiped
    const actsCheck = await LeadRepository.getActivities(testStoreId, lead.id);
    assert.strictEqual(actsCheck.length, 0);
  });

  test("7. Analytics calculation & zero-denominator guard", async () => {
    // 0 views test -> should yield 0% without error or NaN
    const emptyAnalytics = await LeadSubmissionRepository.getAnalyticsOverview(testStoreId, 0, []);
    assert.strictEqual(emptyAnalytics.conversionRate, 0);
    assert.strictEqual(emptyAnalytics.totalSubmissions, 0);
    assert.strictEqual(emptyAnalytics.totalFormViews, 0);

    // Add production submissions and test submission
    await LeadSubmissionRepository.create({
      storeId: testStoreId,
      leadId: "lead_1",
      formId: "form_1",
      formVersion: 1,
      formName: "Quote",
      data: { value: 1 },
      submittedFieldsSnapshot: [],
      isTest: false,
    });

    await LeadSubmissionRepository.create({
      storeId: testStoreId,
      leadId: "lead_2",
      formId: "form_1",
      formVersion: 1,
      formName: "Quote",
      data: { value: 2 },
      submittedFieldsSnapshot: [],
      isTest: false,
    });

    // Preview / test submission MUST NOT inflate production conversion metrics
    await LeadSubmissionRepository.create({
      storeId: testStoreId,
      leadId: "lead_test",
      formId: "form_1",
      formVersion: 1,
      formName: "Quote",
      data: { test: true },
      submittedFieldsSnapshot: [],
      isTest: true,
    });

    const populated = await LeadSubmissionRepository.getAnalyticsOverview(
      testStoreId,
      100, // 100 unique visits
      [{ status: "New", createdAt: new Date().toISOString() }]
    );

    assert.strictEqual(populated.totalSubmissions, 2); // strictly excludes test submission
    assert.strictEqual(populated.totalFormViews, 100);
    assert.strictEqual(populated.conversionRate, 2.0); // (2 / 100) * 100% = 2.0%
  });
});
