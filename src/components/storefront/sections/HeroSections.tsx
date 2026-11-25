"use client";

import React, { useState } from "react";
import { SectionInstance } from "@/types/section";
import { ColorThemeTokens, DesignTemplate } from "@/types/template";
import { StoreStylingTokens } from "@/types/store";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  ShieldCheck,
  Zap,
  Calendar,
  Send,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { ThemeAwareHeroGraphic } from "@/components/storefront/ThemeAwareHeroGraphic";

interface HeroSectionProps {
  instance: SectionInstance;
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
}

export function HeroSections({
  instance,
  tokens,
  styling,
  primaryColor,
  activeDesignTemplate,
  branding,
}: HeroSectionProps) {
  const { type, layoutVariant } = instance;
  const heroLayout = activeDesignTemplate?.heroLayout;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (instance.settings || {}) as Record<string, any>;

  // Form conversion state
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formInterest, setFormInterest] = useState("General Consultation");

  // Multi-slide carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  const buttonRadiusClass =
    styling?.buttonRadius === "sharp"
      ? "rounded-none"
      : styling?.buttonRadius === "pill"
      ? "rounded-full"
      : "rounded-lg";

  const contentWidthClass =
    styling?.contentWidth === "compact"
      ? "max-w-4xl"
      : styling?.contentWidth === "wide"
      ? "max-w-7xl"
      : "max-w-6xl";

  const headlineTypographyClass =
    styling?.typographyScale === "compact"
      ? "text-2xl sm:text-4xl lg:text-5xl"
      : styling?.typographyScale === "prominent"
      ? "text-4xl sm:text-6xl lg:text-7xl"
      : "text-3xl sm:text-5xl lg:text-6xl";

  const cardStyleClass =
    styling?.cardVariation === "block_solid"
      ? "rounded-none border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      : styling?.cardVariation === "soft_rounded"
      ? "rounded-3xl border shadow-sm"
      : styling?.cardVariation === "floating" || styling?.cardStyle === "floating"
      ? "rounded-2xl border shadow-2xl hover:-translate-y-1 transition-transform"
      : styling?.cardVariation === "elevated" || styling?.cardStyle === "elevated"
      ? "rounded-2xl border shadow-lg"
      : styling?.cardVariation === "flat" || styling?.cardStyle === "flat"
      ? "rounded-xl border-0 shadow-none"
      : "rounded-2xl border shadow-md";

  const fallbackBanner = branding?.bannerUrl;
  const fallbackHeadline = branding?.heroHeadline;
  const fallbackSubheadline = branding?.heroSubheadline;
  const fallbackCtaText = branding?.ctaText;

  const bgImage =
    (settings.backgroundImageUrl as string) ||
    (settings.imageUrl as string) ||
    (settings.bannerUrl as string) ||
    fallbackBanner;

  const headlineText =
    (settings.headline as string) ||
    fallbackHeadline ||
    "Welcome to Our Store";

  const subheadlineText =
    (settings.subheadline as string) ||
    fallbackSubheadline ||
    "";

  const ctaText =
    (settings.ctaText as string) || fallbackCtaText || "Explore Catalog";
  const ctaUrl = (settings.ctaUrl as string) || "#catalog";
  const secondaryCtaText = (settings.secondaryCtaText as string) || "";
  const secondaryCtaUrl = (settings.secondaryCtaUrl as string) || "#story";
  const badgeText =
    (settings.badge as string) || (settings.eyebrow as string) || "";

  // -------------------------------------------------------------
  // PROMOTIONAL BANNER SECTION
  // -------------------------------------------------------------
  if (type === "promotional_banner") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-6 px-4 sm:px-8 border-y"
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: tokens.border,
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border }}
            >
              <Tag className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                {badgeText && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: tokens.badgeBg,
                      borderColor: tokens.border,
                      color: tokens.badgeText,
                    }}
                  >
                    {badgeText}
                  </span>
                )}
                <h4 className="text-xs sm:text-sm font-bold" style={{ color: tokens.text }}>
                  {headlineText}
                </h4>
              </div>
              {subheadlineText && (
                <p className="text-[11px] mt-0.5" style={{ color: tokens.textMuted }}>
                  {subheadlineText}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {settings.promoCode && (
              <span
                className="px-3 py-1.5 rounded-lg border border-dashed font-mono text-xs font-bold tracking-wider"
                style={{
                  borderColor: tokens.border,
                  color: primaryColor,
                  backgroundColor: tokens.surface,
                }}
              >
                {settings.promoCode as string}
              </span>
            )}
            <a
              href={ctaUrl}
              className={cn(
                "min-h-[44px] px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer",
                buttonRadiusClass
              )}
              style={{ backgroundColor: primaryColor }}
            >
              <span>{ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // MULTI-SLIDE CAROUSEL
  // -------------------------------------------------------------
  if (type === "multi_slide_carousel") {
    const slides = Array.isArray(settings.slides) && settings.slides.length > 0 ? settings.slides : [];
    if (slides.length === 0) return null;
    const activeSlide = slides[currentSlide % slides.length];

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="relative py-12 sm:py-20 px-4 sm:px-8 border-b overflow-hidden"
        style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="max-w-xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.accent }}>
              Slide {currentSlide + 1} of {slides.length}
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {activeSlide.title}
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
              {activeSlide.subtitle}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={activeSlide.ctaUrl || "#catalog"}
                className={cn("min-h-[44px] px-5 py-2.5 text-xs font-semibold text-white shadow-xs cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                {activeSlide.ctaText || "Explore"}
              </a>
              <div className="flex items-center gap-1 ml-4">
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:opacity-70 cursor-pointer"
                  style={{ borderColor: tokens.border }}
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:opacity-70 cursor-pointer"
                  style={{ borderColor: tokens.border }}
                  aria-label="Next Slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {activeSlide.imageUrl && (
            <div className="w-full md:w-1/2 aspect-4/3 rounded-2xl overflow-hidden border shadow-lg" style={{ borderColor: tokens.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeSlide.imageUrl} alt={activeSlide.title} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // DETERMINE ACTIVE HERO VARIATION (10 VARIATIONS)
  // -------------------------------------------------------------
  let activeVariation = styling?.heroVariation;
  if (!activeVariation) {
    if (
      layoutVariant &&
      [
        "centered",
        "split",
        "image_bg",
        "editorial",
        "minimal",
        "product_spotlight",
        "service_booking",
        "form_conversion",
        "media_showcase",
        "asymmetric",
      ].includes(layoutVariant)
    ) {
      activeVariation = layoutVariant as NonNullable<StoreStylingTokens["heroVariation"]>;
    } else if (type === "hero_split" || heroLayout === "split-showcase") {
      activeVariation = "split";
    } else if (type === "hero_product_showcase") {
      activeVariation = "product_spotlight";
    } else if (type === "hero_minimal") {
      activeVariation = "minimal";
    } else if (type === "hero_cinematic") {
      activeVariation = "media_showcase";
    } else if (heroLayout === "magazine-story") {
      activeVariation = "editorial";
    } else if (heroLayout === "high-impact-blocks") {
      activeVariation = "asymmetric";
    } else {
      activeVariation = "centered";
    }
  }

  // -------------------------------------------------------------
  // VARIATION 1: CENTERED HERO (Default / Architectural)
  // -------------------------------------------------------------
  if (activeVariation === "centered") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="centered"
        className="relative py-16 sm:py-24 px-4 sm:px-8 border-b overflow-hidden transition-colors"
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        }}
      >
        <div className={cn("mx-auto text-center flex flex-col items-center justify-center space-y-6", contentWidthClass)}>
          {badgeText && (
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold border shadow-2xs"
              style={{
                backgroundColor: tokens.badgeBg,
                borderColor: tokens.border,
                color: tokens.badgeText,
              }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              <span>{badgeText}</span>
            </span>
          )}

          <h1
            className={cn("font-bold tracking-tight leading-[1.15] max-w-4xl", headlineTypographyClass)}
            style={{ color: tokens.text }}
          >
            {headlineText}
          </h1>

          <p
            className="text-sm sm:text-lg leading-relaxed max-w-2xl mx-auto"
            style={{ color: tokens.textMuted }}
          >
            {subheadlineText}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={ctaUrl}
              className={cn(
                "min-h-[44px] px-7 py-3 text-xs sm:text-sm font-semibold text-white shadow-md inline-flex items-center gap-2 transition-transform active:scale-98 cursor-pointer",
                buttonRadiusClass
              )}
              style={{ backgroundColor: primaryColor }}
            >
              <span>{ctaText}</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            {secondaryCtaText && (
              <a
                href={secondaryCtaUrl}
                className={cn(
                  "min-h-[44px] px-6 py-3 text-xs sm:text-sm font-medium border transition-colors cursor-pointer",
                  buttonRadiusClass
                )}
                style={{
                  backgroundColor: tokens.background,
                  borderColor: tokens.border,
                  color: tokens.text,
                }}
              >
                {secondaryCtaText}
              </a>
            )}
          </div>

          {/* Centered Trust Points Bar - Only rendered when merchant provides explicit points */}
          {Array.isArray(settings.trustPoints) && settings.trustPoints.length > 0 && (
            <div
              className="pt-8 mt-4 border-t w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs"
              style={{ borderColor: tokens.border, color: tokens.textMuted }}
            >
              {settings.trustPoints.map((tp: { label?: string; text?: string }, idx: number) => (
                <div key={idx} className="flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{tp.label || tp.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 2: SPLIT-SCREEN HERO (Two-Column)
  // -------------------------------------------------------------
  if (activeVariation === "split") {
    const isImageLeft = styling?.imagePosition === "left" || layoutVariant === "image_left";

    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="split"
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className={cn("mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center", contentWidthClass)}>
          {/* Content Column */}
          <div className={cn("space-y-4 sm:space-y-6", isImageLeft && "lg:order-2")}>
            {badgeText && (
              <span
                className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border inline-block"
                style={{
                  backgroundColor: tokens.badgeBg,
                  borderColor: tokens.border,
                  color: tokens.badgeText,
                }}
              >
                {badgeText}
              </span>
            )}

            <h1
              className={cn("font-bold tracking-tight leading-tight", headlineTypographyClass)}
              style={{ color: tokens.text }}
            >
              {headlineText}
            </h1>

            <p className="text-xs sm:text-base leading-relaxed" style={{ color: tokens.textMuted }}>
              {subheadlineText}
            </p>

            {Array.isArray(settings.bulletPoints) && settings.bulletPoints.length > 0 && (
              <ul className="space-y-2 pt-1">
                {settings.bulletPoints.map((bp: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: tokens.text }}>
                    <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={ctaUrl}
                className={cn(
                  "min-h-[44px] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md inline-flex items-center gap-2 transition-transform active:scale-98 cursor-pointer",
                  buttonRadiusClass
                )}
                style={{ backgroundColor: primaryColor }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              {secondaryCtaText && (
                <a
                  href={secondaryCtaUrl}
                  className={cn(
                    "min-h-[44px] px-5 py-3 text-xs sm:text-sm font-medium border transition-colors cursor-pointer",
                    buttonRadiusClass
                  )}
                  style={{
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    color: tokens.text,
                  }}
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
          </div>

          {/* Image Column */}
          <div className={cn("relative group", isImageLeft && "lg:order-1")}>
            <div
              className={cn("relative aspect-4/3 sm:aspect-16/10 overflow-hidden", cardStyleClass)}
              style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
            >
              {bgImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bgImage}
                  alt={headlineText}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <ThemeAwareHeroGraphic
                  tokens={tokens}
                  primaryColor={primaryColor}
                  industry={activeDesignTemplate?.compatibleIndustries?.[0]}
                  storeName={headlineText}
                  aspectRatio="aspect-4/3 sm:aspect-16/10"
                />
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 3: IMAGE-BACKGROUND HERO (Full Bleed Immersive)
  // -------------------------------------------------------------
  if (activeVariation === "image_bg") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="image_bg"
        className="relative min-h-[580px] sm:min-h-[640px] flex items-center justify-center px-4 sm:px-8 py-20 overflow-hidden text-white"
        style={{ backgroundColor: "#111827" }}
      >
        {bgImage && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-102 hover:scale-105"
            style={{ backgroundImage: `url("${bgImage}")` }}
          />
        )}
        {/* High-Contrast Gradient Backdrop */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/60 to-black/30 backdrop-blur-[0.5px]" />

        <div className={cn("relative z-10 text-center flex flex-col items-center space-y-6", contentWidthClass)}>
          {badgeText && (
            <span className="px-4 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-white/20 border border-white/30 backdrop-blur-md">
              {badgeText}
            </span>
          )}

          <h1 className={cn("font-bold tracking-tight leading-[1.1] max-w-4xl text-white", headlineTypographyClass)}>
            {headlineText}
          </h1>

          <p className="text-sm sm:text-lg max-w-2xl text-stone-200 leading-relaxed">
            {subheadlineText}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={ctaUrl}
              className={cn(
                "min-h-[44px] px-7 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl inline-flex items-center gap-2 transition-transform active:scale-98 cursor-pointer",
                buttonRadiusClass
              )}
              style={{ backgroundColor: primaryColor }}
            >
              <span>{ctaText}</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            {secondaryCtaText && (
              <a
                href={secondaryCtaUrl}
                className={cn(
                  "min-h-[44px] px-6 py-3 text-xs sm:text-sm font-medium bg-white/10 border border-white/30 backdrop-blur-md text-white hover:bg-white/20 transition-colors cursor-pointer",
                  buttonRadiusClass
                )}
              >
                {secondaryCtaText}
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 4: EDITORIAL HERO (Magazine Story Narrative)
  // -------------------------------------------------------------
  if (activeVariation === "editorial") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="editorial"
        className="py-16 sm:py-24 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className={cn("mx-auto space-y-8", contentWidthClass)}>
          <div className="flex items-center justify-between border-b pb-3 text-xs tracking-widest uppercase opacity-75" style={{ borderColor: tokens.border, color: tokens.textMuted }}>
            <span>Editorial Edition // {new Date().getFullYear()}</span>
            <span>Refined Architectural Narrative</span>
          </div>

          <div className="space-y-4 max-w-4xl">
            <h1 className={cn("font-serif italic font-normal tracking-tight leading-[1.08]", headlineTypographyClass)} style={{ color: tokens.text }}>
              {headlineText}
            </h1>
            <p className="font-serif text-base sm:text-xl opacity-90 max-w-2xl leading-relaxed" style={{ color: tokens.textMuted }}>
              {subheadlineText}
            </p>
          </div>

          {bgImage && (
            <div className={cn("relative aspect-21/9 overflow-hidden my-4", cardStyleClass)} style={{ borderColor: tokens.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bgImage} alt={headlineText} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <a
              href={ctaUrl}
              className="text-xs sm:text-sm font-serif tracking-widest uppercase underline underline-offset-8 transition-opacity hover:opacity-70 inline-flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <span>{ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>

            <span className="text-[11px] font-mono tracking-wider opacity-60">CATALOG_INDEX_CURATED</span>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 5: MINIMAL TYPOGRAPHY HERO
  // -------------------------------------------------------------
  if (activeVariation === "minimal") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="minimal"
        className="py-20 sm:py-32 px-4 sm:px-8 border-b text-center"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {badgeText && (
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: tokens.accent }}>
              {badgeText}
            </span>
          )}
          <h1
            className={cn("font-light tracking-tight leading-tight", headlineTypographyClass)}
            style={{ color: tokens.text }}
          >
            {headlineText}
          </h1>
          <p className="text-xs sm:text-base leading-relaxed max-w-xl mx-auto" style={{ color: tokens.textMuted }}>
            {subheadlineText}
          </p>
          <div className="pt-4">
            <a
              href={ctaUrl}
              className="text-xs sm:text-sm font-semibold underline underline-offset-8 transition-opacity hover:opacity-70 inline-flex items-center gap-1.5"
              style={{ color: primaryColor }}
            >
              <span>{ctaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 6: PRODUCT-FOCUSED HERO (Flagship Spotlight)
  // -------------------------------------------------------------
  if (activeVariation === "product_spotlight") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="product_spotlight"
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className={cn("mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-16", contentWidthClass)}>
          <div className="w-full lg:w-1/2 relative">
            <div
              className={cn("aspect-square p-8 flex items-center justify-center relative overflow-hidden", cardStyleClass)}
              style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}
            >
              {bgImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bgImage} alt={headlineText} className="w-full h-full object-contain max-h-[380px]" />
              ) : (
                <ThemeAwareHeroGraphic
                  tokens={tokens}
                  primaryColor={primaryColor}
                  industry={activeDesignTemplate?.compatibleIndustries?.[0]}
                  storeName={headlineText}
                  aspectRatio="aspect-square"
                />
              )}
              {badgeText && (
                <div
                  className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border shadow-xs"
                  style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText, borderColor: tokens.border }}
                >
                  {badgeText}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-1/2 space-y-4 sm:space-y-6">
            {badgeText && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {badgeText}
              </span>
            )}
            <h1 className={cn("font-bold tracking-tight", headlineTypographyClass)} style={{ color: tokens.text }}>
              {headlineText}
            </h1>
            <p className="text-xs sm:text-base leading-relaxed" style={{ color: tokens.textMuted }}>
              {subheadlineText}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href={ctaUrl}
                className={cn(
                  "min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md inline-flex items-center gap-2 cursor-pointer",
                  buttonRadiusClass
                )}
                style={{ backgroundColor: primaryColor }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              {secondaryCtaText && (
                <a
                  href={secondaryCtaUrl}
                  className={cn("min-h-[44px] px-5 py-2.5 text-xs font-medium border cursor-pointer", buttonRadiusClass)}
                  style={{ borderColor: tokens.border, color: tokens.text, backgroundColor: tokens.background }}
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 7: SERVICE-FOCUSED HERO (Appointment Booking)
  // -------------------------------------------------------------
  if (activeVariation === "service_booking") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="service_booking"
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className={cn("mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center", contentWidthClass)}>
          {/* Left Details */}
          <div className="lg:col-span-7 space-y-5">
            {badgeText && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}>
                <Calendar className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                <span>{badgeText}</span>
              </div>
            )}

            <h1 className={cn("font-bold tracking-tight leading-tight", headlineTypographyClass)} style={{ color: tokens.text }}>
              {headlineText}
            </h1>

            {subheadlineText && (
              <p className="text-xs sm:text-base leading-relaxed" style={{ color: tokens.textMuted }}>
                {subheadlineText}
              </p>
            )}

            {Array.isArray(settings.features) && settings.features.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs" style={{ color: tokens.text }}>
                {settings.features.map((feat: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={ctaUrl}
                className={cn(
                  "min-h-[44px] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md inline-flex items-center gap-2 cursor-pointer",
                  buttonRadiusClass
                )}
                style={{ backgroundColor: primaryColor }}
              >
                <Calendar className="h-4 w-4" />
                <span>{ctaText}</span>
              </a>
              {secondaryCtaText && (
                <a
                  href={secondaryCtaUrl}
                  className={cn(
                    "min-h-[44px] px-5 py-3 text-xs sm:text-sm font-medium border cursor-pointer",
                    buttonRadiusClass
                  )}
                  style={{ backgroundColor: tokens.background, borderColor: tokens.border, color: tokens.text }}
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
          </div>

          {/* Right Card: Service Schedule Overview */}
          <div className="lg:col-span-5">
            <div className={cn("p-6 space-y-4", cardStyleClass)} style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.border }}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-xs" style={{ color: tokens.text }}>
                    {(settings.scheduleTitle as string) || "Scheduling"}
                  </span>
                </div>
                {settings.statusBadge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {settings.statusBadge as string}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs" style={{ color: tokens.textMuted }}>
                {settings.consultationFormat && (
                  <div className="flex items-center justify-between">
                    <span>Format</span>
                    <span className="font-semibold" style={{ color: tokens.text }}>
                      {settings.consultationFormat as string}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Booking</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Available Online
                  </span>
                </div>
              </div>

              {settings.bookingNote && (
                <div className="p-3 rounded-lg border text-[11px] leading-relaxed" style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textMuted }}>
                  <Lock className="h-3.5 w-3.5 inline mr-1 text-stone-400" />
                  {settings.bookingNote as string}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 8: FORM-FOCUSED CONVERSION HERO (Lead Gen)
  // -------------------------------------------------------------
  if (activeVariation === "form_conversion") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="form_conversion"
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className={cn("mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center", contentWidthClass)}>
          {/* Left Hero Context */}
          <div className="lg:col-span-7 space-y-5">
            {badgeText && (
              <span
                className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border inline-block"
                style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
              >
                {badgeText}
              </span>
            )}

            <h1 className={cn("font-bold tracking-tight leading-tight", headlineTypographyClass)} style={{ color: tokens.text }}>
              {headlineText}
            </h1>

            {subheadlineText && (
              <p className="text-xs sm:text-base leading-relaxed" style={{ color: tokens.textMuted }}>
                {subheadlineText}
              </p>
            )}

            {Array.isArray(settings.features) && settings.features.length > 0 && (
              <div className="space-y-2 pt-2 text-xs" style={{ color: tokens.text }}>
                {settings.features.map((feat: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Lead Capture Form */}
          <div className="lg:col-span-5">
            <div className={cn("p-6 space-y-4", cardStyleClass)} style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: tokens.text }}>
                  {(settings.formTitle as string) || "Submit an Inquiry"}
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {(settings.formSubtitle as string) || "Fill out your details to get in touch."}
                </p>
              </div>

              {formSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600" />
                  <h4 className="font-bold text-xs">Inquiry Received</h4>
                  <p className="text-[11px] text-emerald-700">Thank you, {formName}. Your inquiry has been received.</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (formEmail) setFormSubmitted(true);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: tokens.text }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs outline-hidden focus:ring-2"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: tokens.text }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@organization.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs outline-hidden focus:ring-2"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: tokens.text }}>
                      Area of Interest
                    </label>
                    <select
                      value={formInterest}
                      onChange={(e) => setFormInterest(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs outline-hidden focus:ring-2"
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    >
                      <option value="General Consultation">General Strategic Advisory</option>
                      <option value="Service Proposal">Custom Service Proposal</option>
                      <option value="Commercial Inquiry">Commercial Collaboration</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className={cn(
                      "w-full min-h-[42px] px-4 py-2.5 text-xs font-semibold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2",
                      buttonRadiusClass
                    )}
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Inquiry</span>
                  </button>

                  <p className="text-[10px] text-center text-stone-400 pt-1">
                    <Lock className="h-3 w-3 inline mr-1" />
                    Direct submission to store owner.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 9: MEDIA / VISUAL SHOWCASE HERO (Widescreen Cinematic)
  // -------------------------------------------------------------
  if (activeVariation === "media_showcase") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="media_showcase"
        className="py-10 sm:py-16 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className={cn("mx-auto space-y-6", contentWidthClass)}>
          <div className={cn("relative aspect-21/9 overflow-hidden shadow-2xl", cardStyleClass)} style={{ borderColor: tokens.border }}>
            {bgImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bgImage} alt="Media showcase" className="w-full h-full object-cover" />
            ) : (
              <ThemeAwareHeroGraphic
                tokens={tokens}
                primaryColor={primaryColor}
                industry={activeDesignTemplate?.compatibleIndustries?.[0]}
                storeName={headlineText}
                aspectRatio="aspect-21/9"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-12 text-white">
              {badgeText && (
                <span className="text-[11px] font-bold tracking-widest uppercase text-amber-400 mb-2">
                  {badgeText}
                </span>
              )}
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight max-w-2xl">
                {headlineText}
              </h2>
              {subheadlineText && (
                <p className="text-xs sm:text-sm text-stone-200 max-w-xl mt-2 leading-relaxed">
                  {subheadlineText}
                </p>
              )}

              <div className="flex items-center gap-3 pt-4">
                <a
                  href={ctaUrl}
                  className={cn("px-6 py-2.5 text-xs font-semibold text-white shadow-md inline-flex items-center gap-2 cursor-pointer", buttonRadiusClass)}
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 10: ASYMMETRIC IMAGE-AND-TEXT HERO (Brutalist / Blocks)
  // -------------------------------------------------------------
  if (activeVariation === "asymmetric") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        data-hero-variation="asymmetric"
        className="py-12 sm:py-20 px-4 sm:px-8 border-b overflow-hidden"
        style={{
          borderColor: tokens.border,
          backgroundColor: tokens.background,
        }}
      >
        <div className={cn("mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center", contentWidthClass)}>
          {/* Main Content Block with Hard Offset */}
          <div className="lg:col-span-7 space-y-5 p-6 sm:p-10 border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-stone-900">
            {badgeText && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white font-mono text-[11px] font-black uppercase tracking-widest">
                <Zap className="h-3.5 w-3.5" />
                <span>{badgeText}</span>
              </div>
            )}

            <h1 className={cn("font-black uppercase tracking-tighter leading-none", headlineTypographyClass)} style={{ color: tokens.text }}>
              {headlineText}
            </h1>

            {subheadlineText && (
              <p className="text-xs sm:text-base font-medium leading-relaxed" style={{ color: tokens.textMuted }}>
                {subheadlineText}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <a
                href={ctaUrl}
                className="min-h-[44px] px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              {secondaryCtaText && (
                <a
                  href={secondaryCtaUrl}
                  className="min-h-[44px] px-5 py-3 text-xs sm:text-sm font-bold border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                  style={{ backgroundColor: tokens.surface, color: tokens.text }}
                >
                  {secondaryCtaText}
                </a>
              )}
            </div>
          </div>

          {/* Secondary Floating Specs Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-amber-50 dark:bg-stone-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span>{(settings.profileTitle as string) || "HIGHLIGHTS"}</span>
                <span className="text-emerald-600">ACTIVE</span>
              </div>
              <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                {(settings.profileDescription as string) || "Explore our offerings and get in touch with our team."}
              </p>
            </div>

            {bgImage && (
              <div className="aspect-16/10 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bgImage} alt={headlineText} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return null;
}
