/**
 * GridRetail — Local Hostname & Subdomain Routing Utility
 *
 * Provides centralized URL generation, hostname resolution, subdomain parsing,
 * and deployment-format abstraction.
 */

export const RESERVED_SUBDOMAINS = [
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "login",
  "logout",
  "stores",
  "clients",
  "templates",
  "products",
  "settings",
  "new",
  "preview",
  "www",
  "localhost",
  "mail",
  "status",
  "health",
  "static",
  "assets",
  "public",
  "demo",
  "internal",
  "root",
  "staging",
  "test",
  "dev",
  "shop",
  "store",
] as const;

export type ReservedSubdomain = (typeof RESERVED_SUBDOMAINS)[number];

export interface SubdomainParseResult {
  isSubdomain: boolean;
  subdomain: string | null;
  isReserved: boolean;
  isValid: boolean;
  rawHost: string;
}

export interface StoreUrlOptions {
  mode?: "subdomain" | "path";
  hostSuffix?: string;
  port?: string;
  baseUrl?: string;
  protocol?: "http" | "https";
}

/**
 * Checks if a given subdomain string matches any reserved platform keyword.
 */
export function isReservedSubdomain(subdomain: string): boolean {
  const normalized = subdomain.toLowerCase().trim();
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(normalized);
}

/**
 * Validates whether a slug is compliant with RFC 1035 / RFC 1123 hostname rules
 * and GridRetail business constraints.
 */
export function validateHostnameSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || typeof slug !== "string") {
    return { valid: false, error: "Store slug is required." };
  }

  const normalized = slug.toLowerCase().trim();

  if (normalized.length < 3) {
    return { valid: false, error: "Store slug must be at least 3 characters long." };
  }

  // RFC 1035 restricts single label to 63 octets; GridRetail caps at 50 for clean URLs
  if (normalized.length > 50) {
    return { valid: false, error: "Store slug cannot exceed 50 characters." };
  }

  // Must consist only of lowercase letters, digits, and hyphens; cannot begin or end with hyphen
  const hostnameLabelPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!hostnameLabelPattern.test(normalized)) {
    return {
      valid: false,
      error: "Store slug must contain only lowercase alphanumeric characters and hyphens, and cannot start or end with a hyphen.",
    };
  }

  if (isReservedSubdomain(normalized)) {
    return {
      valid: false,
      error: `"${normalized}" is a reserved system keyword and cannot be used as a store subdomain.`,
    };
  }

  return { valid: true };
}

/**
 * Normalizes input text into a clean DNS-compliant hostname slug.
 */
