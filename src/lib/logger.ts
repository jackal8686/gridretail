import crypto from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
}

export function generateCorrelationId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "auth_secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "cancellationtoken",
  "cancellationtokenhash",
  "cancellationurl",
  "cancellationpath",
  "customername",
  "customeremail",
  "customerphone",
  "customernotes",
  "adminnotes",
]);

/**
 * Redacts raw cryptographic tokens, cancellation paths, emails, and phone numbers in strings.
 */
export function sanitizeString(str: string): string {
  if (!str) return str;
  return str
    .replace(/\/appointments\/[a-f0-9]{32,64}\/cancel/gi, "/appointments/[REDACTED_TOKEN]/cancel")
    .replace(/\b[a-f0-9]{64}\b/gi, "[REDACTED_HEX_TOKEN]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\+?\d{1,3}?[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, (match) => {
      // Only redact if string contains at least 7 digits (avoid matching short numbers)
      const digits = match.replace(/\D/g, "");
      return digits.length >= 7 ? "[REDACTED_PHONE]" : match;
    });
}

function sanitizeValue(val: unknown): unknown {
  if (typeof val === "string") {
    return sanitizeString(val);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (typeof val === "object" && val !== null) {
    return sanitizeContext(val as Record<string, unknown>);
  }
  return val;
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(context)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeValue(val);
    }
  }

  return sanitized;
}

export class Logger {
  public static sanitizeString(str: string): string {
    return sanitizeString(str);
  }

  public static sanitize(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    return sanitizeContext(context);
  }

  private static formatLog(entry: LogEntry): string {
    if (process.env.NODE_ENV === "production") {
      return JSON.stringify(entry);
    }
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]${
      entry.correlationId ? ` [${entry.correlationId}]` : ""
    }`;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const errorStr = entry.error ? ` | Error: ${entry.error}` : "";
    return `${prefix} ${entry.message}${contextStr}${errorStr}`;
  }

  public static info(message: string, context?: Record<string, unknown>, correlationId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      correlationId,
      message: sanitizeString(message),
      context: sanitizeContext(context),
    };
    console.log(this.formatLog(entry));
  }

  public static warn(message: string, context?: Record<string, unknown>, correlationId?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "warn",
      correlationId,
      message: sanitizeString(message),
      context: sanitizeContext(context),
    };
    console.warn(this.formatLog(entry));
  }

  public static error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
    correlationId?: string
  ) {
    const rawError = error instanceof Error ? error.message : error ? String(error) : undefined;
    const errorMsg = rawError ? sanitizeString(rawError) : undefined;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      correlationId,
      message: sanitizeString(message),
      context: sanitizeContext(context),
      error: errorMsg,
    };
    console.error(this.formatLog(entry));
  }
}
