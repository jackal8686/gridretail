import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const anchorId = searchParams.get("anchorId") || undefined;

  // Authenticated internal users can view internal notes
  const comments = await CommentRepository.findByStoreId(id, {
    includeInternal: true,
    anchorId,
  });

  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { anchorType, anchorId, anchorLabel, message, isInternalOnly, parentId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Comment message cannot be empty" }, { status: 400 });
    }

    const cleanAnchorType: CommentAnchorType =
      anchorType === "product" ? "product" : anchorType === "section" ? "section" : "general";
    const cleanAnchorId = (anchorId && typeof anchorId === "string" ? anchorId.trim() : "") || "general";
    const authorName = session.user.name || session.user.email || "Internal Staff";

    const commentRecord: CollaborationComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: store.id,
      authorType: "internal",
      authorName,
      authorEmail: session.user.email || undefined,
      anchorType: cleanAnchorType,
      anchorId: cleanAnchorId,
      anchorLabel: anchorLabel ? String(anchorLabel).trim() : undefined,
      message: escapeHtml(message.trim()),
      isInternalOnly: Boolean(isInternalOnly),
      status: "open",
      parentId: parentId ? String(parentId) : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await CommentRepository.create(commentRecord);
    return NextResponse.json({ comment: saved }, { status: 201 });
  } catch (err) {
    console.error("Error creating internal collaboration comment:", err);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
