import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CommentRepository } from "@/lib/repositories/comment.repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;
  const comment = await CommentRepository.findById(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const action = body.action; // "resolve" | "reopen"
    const userName = session.user.name || session.user.email || "Staff";

    let updated = null;
    if (action === "resolve") {
      updated = await CommentRepository.resolveComment(commentId, userName);
    } else if (action === "reopen") {
      updated = await CommentRepository.reopenComment(commentId);
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'resolve' or 'reopen'" }, { status: 400 });
    }

    return NextResponse.json({ comment: updated });
  } catch (err) {
    console.error("Error updating comment status:", err);
    return NextResponse.json({ error: "Failed to update comment status" }, { status: 500 });
  }
}
