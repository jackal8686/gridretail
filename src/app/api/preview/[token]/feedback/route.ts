import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/crypto/tokens";
import { PreviewShareRepository } from "@/lib/repositories/preview-share.repository";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { AnalyticsRepository } from "@/lib/repositories/analytics.repository";
import { StoreFeedback, FeedbackType } from "@/types/feedback";
import { NotificationService } from "@/lib/notifications/notification-service";

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
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const share = await PreviewShareRepository.findByTokenHash(tokenHash);
  if (!share || share.status !== "active") {
    return NextResponse.json({ error: "Unauthorized or invalid preview token" }, { status: 401 });
  }

  const feedback = await FeedbackRepository.findByStoreId(share.storeId);
  return NextResponse.json({ feedback });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
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
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { authorName, authorEmail, type, message } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Feedback message cannot be empty" }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "Feedback message exceeds 2000 characters limit" }, { status: 400 });
    }

    const cleanAuthor = (authorName && typeof authorName === "string" ? authorName.trim() : "") || share.clientName || "Client Reviewer";
    const feedbackType: FeedbackType =
      type === "approval" ? "approval" : type === "changes_requested" ? "changes_requested" : "general";

    const feedbackRecord: StoreFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: store.id,
      shareId: share.id,
      authorType: "client",
      authorName: cleanAuthor,
      authorEmail: authorEmail ? String(authorEmail).trim() : undefined,
      type: feedbackType,
      message: escapeHtml(message.trim()),
      createdAt: new Date().toISOString(),
    };

    const saved = await FeedbackRepository.create(feedbackRecord);

    // Apply store review status transition & dispatch notifications
    if (feedbackType === "approval") {
      await StoreRepository.update(store.id, { status: "Approved" });
      await ActivityRepository.record({
        type: "store_updated",
        title: "Store proposal approved",
        description: `${cleanAuthor} approved the demonstration storefront proposal!`,
        user: { name: cleanAuthor, avatarInitial: cleanAuthor.charAt(0).toUpperCase() },
        targetId: store.id,
        targetName: store.name,
      });

      // Dispatch approval notification email
      try {
        await NotificationService.notifyProposalApproved(store, cleanAuthor, message.trim());
      } catch (notifErr) {
        console.warn("Failed to dispatch approval notification:", notifErr);
      }
    } else if (feedbackType === "changes_requested") {
      await StoreRepository.update(store.id, { status: "Changes Requested" });
      await ActivityRepository.record({
        type: "store_updated",
        title: "Changes requested on store",
        description: `${cleanAuthor} submitted change requests for the storefront proposal.`,
        user: { name: cleanAuthor, avatarInitial: cleanAuthor.charAt(0).toUpperCase() },
        targetId: store.id,
        targetName: store.name,
      });

      // Dispatch changes requested notification email
      try {
        await NotificationService.notifyChangesRequested(store, cleanAuthor, message.trim());
      } catch (notifErr) {
        console.warn("Failed to dispatch changes requested notification:", notifErr);
      }
    } else {
      await ActivityRepository.record({
        type: "store_updated",
        title: "Client feedback received",
        description: `New feedback submitted by ${cleanAuthor}`,
        user: { name: cleanAuthor, avatarInitial: cleanAuthor.charAt(0).toUpperCase() },
        targetId: store.id,
        targetName: store.name,
      });

      // Dispatch general feedback notification email
      try {
        await NotificationService.notifyFeedbackSubmitted(store, saved, cleanAuthor);
      } catch (notifErr) {
        console.warn("Failed to dispatch feedback notification:", notifErr);
      }
    }

    // Record analytics feedback event
    await AnalyticsRepository.recordEvent({
      eventType: "feedback_submitted",
      storeId: store.id,
      storeName: store.name,
      clientId: store.clientId,
      clientName: store.clientName,
      industry: store.industry,
      templateId: store.templateId,
      visitorSessionId: share.id,
      metadata: {
        feedbackType,
        authorName: cleanAuthor,
      },
    });

    if (feedbackType === "approval") {
      await AnalyticsRepository.recordEvent({
        eventType: "proposal_approved",
        storeId: store.id,
        storeName: store.name,
        clientId: store.clientId,
        clientName: store.clientName,
        industry: store.industry,
        templateId: store.templateId,
        visitorSessionId: share.id,
        metadata: {
          authorName: cleanAuthor,
        },
      });
    }

    return NextResponse.json({ feedback: saved }, { status: 201 });
  } catch (err) {
    console.error("Error submitting client feedback:", err);
    return NextResponse.json({ error: "Failed to process feedback submission" }, { status: 500 });
  }
}
