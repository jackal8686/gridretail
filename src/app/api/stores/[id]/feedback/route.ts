import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { StoreFeedback } from "@/types/feedback";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storeId } = await params;
  const feedback = await FeedbackRepository.findByStoreId(storeId);
  return NextResponse.json({ feedback });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storeId } = await params;
  const store = await StoreRepository.findById(storeId);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Response message cannot be empty" }, { status: 400 });
    }

    const operatorName = session.user.name || "Operator";

    const feedbackRecord: StoreFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: store.id,
      authorType: "employee",
      authorName: operatorName,
      authorEmail: session.user.email || undefined,
      type: "general",
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    const saved = await FeedbackRepository.create(feedbackRecord);

    await ActivityRepository.record({
      type: "store_updated",
      title: "Team responded to feedback",
      description: `${operatorName} replied in client feedback thread for ${store.name}`,
      user: { name: operatorName, avatarInitial: operatorName.charAt(0).toUpperCase() },
      targetId: store.id,
      targetName: store.name,
    });

    return NextResponse.json({ feedback: saved }, { status: 201 });
  } catch (err) {
    console.error("Error creating team response:", err);
    return NextResponse.json({ error: "Failed to post team response" }, { status: 500 });
  }
}
