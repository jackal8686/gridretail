"use client";

import React from "react";
import { SectionInstance } from "@/types/section";
import { ColorThemeTokens } from "@/types/template";
import { StoreStylingTokens } from "@/types/store";
import { Hammer, BookOpen, Shield, Camera } from "lucide-react";
import { cn } from "@/utils/cn";

interface EditorialSectionsProps {
  instance: SectionInstance;
  tokens: ColorThemeTokens;
  styling?: StoreStylingTokens;
  primaryColor: string;
  branding?: {
    logoUrl?: string;
    bannerUrl?: string;
    aboutText?: string;
  };
}

export function EditorialSections({ instance, tokens, primaryColor, branding }: EditorialSectionsProps) {
  const { type, layoutVariant } = instance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (instance.settings || {}) as Record<string, any>;
  const settings = s;
  const isImageLeft = layoutVariant === "split_image_left";
  const imageUrl = (settings.imageUrl as string) || branding?.logoUrl || branding?.bannerUrl || "";

  // -------------------------------------------------------------
  // 1. BRAND STORY & HERITAGE
  // -------------------------------------------------------------
  if (type === "brand_story") {
    const bodyText = (settings.bodyParagraph1 as string) || branding?.aboutText || "Crafted with quiet intention, balancing precision industrial design with sustainable tactile materials.";
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-24 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className={cn("space-y-4 sm:space-y-6", isImageLeft && "lg:order-2")}>
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: tokens.text }}>
              {(settings.headline as string) || "Rooted in Quiet Craft and Timeless Utility"}
            </h2>

            <div className="space-y-3 text-xs sm:text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
              <p>{bodyText}</p>
              {settings.bodyParagraph2 && <p>{settings.bodyParagraph2 as string}</p>}
            </div>

            {settings.quote && (
              <blockquote
                className="p-4 rounded-xl border-l-4 italic text-xs sm:text-sm space-y-1 shadow-2xs"
                style={{
                  borderColor: primaryColor,
                  backgroundColor: tokens.background,
                  color: tokens.text,
                }}
              >
                <p>&ldquo;{settings.quote as string}&rdquo;</p>
                {settings.quoteAuthor && (
                  <cite className="block not-italic text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    — {settings.quoteAuthor as string}
                  </cite>
                )}
              </blockquote>
            )}
          </div>

          <div className={cn("relative", isImageLeft && "lg:order-1")}>
            <div
              className="aspect-4/3 rounded-3xl overflow-hidden border shadow-lg relative"
              style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Brand Story Visual"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-radial from-stone-100 to-stone-200">
                  <BookOpen className="h-10 w-10 text-stone-400 mb-2" />
                  <span className="text-xs font-bold text-stone-600">The Atelier Narrative</span>
                  <span className="text-[10px] text-stone-400 mt-1">Upload brand portrait or atelier photograph</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 2. CRAFTSMANSHIP & PROCESS
  // -------------------------------------------------------------
  if (type === "craftsmanship_process") {
    const steps = Array.isArray(settings.steps) ? settings.steps : [];

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "From Raw Material to Final Form"}
            </h2>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                {settings.subtitle as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md transition-shadow"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-bold" style={{ color: primaryColor }}>
                    {st.number || `0${idx + 1}`}
                  </span>
                  <Hammer className="h-4 w-4 opacity-40 text-stone-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm" style={{ color: tokens.text }}>
                    {st.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                    {st.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 3. LIFESTYLE EDITORIAL GRID
  // -------------------------------------------------------------
  if (type === "lifestyle_editorial_grid") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Living in Context"}
            </h2>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                {settings.subtitle as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { url: settings.image1Url as string, caption: settings.image1Caption as string },
              { url: settings.image2Url as string, caption: settings.image2Caption as string },
              { url: settings.image3Url as string, caption: settings.image3Caption as string },
            ].map((img, idx) => (
              <div
                key={idx}
                className="group relative aspect-3/4 rounded-2xl overflow-hidden border shadow-sm flex flex-col justify-end p-4"
                style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}
              >
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.caption || `Editorial ${idx + 1}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-radial from-stone-200 to-stone-300 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-stone-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                <span className="relative z-10 text-xs font-semibold text-white truncate">
                  {img.caption || `Visual Study 0${idx + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 4. LOOKBOOK GALLERY
  // -------------------------------------------------------------
  if (type === "lookbook_gallery") {
    const looks = Array.isArray(settings.looks) ? settings.looks : [];

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
              Lookbook Capsule
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Capsule Lookbook"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {looks.map((lk, idx) => (
              <div
                key={idx}
                className="rounded-2xl border overflow-hidden shadow-xs space-y-3 pb-4"
                style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
              >
                <div className="aspect-4/3 w-full bg-stone-200 relative overflow-hidden">
                  {lk.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lk.imageUrl} alt={lk.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                      Look Visual #{idx + 1}
                    </div>
                  )}
                </div>
                <div className="px-4 space-y-1">
                  <h4 className="font-bold text-xs sm:text-sm" style={{ color: tokens.text }}>
                    {lk.label}
                  </h4>
                  <p className="text-xs" style={{ color: tokens.textMuted }}>
                    {lk.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 5. BRAND VALUES & ETHOS
  // -------------------------------------------------------------
  if (type === "brand_values") {
    const values = Array.isArray(settings.values) ? settings.values : [];

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Commitments That Guide Every Release"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border space-y-3 shadow-2xs"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
                >
                  <Shield className="h-5 w-5" style={{ color: primaryColor }} />
                </div>
                <h4 className="font-bold text-sm" style={{ color: tokens.text }}>
                  {v.title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 6. TIMELINE & MILESTONES
  // -------------------------------------------------------------
  if (type === "timeline_milestones") {
    const milestones = Array.isArray(settings.milestones) ? settings.milestones : [];

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Our Heritage & Progression"}
            </h2>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                {settings.subtitle as string}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {milestones.map((ms, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-xl border"
                style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
              >
                <div
                  className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold shrink-0 border"
                  style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
                >
                  {ms.year}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold" style={{ color: tokens.text }}>
                    {ms.title}
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                    {ms.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return null;
}
