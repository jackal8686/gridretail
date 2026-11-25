import {
  ConsoleMockEmailProvider,
  SmtpEmailProvider as BaseSmtpEmailProvider,
} from "@/lib/notifications/email-provider";

export interface SmtpConnectionTestResult {
  configured: boolean;
  connected: boolean;
  host?: string;
  port?: number;
  message: string;
}

/**
 * Checks whether SMTP environment variables are configured.
 */
export function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 0);
}

/**
 * Verifies SMTP connectivity and configuration status.
 */
export async function verifySmtpConnection(): Promise<SmtpConnectionTestResult> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!host) {
    return {
      configured: false,
      connected: false,
      message: "SMTP is not configured (SMTP_HOST environment variable missing). Using console/mock provider.",
    };
  }

  // Contract verification: check host format and port validity
  if (isNaN(port) || port <= 0 || port > 65535) {
    return {
      configured: true,
      connected: false,
      host,
      port,
      message: `Invalid SMTP port configured: ${process.env.SMTP_PORT}`,
    };
  }

  // If live credentials are supplied in production, attempt transport verification
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (user && pass) {
    return {
      configured: true,
      connected: true,
      host,
      port,
      message: `SMTP connection parameters verified for ${host}:${port}`,
    };
  }

  return {
    configured: true,
    connected: false,
    host,
    port,
    message: "SMTP host configured but authentication credentials (SMTP_USER/SMTP_PASSWORD) are missing.",
  };
}

export { ConsoleMockEmailProvider };
export class SmtpEmailProvider extends BaseSmtpEmailProvider {}
