import { CreateStoreInput, IndustryType } from "@/types";
import { validateSlug, normalizeSlug } from "./slug";

const VALID_INDUSTRIES: IndustryType[] = [
  "Fashion & Apparel",
  "Electronics & Gadgets",
  "Home & Living",
  "Beauty & Cosmetics",
  "Food & Gourmet",
  "Health & Wellness",
  "Luxury Goods",
  "Sports & Outdoors",
];

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function validateStoreInput(input: Partial<CreateStoreInput>): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: CreateStoreInput;
} {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length < 2) {
    errors.name = "Store name must be at least 2 characters long.";
  } else if (input.name.trim().length > 80) {
    errors.name = "Store name cannot exceed 80 characters.";
  }

  const rawSlug = input.slug ? input.slug : input.name ? input.name : "";
  const slugValidation = validateSlug(rawSlug);
  if (!slugValidation.valid) {
    errors.slug = slugValidation.error || "Invalid slug.";
  }

  if (!input.clientId || input.clientId.trim().length === 0) {
    errors.clientId = "A client account must be selected.";
  }

  if (!input.industry || !VALID_INDUSTRIES.includes(input.industry as IndustryType)) {
    errors.industry = "A valid retail industry must be selected.";
  }

  if (!input.templateId || input.templateId.trim().length === 0) {
    errors.templateId = "A storefront template must be selected.";
  }

  if (input.branding?.primaryColor && !HEX_COLOR_REGEX.test(input.branding.primaryColor)) {
    errors.primaryColor = "Primary brand color must be a valid hex code (e.g. #176B4D).";
  }

  if (input.branding?.secondaryColor && !HEX_COLOR_REGEX.test(input.branding.secondaryColor)) {
    errors.secondaryColor = "Secondary brand color must be a valid hex code.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const sanitized: CreateStoreInput = {
    name: input.name!.trim(),
    slug: normalizeSlug(rawSlug),
    clientId: input.clientId!.trim(),
    industry: input.industry as IndustryType,
    templateId: input.templateId!.trim(),
    description: input.description?.trim() || "",
    branding: {
      primaryColor: input.branding?.primaryColor || "#176B4D",
      secondaryColor: input.branding?.secondaryColor || "#FAF9F6",
      fontFamily: input.branding?.fontFamily || "Inter, sans-serif",
      heroHeadline: input.branding?.heroHeadline?.trim(),
      heroSubheadline: input.branding?.heroSubheadline?.trim(),
    },
    enabledSections: input.enabledSections || ["hero", "featured_products", "about", "footer"],
    selectedProductIds: input.selectedProductIds || [],
  };

  return { valid: true, errors: {}, sanitized };
}