export function normalizeHostnameSlug(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parses an incoming HTTP Host or X-Forwarded-Host header to detect if it
 * represents a local store subdomain.
 *
 * Examples:
 * - "aura-minimalist.localhost:3000" -> { isSubdomain: true, subdomain: "aura-minimalist", ... }
 * - "localhost:3000"                -> { isSubdomain: false, subdomain: null, ... }
 * - "127.0.0.1:3000"                -> { isSubdomain: false, subdomain: null, ... }
 * - "admin.localhost:3000"          -> { isSubdomain: true, subdomain: "admin", isReserved: true, ... }
 */
export function parseSubdomain(hostHeader: string, customSuffix?: string): SubdomainParseResult {
  if (!hostHeader || typeof hostHeader !== "string") {
    return {
      isSubdomain: false,
      subdomain: null,
      isReserved: false,
      isValid: false,
      rawHost: "",
    };
  }

  const rawHost = hostHeader.trim();
  // Strip port from host header (e.g. "aura-minimalist.localhost:3000" -> "aura-minimalist.localhost")
  const hostname = rawHost.split(":")[0].toLowerCase();

  // Root domain suffix for local development (defaults to "localhost")
  const suffix = (
    customSuffix ||
    process.env.GRIDRETAIL_LOCAL_HOST_SUFFIX ||
    "localhost"
  ).toLowerCase();

  // Non-subdomain loopbacks or root domain
  if (
    hostname === suffix ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    return {
      isSubdomain: false,
      subdomain: null,
      isReserved: false,
      isValid: false,
      rawHost,
    };
  }

  const expectedSuffix = `.${suffix}`;
  if (!hostname.endsWith(expectedSuffix)) {
    // Also check standard .localhost in case customSuffix is configured differently
    if (suffix !== "localhost" && hostname.endsWith(".localhost")) {
      const sub = hostname.slice(0, -".localhost".length);
      return evaluateExtractedSubdomain(sub, rawHost);
    }

    return {
      isSubdomain: false,
      subdomain: null,
      isReserved: false,
      isValid: false,
      rawHost,
    };
  }

  // Extract the subdomain label before .suffix
  const extracted = hostname.slice(0, -expectedSuffix.length);
  return evaluateExtractedSubdomain(extracted, rawHost);
}

function evaluateExtractedSubdomain(sub: string, rawHost: string): SubdomainParseResult {
  // Reject multi-level subdomains like "a.b.localhost" or empty strings
  if (!sub || sub.includes(".")) {
    return {
      isSubdomain: true,
      subdomain: sub,
      isReserved: false,
      isValid: false,
      rawHost,
    };
  }

  const isReserved = isReservedSubdomain(sub);
  const validation = validateHostnameSlug(sub);

  return {
    isSubdomain: true,
    subdomain: sub,
    isReserved,
    isValid: validation.valid,
    rawHost,
  };
}

/**
 * Centralized URL generator for storefronts.
 *
 * In local development, defaults to generating local subdomains:
 *   http://{slug}.localhost:3000
 *
 * In production or when mode="path", generates standard paths:
 *   https://gridretail.yourdomain.com/store/{slug}
 */
export function getStoreUrl(slug: string, options?: StoreUrlOptions): string {
  const normalizedSlug = normalizeHostnameSlug(slug);

  const isProduction = process.env.NODE_ENV === "production";
  const configuredMode = (process.env.GRIDRETAIL_STORE_URL_MODE as "subdomain" | "path") || undefined;
  
  // Default to subdomain in development/test, and path in production
  const mode = options?.mode || configuredMode || (isProduction ? "path" : "subdomain");

  if (mode === "subdomain") {
    const hostSuffix = options?.hostSuffix || process.env.GRIDRETAIL_LOCAL_HOST_SUFFIX || "localhost";
    const port = options?.port !== undefined ? options.port : (process.env.GRIDRETAIL_LOCAL_PORT ?? "3000");
    const protocol = options?.protocol || "http";
    const portString = port ? `:${port}` : "";

    return `${protocol}://${normalizedSlug}.${hostSuffix}${portString}`;
  }

  // Path mode
  const baseUrl = (
    options?.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  return `${baseUrl}/store/${normalizedSlug}`;
}

/**
 * Returns explicit local subdomain URL for a store.
 * e.g. http://aura-minimalist.localhost:3000
 */
export function getStoreLocalSubdomainUrl(slug: string, port?: string, hostSuffix?: string): string {
  return getStoreUrl(slug, {
    mode: "subdomain",
    port,
    hostSuffix,
    protocol: "http",
  });
}

/**
 * Returns standard path-based URL for a store.
 * e.g. http://localhost:3000/store/aura-minimalist or https://yourdomain.com/store/aura-minimalist
 */
export function getStorePathUrl(slug: string, baseUrl?: string): string {
  return getStoreUrl(slug, {
    mode: "path",
    baseUrl,
  });
}

/**
 * Computes the root application origin for redirects.
 * e.g. http://localhost:3000
 */
export function getRootOrigin(options?: { hostSuffix?: string; port?: string; baseUrl?: string }): string {
  if (options?.baseUrl) {
    return options.baseUrl.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  const hostSuffix = options?.hostSuffix || process.env.GRIDRETAIL_LOCAL_HOST_SUFFIX || "localhost";
  const port = options?.port !== undefined ? options.port : (process.env.GRIDRETAIL_LOCAL_PORT ?? "3000");
  const portString = port ? `:${port}` : "";
  return `http://${hostSuffix}${portString}`;
}
