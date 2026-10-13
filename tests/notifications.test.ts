import { test } from "node:test";
import assert from "node:assert";
import { ConsoleMockEmailProvider, setEmailProvider } from "../src/lib/notifications/email-provider";
import { NotificationRepository } from "../src/lib/repositories/notification.repository";
import { NotificationService } from "../src/lib/notifications/notification-service";
import { Store, StoreFeedback } from "../src/types";

test("Email Notification Engine & Provider Tests", async (t) => {
  const mockEmailProvider = new ConsoleMockEmailProvider();
  setEmailProvider(mockEmailProvider);
  NotificationRepository._resetMemory();

  const mockStore: Store = {
    id: "store-notif-101",
    name: "Aura Home & Living",
    slug: "aura-home",
    clientName: "Aura Living Corp",
    clientId: "client-2",
    industry: "Home & Living",
    templateId: "tpl-scandi-craft",
    templateName: "Scandi Craft",
    status: "Pending Review",
    productCount: 4,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "Nordic interior design showcase.",
    branding: {
      primaryColor: "#176B4D",
      fontFamily: "Inter",
    },
  };

  await t.test("NotificationRepository stores and tracks notifications", async () => {
    const notif = await NotificationRepository.create({
      id: "notif-test-1",
      to: "sales@gridretail.internal",
      from: "notifications@gridretail.internal",
      subject: "Test Subject",
      htmlBody: "<p>Hello</p>",
      textBody: "Hello",
      event: "feedback_submitted",
      status: "queued",
      storeId: mockStore.id,
      storeName: mockStore.name,
      createdAt: new Date().toISOString(),
    });

    assert.strictEqual(notif.id, "notif-test-1");

    const found = await NotificationRepository.findById("notif-test-1");
    assert.ok(found);
    assert.strictEqual(found.status, "queued");

    await NotificationRepository.updateStatus("notif-test-1", "sent");
    const updated = await NotificationRepository.findById("notif-test-1");
    assert.strictEqual(updated?.status, "sent");
    assert.ok(updated?.sentAt);
  });

  await t.test("NotificationService dispatches feedback_submitted notification with escaped HTML", async () => {
    mockEmailProvider.clearOutbox();

    const mockFeedback: StoreFeedback = {
      id: "fb-101",
      storeId: mockStore.id,
      shareId: "share-101",
      authorType: "client",
      authorName: "Sarah Connor <script>alert(1)</script>",
      authorEmail: "sarah@aura.com",
      type: "general",
      message: 'Looks great! Can we adjust the hero color to <b>#234</b> & "bold"?',
      createdAt: new Date().toISOString(),
    };

    const record = await NotificationService.notifyFeedbackSubmitted(mockStore, mockFeedback);

    assert.strictEqual(record.event, "feedback_submitted");
    assert.strictEqual(record.status, "sent");
    assert.ok(record.subject.includes("Aura Home & Living"));

    // Verify HTML escaping
    assert.ok(!record.htmlBody.includes("<script>"), "Must sanitize raw script tags in HTML email");
    assert.ok(record.htmlBody.includes("&lt;script&gt;"), "Must escape author name with HTML entities");
    assert.ok(record.htmlBody.includes("&quot;bold&quot;"), "Must escape quotes in feedback text");

    // Verify outbox received message
    const outbox = mockEmailProvider.getOutbox();
    assert.strictEqual(outbox.length, 1);
    assert.strictEqual(outbox[0].id, record.id);
  });

  await t.test("NotificationService dispatches proposal_approved notification", async () => {
    mockEmailProvider.clearOutbox();

    const record = await NotificationService.notifyProposalApproved(
      mockStore,
      "Director John Vance",
      "Approved for immediate rollout."
    );

    assert.strictEqual(record.event, "proposal_approved");
    assert.ok(record.subject.includes("APPROVED"));
    assert.ok(record.htmlBody.includes("Approved for immediate rollout."));
    assert.ok(record.htmlBody.includes("Director John Vance"));

    const outbox = mockEmailProvider.getOutbox();
    assert.strictEqual(outbox.length, 1);
    assert.strictEqual(outbox[0].event, "proposal_approved");
  });

  await t.test("NotificationService dispatches changes_requested notification", async () => {
    mockEmailProvider.clearOutbox();

    const record = await NotificationService.notifyChangesRequested(
      mockStore,
      "VP Design Elena Rostova",
      "Please reorder sections: place About above the Featured Products."
    );

    assert.strictEqual(record.event, "changes_requested");
    assert.ok(record.subject.includes("Changes Requested"));
    assert.ok(record.htmlBody.includes("place About above the Featured Products"));

    const outbox = mockEmailProvider.getOutbox();
    assert.strictEqual(outbox.length, 1);
    assert.strictEqual(outbox[0].event, "changes_requested");
  });
});
