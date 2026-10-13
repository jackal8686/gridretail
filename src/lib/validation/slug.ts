/**
 * Utility for normalizing and validating storefront URL slugs.
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  const normalized = normalizeSlug(slug);

  if (!normalized || normalized.length < 3) {
    return { valid: false, error: "Store slug must be at least 3 characters long." };
  }

  if (normalized.length > 50) {
    return { valid: false, error: "Store slug cannot exceed 50 characters." };
  }

  // Reserved keywords that cannot be used as storefront sub-paths
  const reservedSlugs = [
    "admin",
    "dashboard",
    "stores",
    "clients",
    "templates",
    "products",
    "settings",
    "api",
    "login",
    "logout",
    "new",
    "preview",
  ];

  if (reservedSlugs.includes(normalized)) {
    return { valid: false, error: `Slug "${normalized}" is a reserved system keyword.` };
  }

  return { valid: true };
}
