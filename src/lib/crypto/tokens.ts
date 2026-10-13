import crypto from "crypto";

/**
 * Generates a cryptographically secure random url-safe token with high entropy (48 bytes / 64 characters)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Computes a SHA-256 hash of the bearer token for safe persistent storage
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Timing-safe token hash comparison
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
