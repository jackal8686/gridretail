import { BusinessProfile } from "@/types/business-profile";
import { SectionInstance, SectionType } from "@/types/section";
import { GenerationProvider, GenerationResult, SectionRecommendation, GeneratedDesignSystem } from "./types";
import { IndustrySectionRecommender } from "./recommender";
import { ContentGenerator } from "./content-generator";

export class MockGenerationProvider implements GenerationProvider {
  public id = "mock_deterministic_v1";
  public name = "Deterministic Context-Aware Engine";
  public readonly providerType = "deterministic-rules" as const;

  private recommender = new IndustrySectionRecommender();
  private contentGen = new ContentGenerator();

  public isAvailable(): boolean {
    return true;
  }

  public async generatePlan(profile: BusinessProfile): Promise<{
    recommendedSections: SectionRecommendation[];
    designSystem: GeneratedDesignSystem;
    summary: GenerationResult["summary"];
  }> {
    const designSystem = this.recommender.recommendDesignSystem(profile);
    const recommendedSections = this.recommender.recommendSections(profile);

    const summary: GenerationResult["summary"] = {
      targetAudienceSummary: profile.primaryAudience
        ? `Tailored specifically for ${profile.primaryAudience} seeking high-caliber ${profile.businessCategory || profile.industry} solutions.`
        : `Designed for prospective clients and partners seeking reliable ${profile.businessCategory || profile.industry} capabilities.`,
      designPhilosophy: `Utilizing '${designSystem.templateName}' aesthetics with '${designSystem.themeName}' color harmony, focusing on trust, clear visual hierarchy, and intuitive conversion pathways.`,
      conversionStrategy: `Anchored around '${designSystem.ctaText}' directed towards ${designSystem.ctaUrl}, reinforced by transparent value propositions and clear engagement roadmaps.`,
    };

    return {
      recommendedSections,
      designSystem,
      summary,
    };
  }

  public async generateWebsite(profile: BusinessProfile): Promise<GenerationResult> {
    const plan = await this.generatePlan(profile);
    const sections: SectionInstance[] = [];

    // Filter to sections enabled by default
    const activeRecs = plan.recommendedSections.filter((r) => r.enabledByDefault);

    for (let i = 0; i < activeRecs.length; i++) {
      const rec = activeRecs[i];
      const instance = this.contentGen.generateSectionContent(
        profile,
        rec.type as SectionType,
        i
      );
      sections.push(instance);
    }

    // Attach generation metadata to profile
    const profileWithMeta: BusinessProfile = {
      ...profile,
      generationMetadata: {
        generatedAt: new Date().toISOString(),
        engineVersion: "16.1.0",
        provider: this.id,
        providerType: "deterministic-rules",
        isRegenerated: false,
      },
    };

    return {
      businessProfile: profileWithMeta,
      designSystem: plan.designSystem,
      sections,
      recommendedSections: plan.recommendedSections,
      summary: plan.summary,
    };
  }

  public async regenerateSection(
    profile: BusinessProfile,
    sectionType: string,
    existingSection?: SectionInstance
  ): Promise<SectionInstance> {
    const order = existingSection ? existingSection.order : 0;
    const regenerated = this.contentGen.generateSectionContent(
      profile,
      sectionType as SectionType,
      order,
      existingSection
    );
    return regenerated;
  }
}
