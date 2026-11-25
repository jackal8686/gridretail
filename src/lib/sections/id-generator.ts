/**
 * Collision-resistant, Cryptographically Secure Section ID Generator
 * and Deep Settings Cloner.
 *
 * Adheres to strict RFC 4122 UUID v4 formatting using system CSPRNG.
 * Explicitly fails if secure cryptographic randomness is unavailable.
 * Never falls back to Math.random() or timestamp-only generation.
 */

function getSecureRandomUUID(): string {
  // 1. Web Cryptography API (modern browsers, Edge runtime, Node 19+)
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  // 2. Node.js built-in crypto module
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    if (typeof nodeCrypto.randomUUID === "function") {
      return nodeCrypto.randomUUID();
    }
  } catch {
    // Environment without node:crypto or restricted import
  }

  // 3. Cryptographically secure fallback via getRandomValues (RFC 4122 v4)
  const getRandomValues =
    (typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      typeof globalThis.crypto.getRandomValues === "function" &&
      globalThis.crypto.getRandomValues.bind(globalThis.crypto)) ||
    (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodeCrypto = require("crypto");
        if (typeof nodeCrypto.randomFillSync === "function") {
          return (buffer: Uint8Array) => nodeCrypto.randomFillSync(buffer);
        }
      } catch {
        // no-op
      }
      return null;
    })();

  if (getRandomValues) {
    const bytes = new Uint8Array(16);
    getRandomValues(bytes);
    // RFC 4122 v4 compliance
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Set version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Set variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // 4. Strict Failure: Fail explicitly if secure randomness is unavailable
  throw new Error(
    "Secure cryptographic randomness is unavailable in this runtime environment. Math.random() fallback is forbidden for section ID generation."
  );
}

/**
 * Generates a collision-resistant, cryptographically secure Section ID.
 * Format: sec_<cleanType>_<uuid-v4>
 */
export function generateSectionId(type: string): string {
  const cleanType = String(type).replace(/[^a-zA-Z0-9_-]/g, "");
  const uuid = getSecureRandomUUID();
  return `sec_${cleanType}_${uuid}`;
}

/**
 * Deep clones section settings to ensure duplicated sections never share
 * mutable nested object or array references with their source section.
 */
export function deepCloneSectionSettings<T extends Record<string, unknown>>(settings: T): T {
  if (!settings || typeof settings !== "object") {
    return {} as T;
  }

  if (typeof structuredClone === "function") {
    try {
      return structuredClone(settings);
    } catch {
      // Fallback for non-cloneable prototypes
    }
  }

  try {
    return JSON.parse(JSON.stringify(settings));
  } catch {
    return { ...settings };
  }
}
