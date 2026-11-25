import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/crypto/tokens";
import { PreviewShareRepository } from "@/lib/repositories/preview-share.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { CommentRepository } from "@/lib/repositories/comment.repository";
import { CollaborationComment, CommentAnchorType } from "@/types/comment";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Preview token is required" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const share = await PreviewShareRepository.findByTokenHash(tokenHash);

  if (!share) {
    return NextResponse.json({ error: "Invalid preview token" }, { status: 401 });
  }

  if (share.status === "revoked") {
    return NextResponse.json({ error: "This preview link has been revoked" }, { status: 403 });
  }

  if (share.status === "expired") {
    return NextResponse.json({ error: "This preview link has expired" }, { status: 403 });
  }

  // Security critical: includeInternal is STRICTLY false for public preview clients!
  const comments = await CommentRepository.findByStoreId(share.storeId, {
    includeInternal: false,
  });

  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Preview token is required" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const share = await PreviewShareRepository.findByTokenHash(tokenHash);

  if (!share) {
    return NextResponse.json({ error: "Invalid preview token" }, { status: 401 });
  }

  if (share.status === "revoked") {
    return NextResponse.json({ error: "This preview link has been revoked" }, { status: 403 });
  }

  if (share.status === "expired") {
    return NextResponse.json({ error: "This preview link has expired" }, { status: 403 });
  }

  const store = await StoreRepository.findById(share.storeId);
  if (!store) {
    return NextResponse.json({ error: "Storefront not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { authorName, authorEmail, anchorType, anchorId, anchorLabel, message, parentId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Comment message cannot be empty" }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "Comment exceeds 2000 characters limit" }, { status: 400 });
    }

    const cleanAuthor = (authorName && typeof authorName === "string" ? authorName.trim() : "") || share.clientName || "Client Reviewer";
    const cleanAnchorType: CommentAnchorType =
      anchorType === "product" ? "product" : anchorType === "section" ? "section" : "general";
    const cleanAnchorId = (anchorId && typeof anchorId === "string" ? anchorId.trim() : "") || "general";

    const commentRecord: CollaborationComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: store.id,
      shareId: share.id,
      authorType: "client",
      authorName: cleanAuthor,
      authorEmail: authorEmail ? String(authorEmail).trim() : undefined,
      anchorType: cleanAnchorType,
      anchorId: cleanAnchorId,
      anchorLabel: anchorLabel ? String(anchorLabel).trim() : undefined,
      message: escapeHtml(message.trim()),
      isInternalOnly: false, // Clients can NEVER post internal-only notes
      status: "open",
      parentId: parentId ? String(parentId) : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await CommentRepository.create(commentRecord);
    return NextResponse.json({ comment: saved }, { status: 201 });
  } catch (err) {
    console.error("Error creating client collaboration comment:", err);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
