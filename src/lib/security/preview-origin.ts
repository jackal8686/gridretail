/**
 * GridRetail — Preview Security and postMessage Validation
 *
 * Provides strict origin verification, message schema validation,
 * URL sanitization, and CSS property hardening for the live preview iframe.
 */

import { DESIGN_TEMPLATES } from "@/constants/design-templates";
import { COLOR_THEMES } from "@/constants/themes";
import { PreviewUpdatePayload } from "@/types";

const ALLOWED_MESSAGE_TYPES = [
  "GRIDRETAIL_PREVIEW_READY",
  "GRIDRETAIL_PREVIEW_UPDATE",
  "GRIDRETAIL_PREVIEW_ACK",
  "GRIDRETAIL_SECTION_SELECT",
  "GRIDRETAIL_INLINE_UPDATE",
] as const;

export type PreviewMessageType = (typeof ALLOWED_MESSAGE_TYPES)[number];

const VALID_TEMPLATE_IDS = new Set(DESIGN_TEMPLATES.map((t) => t.id));
const VALID_THEME_IDS = new Set(COLOR_THEMES.map((t) => t.id));

export const SECTION_ID_REGEX = /^sec_[a-zA-Z0-9_-]{1,100}$/;

export const ALLOWED_INLINE_FIELDS = new Set([
  "headline",
  "subheadline",
  "ctaText",
  "title",
  "subtitle",
  "description",
  "badge",
  "eyebrow",
  "buttonText",
  "aboutText",
  "bodyParagraph1",
  "bodyParagraph2",
]);

/**
 * Validates whether a postMessage event origin is trusted.
 * Replaces insecure `.includes("localhost")` or empty-origin allowances
 * with strict URL parsing and RFC-compliant domain matching.
 */
export function isAllowedPreviewOrigin(
  origin: string,
  expectedPort?: string | number
): boolean {
  if (!origin || typeof origin !== "string") {
    return false;
  }

  // Reject opaque / "null" origins
  if (origin === "null" || origin.trim() === "") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  // Only http and https protocols are permissible
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  // In-browser self-origin match is always trusted
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    if (parsed.origin === window.location.origin) {
      return true;
    }
  }

  const isProduction = process.env.NODE_ENV === "production";
  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port;

  // In production: only allow exact match with configured origins
  if (isProduction) {
    const configuredOrigins: string[] = [];
    if (process.env.NEXTAUTH_URL) {
      try {
        configuredOrigins.push(new URL(process.env.NEXTAUTH_URL).origin);
      } catch {
        // ignore invalid env URL
      }
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        configuredOrigins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
      } catch {
        // ignore invalid env URL
      }
    }

    if (configuredOrigins.includes(parsed.origin)) {
      return true;
    }

    // Reject non-whitelisted origins in production
    return false;
  }

  // In development / testing:
  // Strictly allow:
  // 1. exact "localhost"
  // 2. exact "127.0.0.1"
  // 3. RFC-compliant single-level subdomain "*.localhost" (e.g. "aura-minimalist.localhost")
  const isExactLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const isSubdomainLocalhost =
    hostname.endsWith(".localhost") &&
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.localhost$/.test(hostname);

  if (!isExactLocalhost && !isSubdomainLocalhost) {
    // Rejects "attacker-localhost.com", "localhost.evil.com", "127.0.0.1.attacker.com", etc.
    return false;
  }

  // If a specific expected port is given, enforce exact port matching
  if (expectedPort !== undefined && expectedPort !== "") {
    return String(port) === String(expectedPort);
  }

  // If in browser and current window has a port, match it
  if (typeof window !== "undefined" && window.location && window.location.port) {
    return port === window.location.port;
  }

  // Default allowed dev ports
  const allowedDevPorts = new Set(["", "3000", "3001", "3002"]);
  if (process.env.PORT) allowedDevPorts.add(process.env.PORT);
  if (process.env.GRIDRETAIL_LOCAL_PORT) allowedDevPorts.add(process.env.GRIDRETAIL_LOCAL_PORT);

  return allowedDevPorts.has(port);
}

