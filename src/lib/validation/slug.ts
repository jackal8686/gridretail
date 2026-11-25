import {
  normalizeHostnameSlug,
  validateHostnameSlug,
  RESERVED_SUBDOMAINS,
} from "@/lib/urls";

/**
 * Utility for normalizing and validating storefront URL slugs and local subdomains.
 */
export function normalizeSlug(input: string): string {
  return normalizeHostnameSlug(input);
}

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  return validateHostnameSlug(slug);
}

export { RESERVED_SUBDOMAINS };
