import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AnalyticsRepository } from "@/lib/repositories/analytics.repository";
import { PreviewShareRepository } from "@/lib/repositories/preview-share.repository";
import { hashToken } from "@/lib/crypto/tokens";
import { AnalyticsEventType } from "@/types/analytics";

// Privileged system lifecycle events can ONLY be emitted server-side by official handlers
const PRIVILEGED_LIFECYCLE_EVENTS: AnalyticsEventType[] = [
  "store_created",
  "proposal_approved",
  "store_exported",
  "store_deployed",
];

const ALLOWED_STAFF_EVENTS: AnalyticsEventType[] = [
  "store_customized",
  "share_generated",
  "preview_viewed",
  "feedback_submitted",
];

const ALLOWED_PUBLIC_EVENTS: AnalyticsEventType[] = [
  "preview_viewed",
  "feedback_submitted",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventType,
      storeId,
      storeName,
      clientId,
      clientName,
      industry,
      templateId,
      shareToken,
      metadata,
      idempotencyKey,
    } = body;

    if (!eventType || typeof eventType !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing eventType" },
        { status: 400 }
      );
    }

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 }
      );
    }

    // Defense 1: Reject spoofed privileged lifecycle events
    if (PRIVILEGED_LIFECYCLE_EVENTS.includes(eventType as AnalyticsEventType)) {
      return NextResponse.json(
        { error: "Forbidden: Privileged lifecycle events cannot be emitted directly via this endpoint" },
        { status: 403 }
      );
    }

    const session = await auth();
    let verifiedUserId: string | undefined;
    let verifiedUserEmail: string | undefined;
    let verifiedVisitorSessionId: string | undefined;

    if (session?.user) {
      // Authenticated internal staff context
      if (!ALLOWED_STAFF_EVENTS.includes(eventType as AnalyticsEventType)) {
        return NextResponse.json(
          { error: `Unsupported event type: ${eventType}` },
          { status: 400 }
        );
      }
      verifiedUserId = session.user.id || undefined;
      verifiedUserEmail = session.user.email || undefined;
    } else {
      // Public / client visitor context: requires active, unexpired preview share token
      const rawToken = shareToken || request.headers.get("x-preview-token");
      if (!rawToken || typeof rawToken !== "string") {
        return NextResponse.json(
          { error: "Unauthorized: Authentication or active preview token required to record events" },
          { status: 401 }
        );
      }

      const tokenHash = hashToken(rawToken);
      const share = await PreviewShareRepository.findByTokenHash(tokenHash);

      if (!share) {
        return NextResponse.json(
          { error: "Invalid preview share token" },
          { status: 401 }
        );
      }

      if (share.status === "revoked") {
        return NextResponse.json(
          { error: "Preview share token has been revoked" },
          { status: 403 }
        );
      }

      if (share.status === "expired") {
        return NextResponse.json(
          { error: "Preview share token has expired" },
          { status: 403 }
        );
      }

      if (share.storeId !== storeId) {
        return NextResponse.json(
          { error: "Forbidden: Preview token does not match target store" },
          { status: 403 }
        );
      }

      if (!ALLOWED_PUBLIC_EVENTS.includes(eventType as AnalyticsEventType)) {
        return NextResponse.json(
          { error: `Public preview clients cannot emit event type: ${eventType}` },
          { status: 403 }
        );
      }

      verifiedVisitorSessionId = share.id;
    }

    // Sanitize metadata to avoid prototype pollution or oversized payloads
    const sanitizedMetadata: Record<string, unknown> = {};
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
      for (const [key, val] of Object.entries(metadata)) {
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          sanitizedMetadata[key] = val;
        }
      }
    }

    const event = await AnalyticsRepository.recordEvent({
      eventType: eventType as AnalyticsEventType,
      storeId,
      storeName: storeName ? String(storeName) : undefined,
      clientId: clientId ? String(clientId) : undefined,
      clientName: clientName ? String(clientName) : undefined,
      industry: industry ? String(industry) : undefined,
      templateId: templateId ? String(templateId) : undefined,
      userId: verifiedUserId,
      userEmail: verifiedUserEmail,
      visitorSessionId: verifiedVisitorSessionId,
      metadata: Object.keys(sanitizedMetadata).length > 0 ? sanitizedMetadata : undefined,
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
      timestamp: new Date().toISOString(), // Strict server-side timestamp
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error recording analytics event:", error);
    return NextResponse.json(
      { error: "Failed to record analytics event" },
      { status: 500 }
    );
  }
}
