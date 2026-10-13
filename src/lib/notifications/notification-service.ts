import crypto from "crypto";
import { Store } from "@/types/store";
import { StoreFeedback } from "@/types/feedback";
import { DeliveryRecord } from "@/types/delivery";
import { EmailNotification, NotificationEvent } from "@/types/notification";
import { NotificationRepository } from "@/lib/repositories/notification.repository";
import { getEmailProvider } from "./email-provider";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class NotificationService {
  private static defaultSender =
    process.env.NOTIFICATION_SENDER_EMAIL || "notifications@gridretail.internal";

  private static getAppBaseUrl(): string {
    return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  private static formatHtmlEmail(options: {
    eventTitle: string;
    badgeText: string;
    badgeColor: string;
    storeName: string;
    clientName: string;
    messageHtml: string;
    actionUrl: string;
    actionLabel: string;
  }): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF9F6; margin: 0; padding: 24px; color: #18231E; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E4E9E5; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #176B4D; padding: 24px; color: #FFFFFF; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
    .body { padding: 28px 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: ${options.badgeColor}; color: #FFFFFF; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #18231E; }
    .meta-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #64748B; font-weight: 500; }
    .meta-value { color: #0F172A; font-weight: 600; }
    .message-content { font-size: 14px; line-height: 1.6; color: #334155; margin: 20px 0; }
    .btn { display: inline-block; background: #176B4D; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { border-top: 1px solid #E4E9E5; padding: 16px 24px; font-size: 12px; color: #8F9D95; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>GridRetail Internal Notification</h1>
      <p>Storefront Generation &amp; Client Review Platform</p>
    </div>
    <div class="body">
      <div class="badge">${escapeHtml(options.badgeText)}</div>
      <h2 class="title">${escapeHtml(options.eventTitle)}</h2>
      
      <div class="meta-box">
        <div class="meta-row"><span class="meta-label">Store:</span><span class="meta-value">${escapeHtml(options.storeName)}</span></div>
        <div class="meta-row"><span class="meta-label">Client:</span><span class="meta-value">${escapeHtml(options.clientName)}</span></div>
      </div>

      <div class="message-content">
        ${options.messageHtml}
      </div>

      <div style="margin-top: 28px;">
        <a href="${escapeHtml(options.actionUrl)}" class="btn">${escapeHtml(options.actionLabel)}</a>
      </div>
    </div>
    <div class="footer">
      Automated alert dispatched by GridRetail. Manage your store projects in the employee dashboard.
    </div>
  </div>
</body>
</html>`;
  }

  public static async sendNotification(
    event: NotificationEvent,
    store: Store,
    options: {
      to?: string;
      subject: string;
      eventTitle: string;
      badgeText: string;
      badgeColor: string;
      messageHtml: string;
      textBody: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<EmailNotification> {
    const to =
      options.to ||
      process.env.NOTIFICATION_RECIPIENT_EMAIL ||
      "alex.mercer@gridretail.internal";

    const actionUrl = `${this.getAppBaseUrl()}/stores/${store.id}/preview`;

    const htmlBody = this.formatHtmlEmail({
      eventTitle: options.eventTitle,
      badgeText: options.badgeText,
      badgeColor: options.badgeColor,
      storeName: store.name,
      clientName: store.clientName,
      messageHtml: options.messageHtml,
      actionUrl,
      actionLabel: "Open Store Customizer",
    });

    const record: EmailNotification = {
      id: `notif-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      to,
      from: this.defaultSender,
      subject: options.subject,
      htmlBody,
      textBody: options.textBody,
      event,
      status: "queued",
      storeId: store.id,
      storeName: store.name,
      metadata: options.metadata,
      createdAt: new Date().toISOString(),
    };

    // Save record to repository
    await NotificationRepository.create(record);

    // Send via email provider
    const provider = getEmailProvider();
    const result = await provider.sendEmail(record);

    if (result.success) {
      await NotificationRepository.updateStatus(record.id, "sent");
      record.status = "sent";
      record.sentAt = new Date().toISOString();
    } else {
      await NotificationRepository.updateStatus(record.id, "failed", result.error);
      record.status = "failed";
      record.error = result.error;
    }

    return record;
  }

  public static async notifyFeedbackSubmitted(
    store: Store,
    feedback: StoreFeedback,
    clientName?: string
  ): Promise<EmailNotification> {
    const reviewer = feedback.authorName || clientName || "Client Reviewer";
    const subject = `[GridRetail] New Feedback Received for ${store.name}`;
    const escapedComment = escapeHtml(feedback.message);

    return this.sendNotification("feedback_submitted", store, {
      subject,
      eventTitle: "New Client Feedback Submitted",
      badgeText: "Feedback Received",
      badgeColor: "#0284C7", // Sky blue
      messageHtml: `<p><strong>${escapeHtml(reviewer)}</strong> has submitted review feedback on the demonstration storefront:</p><blockquote style="border-left: 3px solid #0284C7; margin: 12px 0; padding-left: 12px; color: #475569; font-style: italic;">"${escapedComment}"</blockquote>`,
      textBody: `Reviewer ${reviewer} submitted feedback for store "${store.name}":\n\n"${feedback.message}"\n\nView details: ${this.getAppBaseUrl()}/stores/${store.id}/preview`,
      metadata: {
        feedbackId: feedback.id,
        authorName: reviewer,
        authorEmail: feedback.authorEmail,
        feedbackType: feedback.type,
      },
    });
  }

  public static async notifyProposalApproved(
    store: Store,
    reviewerName: string,
    notes?: string
  ): Promise<EmailNotification> {
    const subject = `[GridRetail] 🎉 Proposal APPROVED: ${store.name}`;
    const escapedNotes = notes ? escapeHtml(notes) : "No additional comments provided.";

    return this.sendNotification("proposal_approved", store, {
      subject,
      eventTitle: "Storefront Proposal Approved!",
      badgeText: "Approved",
      badgeColor: "#16A34A", // Green
      messageHtml: `<p>Great news! <strong>${escapeHtml(reviewerName)}</strong> has officially approved the storefront proposal for <strong>${escapeHtml(store.clientName)}</strong>.</p><div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 12px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0; color: #166534; font-size: 13px;"><strong>Client Approval Note:</strong> "${escapedNotes}"</p></div><p>You can now generate the final delivery package or export the bundle.</p>`,
      textBody: `Store proposal for "${store.name}" was approved by ${reviewerName}.\nNotes: "${notes || "None"}"\n\nAccess project: ${this.getAppBaseUrl()}/stores/${store.id}/preview`,
      metadata: { reviewerName, notes },
    });
  }

  public static async notifyChangesRequested(
    store: Store,
    reviewerName: string,
    comments: string
  ): Promise<EmailNotification> {
    const subject = `[GridRetail] Action Required: Changes Requested for ${store.name}`;
    const escapedComments = escapeHtml(comments);

    return this.sendNotification("changes_requested", store, {
      subject,
      eventTitle: "Modifications Requested by Client",
      badgeText: "Changes Requested",
      badgeColor: "#EA580C", // Orange
      messageHtml: `<p><strong>${escapeHtml(reviewerName)}</strong> reviewed the storefront demonstration for <strong>${escapeHtml(store.clientName)}</strong> and requested the following modifications:</p><blockquote style="border-left: 3px solid #EA580C; margin: 14px 0; padding-left: 14px; color: #7C2D12; background: #FFF7ED; padding: 10px; border-radius: 4px;">"${escapedComments}"</blockquote><p>Please review the comments in the customizer and adjust the storefront configuration accordingly.</p>`,
      textBody: `Changes requested by ${reviewerName} for store "${store.name}":\n\n"${comments}"\n\nReview project: ${this.getAppBaseUrl()}/stores/${store.id}/preview`,
      metadata: { reviewerName, comments },
    });
  }

  public static async notifyDeliveryStatus(
    store: Store,
    delivery: DeliveryRecord,
    recipientEmail?: string
  ): Promise<EmailNotification> {
    const isSuccess = delivery.status === "completed";
    const subject = isSuccess
      ? `[GridRetail] Delivery Package Ready: ${store.name}`
      : `[GridRetail] Delivery Failed: ${store.name}`;

    return this.sendNotification(
      isSuccess ? "delivery_completed" : "delivery_failed",
      store,
      {
        to: recipientEmail,
        subject,
        eventTitle: isSuccess ? "Delivery Package Generated" : "Delivery Package Failed",
        badgeText: isSuccess ? "Completed" : "Failed",
        badgeColor: isSuccess ? "#16A34A" : "#DC2626",
        messageHtml: isSuccess
          ? `<p>The storefront delivery package for <strong>${escapeHtml(store.name)}</strong> has been built successfully.</p><div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 13px;"><p style="margin: 0 0 6px;"><strong>Artifact:</strong> ${escapeHtml(delivery.artifactName || "ZIP")}</p><p style="margin: 0;"><strong>Checksum (SHA-256):</strong> <code style="font-size: 11px;">${escapeHtml(delivery.checksumSha256 || "N/A")}</code></p></div>`
          : `<p>An error occurred while compiling the delivery package for <strong>${escapeHtml(store.name)}</strong>: ${escapeHtml(delivery.errorMessage || "Unknown error")}</p>`,
        textBody: isSuccess
          ? `Delivery package completed for "${store.name}": ${delivery.artifactName}`
          : `Delivery failed for "${store.name}": ${delivery.errorMessage}`,
        metadata: {
          deliveryId: delivery.id,
          mode: delivery.mode,
          status: delivery.status,
        },
      }
    );
  }
}
