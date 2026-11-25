import test from "node:test";
import assert from "node:assert/strict";
import { AnalyticsRepository } from "../src/lib/repositories/analytics.repository";

test("AnalyticsRepository Event Ingestion & Idempotency", async () => {
  AnalyticsRepository._resetMemory();

  const evt1 = await AnalyticsRepository.recordEvent({
    eventType: "store_created",
    storeId: "str_test_101",
    storeName: "Aura Living",
    industry: "Home Decor",
    templateId: "tpl_minimal",
    idempotencyKey: "idem_key_001",
  });

  assert.ok(evt1.id);
  assert.equal(evt1.eventType, "store_created");
  assert.equal(evt1.idempotencyKey, "idem_key_001");

  // Attempt duplicate ingestion with same idempotencyKey
  const evtDuplicate = await AnalyticsRepository.recordEvent({
    eventType: "store_created",
    storeId: "str_test_101",
    storeName: "Aura Living",
    idempotencyKey: "idem_key_001",
  });

  // Must return the exact same event without duplicating in storage
  assert.equal(evtDuplicate.id, evt1.id);
  const allEvents = await AnalyticsRepository.findEvents();
  assert.equal(allEvents.length, 1);
});

test("Analytics Overview Zero-Denominator Guard", async () => {
  AnalyticsRepository._resetMemory();

  // With no events at all, conversion rates must return 0 instead of NaN or Infinity
  const emptyOverview = await AnalyticsRepository.getOverview();
  assert.equal(emptyOverview.summary.totalStores, 0);
  assert.equal(emptyOverview.summary.totalShares, 0);
  assert.equal(emptyOverview.summary.proposalApprovalRate, 0);
  assert.equal(emptyOverview.summary.shareToViewRate, 0);
  assert.equal(emptyOverview.summary.viewToFeedbackRate, 0);
  assert.equal(emptyOverview.summary.avgTimeToApprovalHours, 0);
  assert.equal(emptyOverview.summary.medianTimeToApprovalHours, 0);
});

test("Analytics Conversion Funnel & Time-to-Approval Calculation", async () => {
  AnalyticsRepository._resetMemory();

  const t0 = new Date("2026-10-10T10:00:00Z").getTime();
  const tShare = new Date("2026-10-10T12:00:00Z").getTime(); // +2 hours
  const tView1 = new Date("2026-10-10T13:00:00Z").getTime();
  const tView2 = new Date("2026-10-10T14:00:00Z").getTime();
  const tFeedback = new Date("2026-10-10T15:00:00Z").getTime();
  const tApproval = new Date("2026-10-10T16:00:00Z").getTime(); // +4 hours from share

  // Store 1: Full successful funnel
  await AnalyticsRepository.recordEvent({
    eventType: "store_created",
    storeId: "store_alpha",
    storeName: "Alpha Store",
    industry: "Fashion",
    templateId: "tpl_fashion",
    timestamp: new Date(t0).toISOString(),
  });

  await AnalyticsRepository.recordEvent({
    eventType: "share_generated",
    storeId: "store_alpha",
    industry: "Fashion",
    templateId: "tpl_fashion",
    timestamp: new Date(tShare).toISOString(),
  });

  await AnalyticsRepository.recordEvent({
    eventType: "preview_viewed",
    storeId: "store_alpha",
    visitorSessionId: "session_client_A",
    timestamp: new Date(tView1).toISOString(),
  });

  // Second view by same visitor session
  await AnalyticsRepository.recordEvent({
    eventType: "preview_viewed",
    storeId: "store_alpha",
    visitorSessionId: "session_client_A",
    timestamp: new Date(tView2).toISOString(),
  });

  await AnalyticsRepository.recordEvent({
    eventType: "feedback_submitted",
    storeId: "store_alpha",
    timestamp: new Date(tFeedback).toISOString(),
  });

  await AnalyticsRepository.recordEvent({
    eventType: "proposal_approved",
    storeId: "store_alpha",
    industry: "Fashion",
    templateId: "tpl_fashion",
    timestamp: new Date(tApproval).toISOString(),
  });

  // Store 2: Shared but not approved yet
  await AnalyticsRepository.recordEvent({
    eventType: "share_generated",
    storeId: "store_beta",
    industry: "Electronics",
    templateId: "tpl_tech",
    timestamp: new Date(tShare).toISOString(),
  });

  const overview = await AnalyticsRepository.getOverview();

  // 1 out of 2 shared stores approved = 50.0%
  assert.equal(overview.summary.totalShares, 2);
  assert.equal(overview.summary.totalProposalsApproved, 1);
  assert.equal(overview.summary.proposalApprovalRate, 50);

  // 2 views recorded, but 1 unique visitor session
  assert.equal(overview.summary.totalPreviewViews, 2);
  assert.equal(overview.summary.uniqueVisitorSessions, 1);

  // Time-to-approval: 16:00 - 12:00 = 4 hours
  assert.equal(overview.summary.avgTimeToApprovalHours, 4);
  assert.equal(overview.summary.medianTimeToApprovalHours, 4);

  // Industry breakdown
  const fashionInd = overview.industryBreakdown.find((i) => i.industry === "Fashion");
  assert.ok(fashionInd);
  assert.equal(fashionInd.shareCount, 1);
  assert.equal(fashionInd.approvedCount, 1);
  assert.equal(fashionInd.approvalRate, 100);

  const electronicsInd = overview.industryBreakdown.find((i) => i.industry === "Electronics");
  assert.ok(electronicsInd);
  assert.equal(electronicsInd.shareCount, 1);
  assert.equal(electronicsInd.approvedCount, 0);
  assert.equal(electronicsInd.approvalRate, 0);
});
