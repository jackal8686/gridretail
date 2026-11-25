import { CreateStoreInput, IndustryType, AppointmentIndustry } from "@/types";
import { SectionType } from "@/types/section";
import { validateSlug, normalizeSlug } from "./slug";
import { getSectionDefinition } from "@/constants/sections";
import { generateSectionId } from "@/lib/sections/id-generator";
import { validateBusinessProfile } from "./business-profile";

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

export const VALID_APPOINTMENT_INDUSTRIES: AppointmentIndustry[] = [
  "Legal Practice & Advisory",
  "Consulting & Strategy",
  "Healthcare & Medical Clinic",
  "Salon, Spa & Wellness",
  "Education & Private Tutoring",
  "Coaching & Personal Training",
  "Creative & Design Services",
  "Other Professional Services",
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

  const isAppointments = input.websiteType === "appointments";
  const isLeadGen = input.websiteType === "lead_gen";
  let resolvedIndustry = input.industry as IndustryType;
  let resolvedAppointmentIndustry = input.appointmentIndustry;

  if (isAppointments) {
    if (input.industry && VALID_APPOINTMENT_INDUSTRIES.includes(input.industry as unknown as AppointmentIndustry)) {
      resolvedAppointmentIndustry = input.industry as unknown as AppointmentIndustry;
      resolvedIndustry = "Health & Wellness"; // Safe fallback retail industry for schema compatibility
    } else if (resolvedAppointmentIndustry && VALID_APPOINTMENT_INDUSTRIES.includes(resolvedAppointmentIndustry)) {
      if (!resolvedIndustry || !VALID_INDUSTRIES.includes(resolvedIndustry)) {
        resolvedIndustry = "Health & Wellness";
      }
    } else if (!input.industry || !VALID_INDUSTRIES.includes(input.industry as IndustryType)) {
      errors.industry = "A valid professional appointment category must be selected.";
    }
  } else if (isLeadGen) {
    // For lead_gen, allow any valid industry or default to Health & Wellness/Business Services
    if (!resolvedIndustry || !VALID_INDUSTRIES.includes(resolvedIndustry)) {
      resolvedIndustry = "Health & Wellness";
    }
  } else {
    if (!input.industry || !VALID_INDUSTRIES.includes(input.industry as IndustryType)) {
      errors.industry = "A valid retail industry must be selected.";
    }
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

  // Validate custom products if provided
  const sanitizedProducts: Record<string, unknown>[] = [];
  if (Array.isArray(input.products)) {
    for (let i = 0; i < input.products.length; i++) {
      const p = input.products[i];
      if (!p || typeof p !== "object") continue;
      const pName = typeof p.name === "string" ? p.name.trim() : "";
      if (!pName) {
        errors[`products.${i}.name`] = `Product #${i + 1} must have a name.`;
      }
      const pPrice = Number(p.price);
      if (isNaN(pPrice) || pPrice < 0) {
        errors[`products.${i}.price`] = `Product #${i + 1} must have a valid positive price.`;
      }
      const pCategory = typeof p.category === "string" ? p.category.trim() : "";
      if (!pCategory) {
        errors[`products.${i}.category`] = `Product #${i + 1} must have a category.`;
      }

      sanitizedProducts.push({
        ...p,
        name: pName,
        price: isNaN(pPrice) ? 0 : pPrice,
        category: pCategory,
        description: typeof p.description === "string" ? p.description.trim() : "",
        sku:
          typeof p.sku === "string" && p.sku.trim()
            ? p.sku.trim()
            : `${normalizeSlug(rawSlug).substring(0, 4).toUpperCase()}-${pCategory.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        stockStatus: p.stockStatus || "In Stock",
        currency: p.currency || "INR",
        status: p.status || "active",
        imageUrl: typeof p.imageUrl === "string" ? p.imageUrl.trim() : undefined,
        compareAtPrice: typeof p.compareAtPrice === "number" ? p.compareAtPrice : undefined,
        variants: Array.isArray(p.variants) ? p.variants : undefined,
        specifications: p.specifications,
      });
    }
  }

  // Sanitize categories if provided
  const sanitizedCategories = Array.isArray(input.categories)
    ? input.categories
        .filter((cat) => cat && typeof cat.name === "string" && cat.name.trim().length > 0)
        .map((cat, idx) => ({
          id: cat.id || `cat_${idx}_${normalizeSlug(cat.name)}`,
          name: cat.name.trim(),
          slug: cat.slug ? normalizeSlug(cat.slug) : normalizeSlug(cat.name),
          description: cat.description?.trim() || "",
          order: typeof cat.order === "number" ? cat.order : idx,
        }))
    : [];

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  let sanitizedBusinessProfile = undefined;
  if (input.businessProfile) {
    const bpResult = validateBusinessProfile(input.businessProfile);
    if (bpResult.valid && bpResult.sanitized) {
      sanitizedBusinessProfile = bpResult.sanitized;
    }
  }

  // Sanitize sections if provided
  const sanitizedSections = Array.isArray(input.sections)
    ? input.sections
        .filter((sec) => sec && typeof sec.type === "string" && getSectionDefinition(sec.type as SectionType))
        .map((sec, idx) => ({
          id: typeof sec.id === "string" && sec.id.trim() ? sec.id.trim() : generateSectionId(sec.type),
          type: sec.type,
          layoutVariant: typeof sec.layoutVariant === "string" ? sec.layoutVariant : undefined,
          visible: sec.visible !== false,
          order: typeof sec.order === "number" ? sec.order : idx,
          settings: sec.settings && typeof sec.settings === "object" ? sec.settings : {},
          customTitle: typeof sec.customTitle === "string" ? sec.customTitle.trim() : undefined,
        }))
    : undefined;

  // Sanitize styling if provided
  const sanitizedStyling = input.styling && typeof input.styling === "object"
    ? {
        buttonRadius: ["sharp", "rounded", "pill"].includes(input.styling.buttonRadius as string)
          ? input.styling.buttonRadius
          : undefined,
        cardStyle: ["flat", "bordered", "elevated", "floating"].includes(input.styling.cardStyle as string)
          ? input.styling.cardStyle
          : undefined,
        headerSticky: typeof input.styling.headerSticky === "boolean" ? input.styling.headerSticky : undefined,
        headerStyle: ["standard", "translucent", "minimal"].includes(input.styling.headerStyle as string)
          ? input.styling.headerStyle
          : undefined,
        contentWidth: ["compact", "normal", "wide"].includes(input.styling.contentWidth as string)
          ? input.styling.contentWidth
          : undefined,
        spacingDensity: ["compact", "normal", "spacious"].includes(input.styling.spacingDensity as string)
          ? input.styling.spacingDensity
          : undefined,
        typographyHeadingFont: typeof input.styling.typographyHeadingFont === "string" ? input.styling.typographyHeadingFont.trim() : undefined,
        typographyBodyFont: typeof input.styling.typographyBodyFont === "string" ? input.styling.typographyBodyFont.trim() : undefined,
      }
    : undefined;

  const sanitized: CreateStoreInput = {
    name: input.name!.trim(),
    slug: normalizeSlug(rawSlug),
    clientId: input.clientId!.trim(),
    industry: resolvedIndustry,
    templateId: input.templateId!.trim(),
    description: input.description?.trim() || "",
    branding: {
      primaryColor: input.branding?.primaryColor || "#176B4D",
      secondaryColor: input.branding?.secondaryColor || "#FAF9F6",
      fontFamily: input.branding?.fontFamily || "Inter, sans-serif",
      heroHeadline: input.branding?.heroHeadline?.trim(),
      heroSubheadline: input.branding?.heroSubheadline?.trim(),
      logoUrl: input.branding?.logoUrl?.trim() || undefined,
      bannerUrl: input.branding?.bannerUrl?.trim() || undefined,
      aboutText: input.branding?.aboutText?.trim() || undefined,
      ctaText: input.branding?.ctaText?.trim() || undefined,
    },
    enabledSections: input.enabledSections || ["hero", "featured_products", "about", "footer"],
    orderedSections: input.orderedSections,
    selectedProductIds: input.selectedProductIds || [],
    themeId: input.themeId?.trim(),
    themeName: input.themeName?.trim(),
    categories: sanitizedCategories,
    products: sanitizedProducts,
    sections: sanitizedSections,
    styling: sanitizedStyling,
    seo: input.seo,
    websiteType: input.websiteType || "ecommerce",
    appointmentIndustry: resolvedAppointmentIndustry,
    appointmentConfig: input.appointmentConfig,
    initialServices: Array.isArray(input.initialServices) ? input.initialServices : undefined,
    initialProviders: Array.isArray(input.initialProviders) ? input.initialProviders : undefined,
    leadTemplateId: typeof input.leadTemplateId === "string" ? input.leadTemplateId.trim() : undefined,
    leadFormTitle: typeof input.leadFormTitle === "string" ? input.leadFormTitle.trim() : undefined,
    businessProfile: sanitizedBusinessProfile,
  };

  return { valid: true, errors: {}, sanitized };
}

