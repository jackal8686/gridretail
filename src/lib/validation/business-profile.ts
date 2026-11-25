import {
  BusinessProfile,
  BusinessOffering,
  GenuineTestimonial,
  GenuineTeamMember,
  BusinessFaqItem,
  CommunicationStyle,
  BrandPersonality,
  VisualStylePreference,
  TypographyPreference,
} from "@/types/business-profile";
import { WebsiteType } from "@/types/appointment";

const VALID_WEBSITE_TYPES: WebsiteType[] = ["ecommerce", "appointments", "lead_gen"];

const VALID_COMMUNICATION_STYLES: CommunicationStyle[] = [
  "authoritative",
  "approachable",
  "luxurious",
  "technical",
  "creative",
  "compassionate",
];

const VALID_BRAND_PERSONALITIES: BrandPersonality[] = [
  "professional",
  "innovative",
  "artisanal",
  "authoritative",
  "compassionate",
  "playful",
  "minimalist",
];

const VALID_VISUAL_STYLES: VisualStylePreference[] = [
  "modern_minimal",
  "luxury_refined",
  "bold_assertive",
  "organic_warm",
  "tech_futuristic",
  "classic_corporate",
  "editorial_story",
  "playful_vibrant",
];

const VALID_TYPOGRAPHY: TypographyPreference[] = [
  "clean_sans",
  "editorial_serif",
  "technical_mono",
  "humanist_sans",
];

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function validateBusinessProfile(input: unknown): {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: BusinessProfile;
} {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== "object") {
    return {
      valid: false,
      errors: { profile: "Business profile must be a valid object." },
    };
  }

  const raw = input as Record<string, unknown>;

  // Business Name
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  if (!businessName || businessName.length < 2) {
    errors.businessName = "Business name must be at least 2 characters long.";
  } else if (businessName.length > 100) {
    errors.businessName = "Business name cannot exceed 100 characters.";
  }

  // Industry
  const industry = typeof raw.industry === "string" ? raw.industry.trim() : "";
  if (!industry || industry.length < 2) {
    errors.industry = "Industry must be specified.";
  }

  // Business Category
  const businessCategory = typeof raw.businessCategory === "string" && raw.businessCategory.trim()
    ? raw.businessCategory.trim()
    : industry || "General Business";

  // Description
  const description = typeof raw.description === "string" ? raw.description.trim() : "";

  // Website Type
  const websiteType = raw.websiteType as WebsiteType;
  if (!VALID_WEBSITE_TYPES.includes(websiteType)) {
    errors.websiteType = "Website type must be 'ecommerce', 'appointments', or 'lead_gen'.";
  }

  // Communication Style
  const communicationStyle =
    typeof raw.communicationStyle === "string" && VALID_COMMUNICATION_STYLES.includes(raw.communicationStyle as CommunicationStyle)
      ? (raw.communicationStyle as CommunicationStyle)
      : undefined;

  // Brand Personality
  const brandPersonality =
    typeof raw.brandPersonality === "string" && VALID_BRAND_PERSONALITIES.includes(raw.brandPersonality as BrandPersonality)
      ? (raw.brandPersonality as BrandPersonality)
      : undefined;

  // Visual Style
  const visualStyle =
    typeof raw.visualStyle === "string" && VALID_VISUAL_STYLES.includes(raw.visualStyle as VisualStylePreference)
      ? (raw.visualStyle as VisualStylePreference)
      : undefined;

  // Typography Preference
  const typographyPreference =
    typeof raw.typographyPreference === "string" && VALID_TYPOGRAPHY.includes(raw.typographyPreference as TypographyPreference)
      ? (raw.typographyPreference as TypographyPreference)
      : undefined;

  // Colors
  const primaryColor =
    typeof raw.primaryColor === "string" && HEX_COLOR_REGEX.test(raw.primaryColor.trim())
      ? raw.primaryColor.trim()
      : undefined;

  const secondaryColor =
    typeof raw.secondaryColor === "string" && HEX_COLOR_REGEX.test(raw.secondaryColor.trim())
      ? raw.secondaryColor.trim()
      : undefined;

  // Offerings
  const sanitizedOfferings: BusinessOffering[] = [];
  if (Array.isArray(raw.offerings)) {
    for (const item of raw.offerings) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) continue;
      sanitizedOfferings.push({
        id: typeof o.id === "string" ? o.id.trim() : undefined,
        name,
        description: typeof o.description === "string" ? o.description.trim() : "",
        price: typeof o.price === "number" || typeof o.price === "string" ? o.price : undefined,
        isKeyDifferentiator: Boolean(o.isKeyDifferentiator),
        category: typeof o.category === "string" ? o.category.trim() : undefined,
      });
    }
  }

  // Key Features & Differentiators
  const keyFeatures = Array.isArray(raw.keyFeatures)
    ? raw.keyFeatures.filter((f): f is string => typeof f === "string" && f.trim().length > 0).map((f) => f.trim())
    : undefined;

  const differentiators = Array.isArray(raw.differentiators)
    ? raw.differentiators.filter((d): d is string => typeof d === "string" && d.trim().length > 0).map((d) => d.trim())
    : undefined;

  const customerNeeds = Array.isArray(raw.customerNeeds)
    ? raw.customerNeeds.filter((n): n is string => typeof n === "string" && n.trim().length > 0).map((n) => n.trim())
    : undefined;

  // Contact Info
  let contactInfo: BusinessProfile["contactInfo"] = undefined;
  if (raw.contactInfo && typeof raw.contactInfo === "object") {
    const c = raw.contactInfo as Record<string, unknown>;
    contactInfo = {
      email: typeof c.email === "string" ? c.email.trim() : undefined,
      phone: typeof c.phone === "string" ? c.phone.trim() : undefined,
      address: typeof c.address === "string" ? c.address.trim() : undefined,
      city: typeof c.city === "string" ? c.city.trim() : undefined,
      region: typeof c.region === "string" ? c.region.trim() : undefined,
      country: typeof c.country === "string" ? c.country.trim() : undefined,
      postalCode: typeof c.postalCode === "string" ? c.postalCode.trim() : undefined,
      businessHours: typeof c.businessHours === "string" ? c.businessHours.trim() : undefined,
    };
  }

  // FAQs
  const sanitizedFaqs: BusinessFaqItem[] = [];
  if (Array.isArray(raw.faqs)) {
    for (const f of raw.faqs) {
      if (!f || typeof f !== "object") continue;
      const faq = f as Record<string, unknown>;
      const question = typeof faq.question === "string" ? faq.question.trim() : "";
      const answer = typeof faq.answer === "string" ? faq.answer.trim() : "";
      if (question && answer) {
        sanitizedFaqs.push({ question, answer });
      }
    }
  }

  // Genuine Testimonials
  const sanitizedTestimonials: GenuineTestimonial[] = [];
  if (Array.isArray(raw.testimonials)) {
    for (const t of raw.testimonials) {
      if (!t || typeof t !== "object") continue;
      const test = t as Record<string, unknown>;
      const quote = typeof test.quote === "string" ? test.quote.trim() : "";
      const author = typeof test.author === "string" ? test.author.trim() : "";
      if (quote && author) {
        sanitizedTestimonials.push({
          quote,
          author,
          roleOrCompany: typeof test.roleOrCompany === "string" ? test.roleOrCompany.trim() : undefined,
          verified: test.verified === true,
        });
      }
    }
  }

  // Team Members
  const sanitizedTeam: GenuineTeamMember[] = [];
  if (Array.isArray(raw.teamMembers)) {
    for (const m of raw.teamMembers) {
      if (!m || typeof m !== "object") continue;
      const mem = m as Record<string, unknown>;
      const name = typeof mem.name === "string" ? mem.name.trim() : "";
      const role = typeof mem.role === "string" ? mem.role.trim() : "";
      if (name && role) {
        sanitizedTeam.push({
          name,
          role,
          bio: typeof mem.bio === "string" ? mem.bio.trim() : undefined,
          avatarUrl: typeof mem.avatarUrl === "string" ? mem.avatarUrl.trim() : undefined,
        });
      }
    }
  }

  // Certifications
  const sanitizedCertifications: Array<import("@/types/business-profile").BusinessCertification | string> = [];
  if (Array.isArray(raw.certifications)) {
    for (const c of raw.certifications) {
      if (typeof c === "string" && c.trim()) {
        sanitizedCertifications.push(c.trim());
      } else if (c && typeof c === "object") {
        const certObj = c as Record<string, unknown>;
        const name = typeof certObj.name === "string" ? certObj.name.trim() : "";
        if (!name) continue;
        // SECURITY / PROVENANCE ENFORCEMENT:
        // Ordinary merchants cannot self-verify credentials.
        // Independent third-party verification is not implemented for self-service profiles;
        // force isVerified: false and source: "merchant-supplied".
        sanitizedCertifications.push({
          name,
          issuingBody: typeof certObj.issuingBody === "string" ? certObj.issuingBody.trim() : undefined,
          year: typeof certObj.year === "string" || typeof certObj.year === "number" ? certObj.year : undefined,
          isVerified: false, // Disallow merchant self-verification
          source: "merchant-supplied",
        });
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const sanitized: BusinessProfile = {
    businessName,
    industry,
    businessCategory,
    description,
    location: typeof raw.location === "string" ? raw.location.trim() : undefined,
    language: typeof raw.language === "string" ? raw.language.trim() : "en",
    primaryAudience: typeof raw.primaryAudience === "string" ? raw.primaryAudience.trim() : undefined,
    customerNeeds,
    targetMarket: ["local", "regional", "national", "global"].includes(raw.targetMarket as string)
      ? (raw.targetMarket as "local" | "regional" | "national" | "global")
      : undefined,
    communicationStyle,
    offerings: sanitizedOfferings.length > 0 ? sanitizedOfferings : undefined,
    keyFeatures,
    differentiators,
    websiteType,
    appointmentIndustry: raw.appointmentIndustry as BusinessProfile["appointmentIndustry"],
    primaryGoal: ["sell_products", "book_appointments", "generate_leads", "brand_profile"].includes(raw.primaryGoal as string)
      ? (raw.primaryGoal as BusinessProfile["primaryGoal"])
      : undefined,
    visualStyle,
    primaryColor,
    secondaryColor,
    brandPersonality,
    typographyPreference,
    brandVoice: typeof raw.brandVoice === "string" ? raw.brandVoice.trim() : undefined,
    logoUrl: typeof raw.logoUrl === "string" ? raw.logoUrl.trim() : undefined,
    bannerUrl: typeof raw.bannerUrl === "string" ? raw.bannerUrl.trim() : undefined,
    aboutStory: typeof raw.aboutStory === "string" ? raw.aboutStory.trim() : undefined,
    contactInfo,
    faqs: sanitizedFaqs.length > 0 ? sanitizedFaqs : undefined,
    certifications: sanitizedCertifications.length > 0 ? sanitizedCertifications : undefined,
    testimonials: sanitizedTestimonials.length > 0 ? sanitizedTestimonials : undefined,
    teamMembers: sanitizedTeam.length > 0 ? sanitizedTeam : undefined,
    generationMetadata: raw.generationMetadata && typeof raw.generationMetadata === "object"
      ? (raw.generationMetadata as BusinessProfile["generationMetadata"])
      : undefined,
  };

  return { valid: true, errors: {}, sanitized };
}
