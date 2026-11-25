import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeadRepository } from "@/lib/repositories/lead.repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Notes require Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId, leadId } = await params;
    const body = await request.json();

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }

    const authorName = session.user.name || session.user.email || "Admin";
    const authorId = session.user.id || "admin";

    const note = await LeadRepository.addNote(storeId, leadId, {
      authorId,
      authorName,
      content: body.content,
    });

    if (!note) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
