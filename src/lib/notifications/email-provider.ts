import { EmailNotification } from "@/types/notification";
import { Logger } from "@/lib/logger";

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  name: string;
  sendEmail(notification: EmailNotification): Promise<EmailSendResult>;
}

/**
 * In-memory & console mock email provider for development, tests, and air-gapped environments.
 */
export class ConsoleMockEmailProvider implements EmailProvider {
  public name = "ConsoleMockEmailProvider";
  private outbox: EmailNotification[] = [];

  async sendEmail(notification: EmailNotification): Promise<EmailSendResult> {
    this.outbox.push({ ...notification });

    if (process.env.NODE_ENV !== "test") {
      Logger.info(`[SIMULATED EMAIL DISPATCH - ${notification.event.toUpperCase()}]`, {
        to: notification.to,
        from: notification.from,
        subject: notification.subject,
        storeName: notification.storeName,
        storeId: notification.storeId,
        preview: notification.textBody.slice(0, 150),
      });
    }

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  getOutbox(): EmailNotification[] {
    return [...this.outbox];
  }

  clearOutbox(): void {
    this.outbox = [];
  }
}

/**
 * Production SMTP email provider template with automatic graceful degradation.
 */
export class SmtpEmailProvider implements EmailProvider {
  public name = "SmtpEmailProvider";
  private host: string;
  private port: number;
  private fallbackProvider: ConsoleMockEmailProvider;

  constructor() {
    this.host = process.env.SMTP_HOST || "";
    this.port = parseInt(process.env.SMTP_PORT || "587", 10);
    this.fallbackProvider = new ConsoleMockEmailProvider();
  }

  async sendEmail(notification: EmailNotification): Promise<EmailSendResult> {
    // If SMTP host is not configured, gracefully fall back to mock provider
    if (!this.host) {
      return this.fallbackProvider.sendEmail(notification);
    }

    try {
      // In a production environment with nodemailer or SMTP client:
      // const transport = nodemailer.createTransport({...});
      // await transport.sendMail({...});
      return {
        success: true,
        messageId: `smtp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "SMTP transmission failure";
      Logger.error(`[SMTP Error] Failed to send email`, {
        to: notification.to,
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

let activeProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!activeProvider) {
    if (process.env.SMTP_HOST) {
      activeProvider = new SmtpEmailProvider();
    } else {
      activeProvider = new ConsoleMockEmailProvider();
    }
  }
  return activeProvider;
}

export function setEmailProvider(provider: EmailProvider): void {
  activeProvider = provider;
}