/**
 * Validates that an image or media URL is safe and cannot execute script payloads.
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmed = url.trim();
  if (trimmed === "") return false;

  // Relative paths are safe if they do not use protocol-relative "//" or directory traversal
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
      return false;
    }
    return true;
  }

  // Whitelist safe protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return false;
  }

  // Data URIs: strictly allow image media types only
  if (lower.startsWith("data:")) {
    return /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(
      trimmed
    );
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitizes CSS property strings or styling token overrides to prevent CSS injection.
 */
export function sanitizeCssValue(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "";

  let sanitized = value.trim();

  // Strip script/style tag pairs and contents
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/<\/?script[^>]*>/gi, "");

  // Strip dangerous CSS directives
  sanitized = sanitized
    .replace(/expression\s*\([^;]*\)?/gi, "")
    .replace(/javascript\s*:[^;]*/gi, "")
    .replace(/vbscript\s*:[^;]*/gi, "")
    .replace(/behavior\s*:\s*[^;]*;?/gi, "");

  return sanitized.trim();
}

/**
 * Validates and sanitizes a live preview postMessage event payload.
 */
export function validatePreviewMessage(data: unknown): {
  valid: boolean;
  type?: PreviewMessageType;
  slug?: string;
  payload?: PreviewUpdatePayload;
  timestamp?: number;
  sectionId?: string;
  inlineUpdate?: { sectionId: string; field: string; value: string };
  error?: string;
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, error: "Message data must be a non-null object." };
  }

  const msg = data as Record<string, unknown>;
  if (typeof msg.type !== "string") {
    return { valid: false, error: "Message type is missing or not a string." };
  }

  if (!(ALLOWED_MESSAGE_TYPES as readonly string[]).includes(msg.type)) {
    return { valid: false, error: `Unsupported message type: ${msg.type}` };
  }

  const type = msg.type as PreviewMessageType;

  if (type === "GRIDRETAIL_PREVIEW_READY") {
    const slug = typeof msg.slug === "string" ? msg.slug.trim() : undefined;
    return { valid: true, type, slug };
  }

  if (type === "GRIDRETAIL_PREVIEW_ACK") {
    const timestamp = typeof msg.timestamp === "number" ? msg.timestamp : Date.now();
    return { valid: true, type, timestamp };
  }

  if (type === "GRIDRETAIL_SECTION_SELECT") {
    if (typeof msg.sectionId !== "string" || !SECTION_ID_REGEX.test(msg.sectionId)) {
      return { valid: false, error: "Invalid sectionId format." };
    }
    const sectionId = sanitizeCssValue(msg.sectionId);
    return { valid: true, type, sectionId };
  }

  if (type === "GRIDRETAIL_INLINE_UPDATE") {
    if (typeof msg.sectionId !== "string" || !SECTION_ID_REGEX.test(msg.sectionId)) {
      return { valid: false, error: "Invalid sectionId format for inline update." };
    }
    if (typeof msg.field !== "string" || !ALLOWED_INLINE_FIELDS.has(msg.field)) {
      return { valid: false, error: `Unauthorized inline field: ${String(msg.field)}` };
    }
    if (typeof msg.value !== "string") {
      return { valid: false, error: "Inline update value must be a string." };
    }
    const sectionId = sanitizeCssValue(msg.sectionId);
    const field = msg.field;
    const value = sanitizeCssValue(msg.value.slice(0, 1000));
    return { valid: true, type, inlineUpdate: { sectionId, field, value } };
  }

  // Type is GRIDRETAIL_PREVIEW_UPDATE
  if (!msg.payload || typeof msg.payload !== "object" || Array.isArray(msg.payload)) {
    return { valid: false, error: "GRIDRETAIL_PREVIEW_UPDATE must contain a valid payload object." };
  }

  const rawPayload = msg.payload as Record<string, unknown>;
  const cleanPayload: PreviewUpdatePayload = {};

  // Template ID validation
  if (typeof rawPayload.templateId === "string") {
    const tid = rawPayload.templateId.trim();
    if (VALID_TEMPLATE_IDS.has(tid) || tid.startsWith("tmpl_") || tid.startsWith("tpl_")) {
      cleanPayload.templateId = tid;
    }
  }

  // Theme ID validation
  if (typeof rawPayload.themeId === "string") {
    const thid = rawPayload.themeId.trim();
    if (VALID_THEME_IDS.has(thid) || thid.startsWith("theme_") || thid.startsWith("tpl_")) {
      cleanPayload.themeId = thid;
    }
  }

  // Name validation
  if (typeof rawPayload.name === "string") {
    cleanPayload.name = rawPayload.name.slice(0, 100);
  }

  // Branding validation
  if (rawPayload.branding && typeof rawPayload.branding === "object" && !Array.isArray(rawPayload.branding)) {
    const rawB = rawPayload.branding as Record<string, unknown>;
    const cleanB: NonNullable<PreviewUpdatePayload["branding"]> = {};

    if (typeof rawB.primaryColor === "string") cleanB.primaryColor = sanitizeCssValue(rawB.primaryColor);
    if (typeof rawB.secondaryColor === "string") cleanB.secondaryColor = sanitizeCssValue(rawB.secondaryColor);
    if (typeof rawB.fontFamily === "string") cleanB.fontFamily = sanitizeCssValue(rawB.fontFamily);
    if (typeof rawB.heroHeadline === "string") cleanB.heroHeadline = rawB.heroHeadline.slice(0, 200);
    if (typeof rawB.heroSubheadline === "string") cleanB.heroSubheadline = rawB.heroSubheadline.slice(0, 500);
    if (typeof rawB.aboutText === "string") cleanB.aboutText = rawB.aboutText.slice(0, 2000);
    if (typeof rawB.ctaText === "string") cleanB.ctaText = rawB.ctaText.slice(0, 50);

    // Media URLs sanitization
    if (typeof rawB.logoUrl === "string") {
      cleanB.logoUrl = isSafeUrl(rawB.logoUrl) ? rawB.logoUrl.trim() : "";
    }
    if (typeof rawB.bannerUrl === "string") {
      cleanB.bannerUrl = isSafeUrl(rawB.bannerUrl) ? rawB.bannerUrl.trim() : "";
    }

    cleanPayload.branding = cleanB;
  }

  // Section arrays validation
  if (Array.isArray(rawPayload.enabledSections)) {
    cleanPayload.enabledSections = rawPayload.enabledSections.filter(
      (s): s is string => typeof s === "string"
    );
  }

  if (Array.isArray(rawPayload.orderedSections)) {
    cleanPayload.orderedSections = rawPayload.orderedSections.filter(
      (s): s is string => typeof s === "string"
    );
  }

  if (Array.isArray(rawPayload.sections)) {
    cleanPayload.sections = rawPayload.sections.filter(
      (s): s is NonNullable<PreviewUpdatePayload["sections"]>[number] =>
        Boolean(s && typeof s === "object")
    );
  }

  // Styling validation
  if (rawPayload.styling && typeof rawPayload.styling === "object" && !Array.isArray(rawPayload.styling)) {
    const rawS = rawPayload.styling as Record<string, unknown>;
    const cleanS: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(rawS)) {
      if (typeof val === "string") {
        cleanS[key] = sanitizeCssValue(val);
      } else if (typeof val === "number" || typeof val === "boolean") {
        cleanS[key] = val;
      }
    }
    cleanPayload.styling = cleanS as PreviewUpdatePayload["styling"];
  }

  return { valid: true, type, payload: cleanPayload };
}
