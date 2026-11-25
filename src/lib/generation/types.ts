import { BusinessProfile } from "@/types/business-profile";
import { SectionInstance } from "@/types/section";
import { StoreStylingTokens } from "@/types/store";

export interface SectionRecommendation {
  type: string;
  name: string;
  category: "hero" | "products" | "editorial" | "info" | "footer";
  defaultLayout?: string;
  rationale: string;
  isRequired: boolean;
  enabledByDefault: boolean;
  order: number;
  initialSettings?: Record<string, unknown>;
}

export interface GeneratedDesignSystem {
  templateId: string;
  templateName: string;
  themeId: string;
  themeName: string;
  styling: StoreStylingTokens;
  heroHeadline: string;
  heroSubheadline: string;
  heroBadge?: string;
  ctaText: string;
  ctaUrl: string;
  aboutText: string;
}

export interface GenerationResult {
  businessProfile: BusinessProfile;
  designSystem: GeneratedDesignSystem;
  sections: SectionInstance[];
  recommendedSections: SectionRecommendation[];
  summary: {
    targetAudienceSummary: string;
    designPhilosophy: string;
    conversionStrategy: string;
  };
}

export interface GenerationProvider {
  id: string;
  name: string;
  providerType: "deterministic-rules" | "external-llm";
  isAvailable(): boolean;
  generatePlan(profile: BusinessProfile): Promise<{
    recommendedSections: SectionRecommendation[];
    designSystem: GeneratedDesignSystem;
    summary: GenerationResult["summary"];
  }>;
  generateWebsite(profile: BusinessProfile): Promise<GenerationResult>;
  regenerateSection(
    profile: BusinessProfile,
    sectionType: string,
    existingSection?: SectionInstance
  ): Promise<SectionInstance>;
}
