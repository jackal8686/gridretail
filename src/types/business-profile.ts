import { WebsiteType, AppointmentIndustry } from "./appointment";
import { IndustryType } from "./store";

export type CommunicationStyle =
  | "authoritative"
  | "approachable"
  | "luxurious"
  | "technical"
  | "creative"
  | "compassionate";

export type BrandPersonality =
  | "professional"
  | "innovative"
  | "artisanal"
  | "authoritative"
  | "compassionate"
  | "playful"
  | "minimalist";

export type VisualStylePreference =
  | "modern_minimal"
  | "luxury_refined"
  | "bold_assertive"
  | "organic_warm"
  | "tech_futuristic"
  | "classic_corporate"
  | "editorial_story"
  | "playful_vibrant";

export type TypographyPreference =
  | "clean_sans"
  | "editorial_serif"
  | "technical_mono"
  | "humanist_sans";

export interface BusinessOffering {
  id?: string;
  name: string;
  description: string;
  price?: number | string;
  isKeyDifferentiator?: boolean;
  category?: string;
}

export interface BusinessContactDetails {
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  businessHours?: string;
}

export interface GenuineTestimonial {
  quote: string;
  author: string;
  roleOrCompany?: string;
  verified?: boolean;
}

export interface GenuineTeamMember {
  name: string;
  role: string;
  bio?: string;
  avatarUrl?: string;
}

export interface BusinessFaqItem {
  question: string;
  answer: string;
}

export interface BusinessCertification {
  name: string;
  issuingBody?: string;
  year?: number | string;
  isVerified?: boolean; // false unless verified by independent third-party evidence
  source?: "merchant-supplied" | "third-party-verified";
}

export interface BusinessProfile {
  // A. Business Identity
  businessName: string;
  industry: IndustryType | string;
  businessCategory?: string; // e.g. "Corporate & Commercial Law", "Artisanal Sourdough Bakery", "HIIT & Strength Studio"
  description?: string;
  location?: string;
  language?: string;

  // B. Target Audience
  primaryAudience?: string; // e.g. "Early-stage founders and mid-sized enterprises"
  customerNeeds?: string[]; // e.g. ["Need rapid contract review", "Regulatory compliance guidance"]
  targetMarket?: "local" | "regional" | "national" | "global";
  communicationStyle?: CommunicationStyle;

  // C. Products & Services
  offerings?: BusinessOffering[];
  keyFeatures?: string[];
  differentiators?: string[]; // e.g. ["Zero retainer surprises", "Direct partner involvement"]

  // D. Website Objective
  websiteType: WebsiteType; // "ecommerce" | "appointments" | "lead_gen"
  appointmentIndustry?: AppointmentIndustry;
  primaryGoal?: "sell_products" | "book_appointments" | "generate_leads" | "brand_profile";

  // E. Brand Identity
  visualStyle?: VisualStylePreference;
  primaryColor?: string;
  secondaryColor?: string;
  brandPersonality?: BrandPersonality;
  typographyPreference?: TypographyPreference;
  brandVoice?: string;
  logoUrl?: string;
  bannerUrl?: string;
  badge?: string;

  // F. Required Content & Verified Information
  aboutStory?: string;
  shippingPolicy?: string;
  returnPolicy?: string;
  contactInfo?: BusinessContactDetails;
  faqs?: BusinessFaqItem[];
  testimonials?: GenuineTestimonial[];
  teamMembers?: GenuineTeamMember[];
  certifications?: Array<BusinessCertification | string>;

  // G. Generation Metadata
  generationMetadata?: {
    generatedAt: string;
    engineVersion: string;
    provider: string;
    providerType?: "deterministic-rules" | "external-llm";
    promptFingerprint?: string;
    isRegenerated?: boolean;
    lastRegeneratedSection?: string;
  };
}

export interface GeneratedWebsitePlan {
  businessProfile: BusinessProfile;
  recommendedTemplateId: string;
  recommendedThemeId: string;
  recommendedStyling: Record<string, unknown>;
  recommendedSections: Array<{
    type: string;
    name: string;
    category: string;
    defaultLayout?: string;
    rationale: string;
    isRequired: boolean;
    enabledByDefault: boolean;
    suggestedSettings?: Record<string, unknown>;
  }>;
  contentPlan: {
    heroHeadline: string;
    heroSubheadline: string;
    primaryCtaText: string;
    primaryCtaUrl: string;
    aboutHeadline: string;
    aboutBody: string;
    keyBenefits: Array<{ title: string; description: string; icon?: string }>;
    faqs: Array<{ question: string; answer: string }>;
  };
  summary?: {
    targetAudienceSummary: string;
    designPhilosophy: string;
    conversionStrategy: string;
  };
}
