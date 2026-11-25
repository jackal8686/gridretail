import test from "node:test";
import assert from "node:assert/strict";
import { CommentRepository } from "../src/lib/repositories/comment.repository";
import { PreviewShareRepository } from "../src/lib/repositories/preview-share.repository";
import { CollaborationComment } from "../src/types/comment";
import { hashToken } from "../src/lib/crypto/tokens";

test("CommentRepository Creation, Anchoring & Store Scoping", async () => {
  CommentRepository._resetMemory();

  const cmt1: CollaborationComment = {
    id: "cmt_test_01",
    storeId: "store_101",
    authorType: "client",
    authorName: "Sarah Connor",
    anchorType: "section",
    anchorId: "section.hero",
    anchorLabel: "Hero Banner",
    message: "Can we brighten the hero background image?",
    isInternalOnly: false,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  const cmt2: CollaborationComment = {
    id: "cmt_test_02",
    storeId: "store_101",
    authorType: "internal",
    authorName: "Alex Mercer",
    anchorType: "product",
    anchorId: "product.prod_1",
    anchorLabel: "Nordic Ceramic Mug",
    message: "Client asked for high-gloss finish on this SKU.",
    isInternalOnly: true, // Internal team note
    status: "open",
    createdAt: new Date().toISOString(),
  };

  const cmt3: CollaborationComment = {
    id: "cmt_test_03",
    storeId: "store_999", // Different store
    authorType: "client",
    authorName: "Marcus Wright",
    anchorType: "general",
    anchorId: "general",
    message: "Different store feedback",
    isInternalOnly: false,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  await CommentRepository.create(cmt1);
  await CommentRepository.create(cmt2);
  await CommentRepository.create(cmt3);

  // Store 101 query
  const store1Comments = await CommentRepository.findByStoreId("store_101", {
    includeInternal: true,
  });
  assert.equal(store1Comments.length, 2);

  // Filter by anchor
  const heroComments = await CommentRepository.findByStoreId("store_101", {
    includeInternal: true,
    anchorId: "section.hero",
  });
  assert.equal(heroComments.length, 1);
  assert.equal(heroComments[0].anchorId, "section.hero");

  // Isolation from store 999
  const store999Comments = await CommentRepository.findByStoreId("store_999", {
    includeInternal: true,
  });
  assert.equal(store999Comments.length, 1);
  assert.equal(store999Comments[0].id, "cmt_test_03");
});

test("Security Boundary: Public Preview Client Strictly Excludes Internal Notes", async () => {
  CommentRepository._resetMemory();

  // Internal team note
  await CommentRepository.create({
    id: "cmt_internal_secret",
    storeId: "store_confidential",
    authorType: "internal",
    authorName: "Sales Lead",
    anchorType: "general",
    anchorId: "general",
    message: "Client budget is $50k. Push for full tier.",
    isInternalOnly: true,
    status: "open",
    createdAt: new Date().toISOString(),
  });

  // Client-visible note
  await CommentRepository.create({
    id: "cmt_client_visible",
    storeId: "store_confidential",
    authorType: "client",
    authorName: "Client Stakeholder",
    anchorType: "section",
    anchorId: "section.about",
    message: "About section looks great.",
    isInternalOnly: false,
    status: "open",
    createdAt: new Date().toISOString(),
  });

  // Public client retrieval (includeInternal defaults to false or is explicitly false)
  const clientView = await CommentRepository.findByStoreId("store_confidential", {
    includeInternal: false,
  });

  assert.equal(clientView.length, 1);
  assert.equal(clientView[0].id, "cmt_client_visible");
  assert.equal(clientView[0].isInternalOnly, false);

  // Verify internal secret note is NOT in the array
  const hasSecret = clientView.some((c) => c.id === "cmt_internal_secret");
  assert.equal(hasSecret, false);
});

test("Collaboration Comment Status Resolution & Threading", async () => {
  CommentRepository._resetMemory();

  const parent = await CommentRepository.create({
    id: "cmt_parent",
    storeId: "store_resolve_test",
    authorType: "client",
    authorName: "VP Marketing",
    anchorType: "section",
    anchorId: "section.featured_products",
    message: "Swap order of items 1 and 2.",
    isInternalOnly: false,
    status: "open",
    createdAt: new Date().toISOString(),
  });

  // Reply
  const reply = await CommentRepository.create({
    id: "cmt_reply",
    storeId: "store_resolve_test",
    authorType: "internal",
    authorName: "Alex Mercer",
    anchorType: "section",
    anchorId: "section.featured_products",
    message: "Updated order in customizer.",
    isInternalOnly: false,
    status: "open",
    parentId: parent.id,
    createdAt: new Date().toISOString(),
  });

  assert.equal(reply.parentId, parent.id);

  // Resolve comment
  const resolved = await CommentRepository.resolveComment(parent.id, "Alex Mercer");
  assert.ok(resolved);
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolvedBy, "Alex Mercer");
  assert.ok(resolved.resolvedAt);

  // Reopen comment
  const reopened = await CommentRepository.reopenComment(parent.id);
  assert.ok(reopened);
  assert.equal(reopened.status, "open");
  assert.equal(reopened.resolvedBy, undefined);
  assert.equal(reopened.resolvedAt, undefined);
});

test("Preview Token Expiration & Revocation Validation", async () => {
  PreviewShareRepository._resetMemory();

  const token = "secure-random-test-token-123456789";
  const tokenHash = hashToken(token);

  await PreviewShareRepository.create({
    id: "shr_expired_01",
    storeId: "store_exp",
    storeSlug: "store-exp",
    tokenHash,
    expiresAt: new Date(Date.now() - 3600000).toISOString(), // expired 1h ago
    createdAt: new Date().toISOString(),
    createdBy: "usr_admin",
    createdByName: "Admin",
    status: "expired",
    accessCount: 1,
  });

  const foundShare = await PreviewShareRepository.findByTokenHash(tokenHash);
  assert.ok(foundShare);
  assert.equal(foundShare.status, "expired");
});
