export type NotificationEvent =
  | "feedback_submitted"
  | "changes_requested"
  | "proposal_approved"
  | "delivery_completed"
  | "delivery_failed";

export type NotificationStatus = "queued" | "sent" | "failed" | "logged_dev";

export interface EmailNotification {
  id: string;
  to: string;
  from: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  event: NotificationEvent;
  status: NotificationStatus;
  storeId: string;
  storeName: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export interface CreateNotificationInput {
  to: string;
  from?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  event: NotificationEvent;
  storeId: string;
  storeName: string;
  metadata?: Record<string, unknown>;
}
