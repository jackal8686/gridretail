import { BusinessProfile } from "@/types/business-profile";
import { SectionRecommendation, GeneratedDesignSystem } from "./types";
import { DESIGN_TEMPLATES } from "@/constants/design-templates";
import { COLOR_THEMES } from "@/constants/themes";
import { SECTION_DEFINITIONS } from "@/constants/sections";
import { SectionType } from "@/types/section";

export class IndustrySectionRecommender {
  /**
   * Recommends the optimal Design Template and Color Theme based on business profile.
   */
  public recommendDesignSystem(profile: BusinessProfile): GeneratedDesignSystem {
    const normIndustry = (profile.industry || "").toLowerCase();
    const normCategory = (profile.businessCategory || "").toLowerCase();
    const visual = profile.visualStyle;
    const personality = profile.brandPersonality;
    const type = profile.websiteType;

    let templateId = "tmpl_modern_minimal";
    let themeId = "theme_nordic_pine";

    // 1. Determine Template
    if (visual === "luxury_refined" || personality === "authoritative" || normIndustry.includes("luxury") || normCategory.includes("law") || normCategory.includes("legal")) {
      templateId = "tmpl_luxury_editorial";
    } else if (visual === "tech_futuristic" || normIndustry.includes("electronic") || normCategory.includes("software") || normCategory.includes("saas") || normCategory.includes("tech")) {
      templateId = "tmpl_tech_futuristic";
    } else if (visual === "bold_assertive" || normIndustry.includes("sport") || normCategory.includes("fitness") || normCategory.includes("gym")) {
      templateId = "tmpl_bold_vibrant";
    } else if (visual === "organic_warm" || normIndustry.includes("beauty") || normCategory.includes("spa") || normCategory.includes("wellness") || normCategory.includes("clinic") || normCategory.includes("health")) {
      templateId = "tmpl_organic_natural";
    } else if (visual === "editorial_story" || normCategory.includes("restaurant") || normCategory.includes("bakery") || normCategory.includes("food") || normIndustry.includes("food")) {
      templateId = "tmpl_editorial_magazine";
    } else if (visual === "playful_vibrant" || personality === "playful") {
      templateId = "tmpl_playful_creative";
    } else if (type === "ecommerce" && (normIndustry.includes("home") || normIndustry.includes("fashion"))) {
      templateId = "tmpl_modern_minimal";
    } else {
      templateId = "tmpl_modern_minimal";
    }

    // 2. Determine Color Theme
    if (profile.primaryColor) {
      // Find closest or matching theme if user provided a specific theme preference
      if (profile.primaryColor.toLowerCase() === "#06b6d4" || normCategory.includes("software") || normCategory.includes("tech")) {
        themeId = "theme_obsidian_slate";
      } else if (profile.primaryColor.toLowerCase() === "#18181b" || normCategory.includes("law") || normCategory.includes("legal")) {
        themeId = "theme_monochrome_ink";
      } else if (normCategory.includes("restaurant") || normCategory.includes("coffee") || normCategory.includes("dining") || normIndustry.includes("food")) {
        themeId = "theme_warm_terracotta";
      } else if (normCategory.includes("health") || normCategory.includes("wellness") || normCategory.includes("spa")) {
        themeId = "theme_sage_botanical";
      }
    } else {
      if (templateId === "tmpl_luxury_editorial") {
        themeId = "theme_monochrome_ink";
      } else if (templateId === "tmpl_tech_futuristic") {
        themeId = "theme_obsidian_slate";
      } else if (templateId === "tmpl_bold_vibrant") {
        themeId = "theme_electric_indigo";
      } else if (templateId === "tmpl_organic_natural") {
        themeId = "theme_sage_botanical";
      } else if (templateId === "tmpl_editorial_magazine") {
        themeId = "theme_warm_terracotta";
      } else if (templateId === "tmpl_playful_creative") {
        themeId = "theme_amber_heritage";
      } else {
        themeId = "theme_nordic_pine";
      }
    }

    const matchedTemplate = DESIGN_TEMPLATES.find((t) => t.id === templateId) || DESIGN_TEMPLATES[0];
    const matchedTheme = COLOR_THEMES.find((th) => th.id === themeId) || COLOR_THEMES[0];

    // 3. Recommended Styling Tokens
    const styling: GeneratedDesignSystem["styling"] = {
      buttonRadius: templateId === "tmpl_tech_futuristic" || templateId === "tmpl_luxury_editorial" ? "sharp" : templateId === "tmpl_organic_natural" || templateId === "tmpl_playful_creative" ? "pill" : "rounded",
      cardStyle: templateId === "tmpl_luxury_editorial" ? "bordered" : templateId === "tmpl_bold_vibrant" ? "bordered" : templateId === "tmpl_tech_futuristic" ? "bordered" : "flat",
      contentWidth: "normal",
      spacingDensity: templateId === "tmpl_modern_minimal" || templateId === "tmpl_organic_natural" ? "spacious" : "normal",
      headerStyle: templateId === "tmpl_modern_minimal" ? "translucent" : "standard",
      formStyle: "bordered",
      shadowScale: templateId === "tmpl_bold_vibrant" ? "medium" : "subtle",
    };

    // 4. Default CTAs by Website Type & Context
    let ctaText = "Explore Catalog";
    let ctaUrl = "#catalog";
    if (type === "appointments") {
      ctaText = normCategory.includes("fitness") || normCategory.includes("gym") || normCategory.includes("strength") || normCategory.includes("conditioning") || normCategory.includes("athletic") || normCategory.includes("training")
        ? "Book a Session"
        : normCategory.includes("medical") || normCategory.includes("clinic")
        ? "Book Consultation"
        : "Book an Appointment";
      ctaUrl = "#booking-section";
    } else if (type === "lead_gen") {
      ctaText = normCategory.includes("software") || normCategory.includes("saas")
        ? "Request a Demo"
        : normCategory.includes("restaurant") || normCategory.includes("dining") || normCategory.includes("culinary") || normIndustry.includes("food")
        ? "Request a Reservation"
        : "Request Consultation";
      ctaUrl = "#inquiry-form";
    }

    return {
      templateId: matchedTemplate.id,
      templateName: matchedTemplate.name,
      themeId: matchedTheme.id,
      themeName: matchedTheme.name,
      styling,
      heroHeadline: profile.businessName ? `${profile.businessName}` : "Purposeful Quality & Dedicated Service",
      heroSubheadline: profile.description || `Tailored solutions and dedicated service for our clients.`,
      ctaText,
      ctaUrl,
      aboutText: profile.aboutStory || profile.description || `Dedicated to delivering excellence in every engagement.`,
    };
  }

