"use client";

import React from "react";
import { Product, StoreCategory } from "@/types";
import { SectionInstance } from "@/types/section";
import { ColorThemeTokens, DesignTemplate } from "@/types/template";
import { StoreStylingTokens } from "@/types/store";
import { getSectionDefinition } from "@/constants/sections";
import { cn } from "@/utils/cn";
import { HeroSections } from "./HeroSections";
import { ProductSections } from "./ProductSections";
import { EditorialSections } from "./EditorialSections";
import { InfoSections } from "./InfoSections";
import { FooterSection } from "./FooterSection";

interface SectionRendererProps {
  instance: SectionInstance;
  tokens: ColorThemeTokens;
  styling?: StoreStylingTokens;
  primaryColor: string;
  storeSlug: string;
  storeName: string;
  clientName: string;
  products: Product[];
  categories: StoreCategory[];
  onQuickAdd: (productId: string) => void;
  addedItems: Record<string, boolean>;
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
  isSelected?: boolean;
}

export function SectionRenderer({
  instance,
  tokens,
  styling,
  primaryColor,
  storeSlug,
  storeName,
  clientName,
  products,
  categories,
  onQuickAdd,
  addedItems,
  activeDesignTemplate,
  branding,
  isSelected = false,
}: SectionRendererProps) {
  if (!instance.visible) {
    return null;
  }

  const definition = getSectionDefinition(instance.type);
  const category = definition?.category;

  const handleSectionClick = () => {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "GRIDRETAIL_SECTION_SELECT", sectionId: instance.id },
        "*"
      );
    }
  };

  let content: React.ReactNode = null;

  if (category === "hero") {
    content = (
      <HeroSections
        instance={instance}
        tokens={tokens}
        styling={styling}
        primaryColor={primaryColor}
        activeDesignTemplate={activeDesignTemplate}
        branding={branding}
      />
    );
  } else if (category === "products") {
    content = (
      <ProductSections
        instance={instance}
        tokens={tokens}
        styling={styling}
        primaryColor={primaryColor}
        storeSlug={storeSlug}
        products={products}
        categories={categories}
        onQuickAdd={onQuickAdd}
        addedItems={addedItems}
        activeDesignTemplate={activeDesignTemplate}
      />
    );
  } else if (category === "editorial") {
    content = (
      <EditorialSections
        instance={instance}
        tokens={tokens}
        styling={styling}
        primaryColor={primaryColor}
        branding={branding}
      />
    );
  } else if (category === "info") {
    content = (
      <InfoSections
        instance={instance}
        tokens={tokens}
        styling={styling}
        primaryColor={primaryColor}
      />
    );
  } else if (category === "footer" || instance.type === "footer_custom") {
    content = (
      <FooterSection
        instance={instance}
        tokens={tokens}
        styling={styling}
        primaryColor={primaryColor}
        storeName={storeName}
        clientName={clientName}
        storeSlug={storeSlug}
        categories={categories}
      />
    );
  }

  if (!content) return null;

  return (
    <div
      id={`sec-wrapper-${instance.id}`}
      data-section-wrapper="true"
      data-section-id={instance.id}
      data-section-type={instance.type}
      onClick={handleSectionClick}
      className={cn(
        "relative transition-all duration-150",
        isSelected && "ring-2 ring-[#176B4D] ring-offset-2 shadow-sm"
      )}
    >
      {isSelected && (
        <div className="absolute top-2 left-2 z-40 bg-[#176B4D] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5 pointer-events-none select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          <span>{definition?.name || instance.type}</span>
          <span className="text-white/70 font-normal">({instance.id})</span>
        </div>
      )}
      {content}
    </div>
  );
}
