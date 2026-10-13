import test from "node:test";
import assert from "node:assert/strict";
import { FeedbackRepository } from "../src/lib/repositories/feedback.repository";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { StoreFeedback } from "../src/types/feedback";

test("FeedbackRepository Creation and Store Scoping", async () => {
  FeedbackRepository._resetMemory();

  const feedback1: StoreFeedback = {
    id: "fb_test_01",
    storeId: "str_01",
    authorType: "client",
    authorName: "Sarah Connor",
    type: "general",
    message: "Loved the minimalist Scandinavian color palette.",
    createdAt: new Date().toISOString(),
  };

  const feedback2: StoreFeedback = {
    id: "fb_test_02",
    storeId: "str_02",
    authorType: "client",
    authorName: "Marcus Wright",
    type: "changes_requested",
    message: "Please increase contrast on product descriptions.",
    createdAt: new Date().toISOString(),
  };

  await FeedbackRepository.create(feedback1);
  await FeedbackRepository.create(feedback2);

  // Verify store isolation
  const store1Feedback = await FeedbackRepository.findByStoreId("str_01");
  assert.equal(store1Feedback.length, 1);
  assert.equal(store1Feedback[0].id, "fb_test_01");

  const store2Feedback = await FeedbackRepository.findByStoreId("str_02");
  assert.equal(store2Feedback.length, 1);
  assert.equal(store2Feedback[0].id, "fb_test_02");
});

test("Store Review State Transitions upon Feedback", async () => {
  const store = await StoreRepository.findBySlug("aura-minimalist");
  assert.ok(store);

  // Transition to Pending Review
  await StoreRepository.update(store.id, { status: "Pending Review" });
  let current = await StoreRepository.findById(store.id);
  assert.equal(current?.status, "Pending Review");

  // Transition to Changes Requested
  await StoreRepository.update(store.id, { status: "Changes Requested" });
  current = await StoreRepository.findById(store.id);
  assert.equal(current?.status, "Changes Requested");

  // Transition to Approved
  await StoreRepository.update(store.id, { status: "Approved" });
  current = await StoreRepository.findById(store.id);
  assert.equal(current?.status, "Approved");

  // Restore original Published status
  await StoreRepository.update(store.id, { status: "Published" });
});