  /**
   * Generates a context-aware list of recommended sections with ordering and rationale.
   */
  public recommendSections(profile: BusinessProfile): SectionRecommendation[] {
    const type = profile.websiteType;
    const category = (profile.businessCategory || profile.industry || "").toLowerCase();
    const recommendations: SectionRecommendation[] = [];

    // Helper to verify existence in SECTION_DEFINITIONS
    const makeRec = (
      secType: SectionType,
      order: number,
      isRequired: boolean,
      enabledByDefault: boolean,
      rationale: string,
      initialSettings?: Record<string, unknown>
    ): SectionRecommendation => {
      const def = SECTION_DEFINITIONS[secType];
      return {
        type: secType,
        name: def?.name || secType,
        category: def?.category || "info",
        defaultLayout: def?.defaultLayout,
        rationale,
        isRequired,
        enabledByDefault,
        order,
        initialSettings,
      };
    };

    // -------------------------------------------------------------
    // 1. HERO SECTION (Required across all types)
    // -------------------------------------------------------------
    let heroType: SectionType = "hero_split";
    let heroRationale = "Balanced side-by-side presentation highlighting core value proposition alongside visual brand identity.";

    if (type === "ecommerce") {
      if (category.includes("luxury") || category.includes("jewelry")) {
        heroType = "hero_cinematic";
        heroRationale = "Refined cinematic framing showcasing exquisite craftsmanship and brand heritage.";
      } else if (profile.offerings && profile.offerings.length === 1) {
        heroType = "hero_product_showcase";
        heroRationale = "Spotlights the flagship product with instant specifications and direct purchase actions.";
      } else {
        heroType = "hero_split";
      }
    } else if (category.includes("restaurant") || category.includes("dining") || category.includes("cafe")) {
      heroType = "hero_cinematic";
      heroRationale = "Immersive visual hero introducing the dining atmosphere, culinary ethos, and location.";
    } else if (category.includes("software") || category.includes("saas") || category.includes("tech")) {
      heroType = "hero_split";
      heroRationale = "Precision split hero clearly articulating the software platform's primary benefit and conversion CTA.";
    } else if (category.includes("law") || category.includes("legal") || category.includes("advisory")) {
      heroType = "hero_split";
      heroRationale = "Authoritative, dignified hero communicating focus areas and clear confidential consultation pathway.";
    }

    recommendations.push(makeRec(heroType, 0, true, true, heroRationale));

    // -------------------------------------------------------------
    // 2. PRIMARY VALUE PROPOSITION / BENEFITS GRID
    // -------------------------------------------------------------
    recommendations.push(
      makeRec(
        "benefits_grid",
        1,
        false,
        true,
        `Structured 3-column breakdown of service offerings and catalog features for ${profile.businessCategory || profile.industry}.`
      )
    );

    // -------------------------------------------------------------
    // 3. E-COMMERCE SPECIFIC PRODUCT SECTIONS
    // -------------------------------------------------------------
    if (type === "ecommerce") {
      recommendations.push(
        makeRec(
          "featured_products",
          2,
          true,
          true,
          "Product showcase displaying catalog items with cart buttons and stock indicators."
        )
      );

      recommendations.push(
        makeRec(
          "collection_showcase",
          3,
          false,
          true,
          "Visual category navigation enabling shoppers to quickly explore distinct departments."
        )
      );

      recommendations.push(
        makeRec(
          "brand_story",
          4,
          false,
          true,
          "Overview describing company history, product categories, and business focus."
        )
      );

      recommendations.push(
        makeRec(
          "trust_badges",
          5,
          false,
          true,
          "Displays clear checkout terms, product specifications, and store care guidance."
        )
      );

      recommendations.push(
        makeRec(
          "shipping_returns",
          6,
          false,
          true,
          "Information outlining merchant delivery options and return policies."
        )
      );

      recommendations.push(
        makeRec(
          "newsletter_signup",
          7,
          false,
          true,
          "Allows customers to submit email addresses for store news and product announcements."
        )
      );
    }

    // -------------------------------------------------------------
    // 4. APPOINTMENT SCHEDULING SPECIFIC SECTIONS
    // -------------------------------------------------------------
    if (type === "appointments") {
      recommendations.push(
        makeRec(
          "brand_story",
          2,
          false,
          true,
          `Overview outlining service scope and background information for ${profile.businessName}.`
        )
      );

      recommendations.push(
        makeRec(
          "how_it_works",
          3,
          false,
          true,
          "3-step walkthrough explaining consultation preparation, the appointment experience, and follow-up guidance."
        )
      );

      if (category.includes("fitness") || category.includes("wellness") || category.includes("health")) {
        recommendations.push(
          makeRec(
            "timeline_milestones",
            4,
            false,
            false,
            "Timeline layout displaying session milestones or program phases."
          )
        );
      }

      recommendations.push(
        makeRec(
          "faq_accordion",
          5,
          false,
          true,
          "Answers frequent questions regarding session cancellation policies, preparation, and consultation formats."
        )
      );

      recommendations.push(
        makeRec(
          "contact_info",
          6,
          false,
          true,
          "Essential contact details, clinic/studio directions, operating hours, and inquiry telephone lines."
        )
      );
    }

    // -------------------------------------------------------------
    // 5. LEAD GENERATION SPECIFIC SECTIONS
    // -------------------------------------------------------------
    if (type === "lead_gen") {
      if (category.includes("restaurant") || category.includes("dining")) {
        recommendations.push(
          makeRec(
            "lifestyle_editorial_grid",
            2,
            false,
            true,
            "Photo gallery displaying dining areas, table settings, and menu selections."
          )
        );

        recommendations.push(
          makeRec(
            "brand_story",
            3,
            false,
            true,
            "Overview describing restaurant background, menu format, and dining concept."
          )
        );

        recommendations.push(
          makeRec(
            "how_it_works",
            4,
            false,
            true,
            "Reservation policy, seating timelines, and private event arrangement details."
          )
        );

        recommendations.push(
          makeRec(
            "contact_info",
            5,
            true,
            true,
            "Operating hours, exact physical address, parking guidance, and reservations direct contact."
          )
        );
      } else {
        // Professional Services / Law Firm / Software / B2B
        recommendations.push(
          makeRec(
            "brand_story",
            2,
            false,
            true,
            `Firm profile establishing service scope and focus areas in ${profile.businessCategory}.`
          )
        );

        recommendations.push(
          makeRec(
            "how_it_works",
            3,
            false,
            true,
            "Step-by-step engagement roadmap from initial inquiry through diagnostic evaluation to final execution."
          )
        );

        recommendations.push(
          makeRec(
            "brand_values",
            4,
            false,
            true,
            "Summary of standard business principles, confidentiality, and client communication."
          )
        );

        recommendations.push(
          makeRec(
            "faq_accordion",
            5,
            false,
            true,
            "Direct answers to commercial scoping, consultation confidentiality, and response timelines."
          )
        );

        recommendations.push(
          makeRec(
            "contact_info",
            6,
            false,
            true,
            "Contact details including office phone, email address, and office location."
          )
        );
      }
    }

    // -------------------------------------------------------------
    // 6. FOOTER SECTION (Required across all websites)
    // -------------------------------------------------------------
    const lastOrder = recommendations.length;
    recommendations.push(
      makeRec(
        "footer_custom",
        lastOrder,
        true,
        true,
        "Comprehensive site footer with essential navigation, copyright notices, and regulatory links."
      )
    );

    return recommendations;
  }
}
