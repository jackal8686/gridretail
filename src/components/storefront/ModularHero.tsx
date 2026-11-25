"use client";

import React from "react";
import { HeroSections } from "./sections/HeroSections";
import { SectionInstance } from "@/types/section";
import { ColorThemeTokens, DesignTemplate } from "@/types/template";
import { StoreStylingTokens } from "@/types/store";

export interface ModularHeroProps {
  instance?: SectionInstance;
  tokens: ColorThemeTokens;
  styling?: StoreStylingTokens;
  primaryColor: string;
  activeDesignTemplate?: DesignTemplate;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    heroHeadline?: string;
    heroSubheadline?: string;
    aboutText?: string;
    ctaText?: string;
    logoUrl?: string;
    bannerUrl?: string;
  };
  websiteType?: "e_commerce" | "appointments" | "lead_gen";
}

/**
 * ModularHero component for rendering any of the 10 supported hero variations
 * across E-commerce, Appointment Scheduling, and Lead Generation websites.
 */
export function ModularHero({
  instance = {
    id: "hero_modular",
    type: "hero_full_width",
    order: 0,
    visible: true,
    settings: {},
  },
  tokens,
  styling,
  primaryColor,
  activeDesignTemplate,
  branding,
}: ModularHeroProps) {
  return (
    <HeroSections
      instance={instance}
      tokens={tokens}
      styling={styling}
      primaryColor={primaryColor}
      activeDesignTemplate={activeDesignTemplate}
      branding={branding}
    />
  );
}

export { HeroSections };
export default ModularHero;
