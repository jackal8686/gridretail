"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Store, PreviewUpdatePayload, StoreStylingTokens } from "@/types";
import { LeadForm } from "@/types/lead";
import { LeadFormRenderer } from "@/components/forms/LeadFormRenderer";
import { SectionRenderer } from "@/components/storefront/sections/SectionRenderer";
import { FooterSection } from "@/components/storefront/sections/FooterSection";
import { SectionInstance } from "@/types/section";
import { resolveStoreSections } from "@/lib/sections/resolver";
import { getThemeById } from "@/constants/themes";
import { getDesignTemplateById } from "@/constants/design-templates";
import { isAllowedPreviewOrigin, validatePreviewMessage } from "@/lib/security/preview-origin";
import { Modal } from "@/components/ui/Modal";
import { ArrowRight, Send, ShieldCheck, Menu, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface LeadGenWebsiteViewProps {
  store: Store;
  leadForm?: LeadForm;
  previewMode?: boolean;
}

export const LeadGenWebsiteView: React.FC<LeadGenWebsiteViewProps> = ({
  store,
  leadForm,
  previewMode = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reactive State for Live Customizer Synchronization
  const [activeThemeId, setActiveThemeId] = useState<string>(
    store.themeId || "theme_nordic_pine"
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    store.templateId || "tmpl_modern_minimal"
  );
  const [storeName, setStoreName] = useState(store.name);
  const [branding, setBranding] = useState(
    store.branding || {
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      fontFamily: "Inter, sans-serif",
      heroHeadline: "Strategic Solutions & Dedicated Advisory",
      heroSubheadline:
        store.description ||
        "Submit your inquiry to receive a tailored proposal and strategic consultation from our team.",
      aboutText: store.description || "",
      ctaText: "Request Consultation",
      logoUrl: "",
      bannerUrl: "",
    }
  );

  const [sections, setSections] = useState<SectionInstance[]>(() =>
    resolveStoreSections(store)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [styling, setStyling] = useState<StoreStylingTokens | undefined>(
    store.styling
  );
  const [enabledSections, setEnabledSections] = useState<string[]>(
    store.enabledSections || ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
  );
  const [orderedSections, setOrderedSections] = useState<string[]>(
    store.orderedSections || ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
  );

  // Active theme and template resolution
  const activeTheme = useMemo(() => getThemeById(activeThemeId), [activeThemeId]);
  const activeDesignTemplate = useMemo(
    () => getDesignTemplateById(activeTemplateId),
    [activeTemplateId]
  );
  const tokens = activeTheme.tokens;
  const isDark = activeTheme.isDark;
  const primaryColor = branding.primaryColor || tokens.primary;

  // Active steps and settings for the form
  const steps = leadForm?.publishedSteps || leadForm?.currentDraft?.steps || [];
  const settings = leadForm?.publishedSettings || leadForm?.currentDraft?.settings || {
    presentationMode: "embedded",
    layout: "two_column",
    submitButtonText: "Submit Request",
    postSubmissionAction: "message",
    successMessage: "Thank you! Your inquiry has been received.",
    enableHoneypot: true,
  };

  // Live postMessage listener for Customizer
  useEffect(() => {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "GRIDRETAIL_PREVIEW_READY", slug: store.slug },
        "*"
      );
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedPreviewOrigin(event.origin)) return;
      if (window.parent && window.parent !== window && event.source !== window.parent) return;

      const validation = validatePreviewMessage(event.data);
      if (!validation.valid) return;

      if (validation.type === "GRIDRETAIL_SECTION_SELECT") {
        const secId = validation.sectionId || null;
        setSelectedSectionId(secId);
        if (secId) {
          const el = document.getElementById(`sec-wrapper-${secId}`) || document.querySelector(`[data-section-id="${secId}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      if (validation.type !== "GRIDRETAIL_PREVIEW_UPDATE" || !validation.payload) {
        return;
      }

      const payload: PreviewUpdatePayload = validation.payload;

        if (payload.name !== undefined) setStoreName(payload.name);
        if (payload.themeId) setActiveThemeId(payload.themeId);
        if (payload.templateId) setActiveTemplateId(payload.templateId);

        if (payload.branding) {
          setBranding((prev) => ({
            ...prev,
            ...payload.branding,
            primaryColor: payload.branding?.primaryColor || prev.primaryColor,
            secondaryColor: payload.branding?.secondaryColor || prev.secondaryColor,
            fontFamily: payload.branding?.fontFamily || prev.fontFamily,
            heroHeadline: payload.branding?.heroHeadline ?? prev.heroHeadline,
            heroSubheadline: payload.branding?.heroSubheadline ?? prev.heroSubheadline,
            aboutText: payload.branding?.aboutText ?? prev.aboutText,
            ctaText: payload.branding?.ctaText ?? prev.ctaText,
            logoUrl: payload.branding?.logoUrl ?? prev.logoUrl,
            bannerUrl: payload.branding?.bannerUrl ?? prev.bannerUrl,
          }));
        }

        if (payload.enabledSections) setEnabledSections(payload.enabledSections);
        if (payload.orderedSections && Array.isArray(payload.orderedSections)) {
          setOrderedSections(payload.orderedSections);
        }

        if (payload.sections && Array.isArray(payload.sections)) {
          setSections(payload.sections);
        } else if (payload.orderedSections || payload.enabledSections || payload.branding) {
          setSections((prev) =>
            resolveStoreSections({
              ...store,
              name: payload.name ?? storeName,
              branding: payload.branding ? { ...branding, ...payload.branding } : branding,
              enabledSections: payload.enabledSections ?? enabledSections,
              orderedSections: payload.orderedSections ?? orderedSections,
              sections: prev && prev.length > 0 ? prev : undefined,
            })
          );
        }

        if (payload.styling) {
          setStyling((prev) => ({ ...prev, ...payload.styling }));
        }

        if (event.source && typeof (event.source as Window).postMessage === "function") {
          (event.source as Window).postMessage(
            { type: "GRIDRETAIL_PREVIEW_ACK", timestamp: Date.now() },
            event.origin
          );
        }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [store, storeName, branding, enabledSections, orderedSections]);

  const buttonRadiusClass =
    styling?.buttonRadius === "sharp"
      ? "rounded-none"
      : styling?.buttonRadius === "pill"
      ? "rounded-full"
      : "rounded-xl";

  const cardRadiusClass =
    styling?.cardStyle === "flat"
      ? "rounded-none border-0 shadow-none"
      : styling?.cardStyle === "elevated"
      ? "rounded-2xl border shadow-xl"
      : "rounded-2xl border shadow-xs";

  const handleSubmit = async (
    data: Record<string, unknown>,
    honeypotValue?: string
  ): Promise<{
    success: boolean;
    message?: string;
    redirectUrl?: string;
    error?: string;
  }> => {
    setIsSubmitting(true);
    try {
      if (!leadForm) {
        return { success: false, error: "Lead form is not configured." };
      }

      const res = await fetch(
        `/api/public/stores/${store.slug}/forms/${leadForm.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data,
            _website_url_trap: honeypotValue,
            isTest: previewMode,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json.error || "Submission failed.",
        };
      }

      return {
        success: true,
        message: json.message,
        redirectUrl: json.redirectUrl,
      };
    } catch {
      return {
        success: false,
        error: "Network error submitting form.",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Header according to active design template layout or styling headerVariation
  const renderHeader = () => {
    const layout = activeDesignTemplate.headerLayout;

    // Header Variation 1: Minimal Floating Pill
    if (styling?.headerVariation === "minimal" || (!styling?.headerVariation && layout === "floating-minimal")) {
      return (
        <header
          data-header-variation="minimal"
          className={cn(styling?.headerSticky !== false ? "sticky top-4" : "relative", "z-30 px-4 sm:px-6 max-w-6xl mx-auto w-full mb-2")}
        >
          <div
            className="backdrop-blur-md rounded-full border px-5 py-3 flex items-center justify-between shadow-sm transition-all"
            style={{
              backgroundColor: isDark ? "rgba(22, 31, 48, 0.85)" : "rgba(255, 255, 255, 0.9)",
              borderColor: tokens.border,
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {branding.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-7 sm:h-8 max-w-[100px] sm:max-w-[120px] object-contain shrink-0"
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {storeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm sm:text-base font-bold tracking-tight truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none" style={{ color: tokens.text }}>
                  {storeName}
                </span>
              </div>
              <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
                <a href="#inquiry-form" className="hover:opacity-100 transition-opacity">
                  Inquiry
                </a>
                <span className="text-stone-300">•</span>
                <span>Commercial Advisory</span>
              </nav>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <a
                href="#inquiry-form"
                className={cn("px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{branding.ctaText || "Request Consultation"}</span>
                <span className="sm:hidden">{branding.ctaText && branding.ctaText.length <= 10 ? branding.ctaText : "Inquire"}</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="md:hidden min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 rounded-full border text-stone-600 dark:text-stone-300 shrink-0"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden rounded-2xl border mt-2 p-3 space-y-2 text-xs font-medium backdrop-blur-md" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
              <a href="#inquiry-form" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Inquiry Form</a>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">About Organization</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">FAQ</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 2: Corporate Multi-Tier
    if (styling?.headerVariation === "corporate") {
      return (
        <header
          data-header-variation="corporate"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 w-full border-b shadow-xs transition-colors")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="border-b py-1.5 px-4 sm:px-6 text-[10px] sm:text-[11px] flex items-center justify-between" style={{ backgroundColor: tokens.background, borderColor: tokens.border, color: tokens.textMuted }}>
            <div className="flex items-center gap-2 sm:gap-4 truncate">
              <span className="truncate">{storeName} — Commercial Strategy &amp; Advisory</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Direct Inquiry Review</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span>Direct Client Desk</span>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm sm:text-lg font-bold tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none" style={{ color: tokens.text }}>{storeName}</span>
            </div>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#inquiry-form" className="hover:underline">Advisory Inquiry</a>
              <a href="#benefits" className="hover:underline">Core Methodology</a>
              <a href="#faq" className="hover:underline">FAQ</a>
            </nav>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <a
                href="#inquiry-form"
                className={cn("px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{branding.ctaText || "Request Consultation"}</span>
                <span className="sm:hidden">{branding.ctaText && branding.ctaText.length <= 10 ? branding.ctaText : "Inquire"}</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="md:hidden min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-lg border text-stone-600 dark:text-stone-300 shrink-0"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t px-4 py-3 space-y-2 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#inquiry-form" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Advisory Inquiry</a>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practice Overview</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">FAQ</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 3: Centered Logo
    if (styling?.headerVariation === "centered_logo") {
      return (
        <header
          data-header-variation="centered_logo"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b backdrop-blur-md py-4 px-4 sm:px-6 transition-colors")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <nav className="hidden md:flex items-center gap-5 text-xs font-serif uppercase tracking-widest" style={{ color: tokens.textMuted }}>
              <a href="#inquiry-form" className="hover:underline">Inquiry</a>
              <a href="#about" className="hover:underline">Practice</a>
            </nav>
            <div className="text-center min-w-0">
              <span className="text-base sm:text-xl font-serif font-bold tracking-widest uppercase truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none block" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <a
                href="#inquiry-form"
                className={cn("px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span className="hidden sm:inline">{branding.ctaText || "Request Consultation"}</span>
                <span className="sm:hidden">{branding.ctaText && branding.ctaText.length <= 10 ? branding.ctaText : "Inquire"}</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="md:hidden min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-lg border text-stone-600 dark:text-stone-300 shrink-0"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 px-4 space-y-2 text-xs font-serif uppercase tracking-widest" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#inquiry-form" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Inquiry</a>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practice</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 4: Transparent Glass
    if (styling?.headerVariation === "transparent") {
      return (
        <header
          data-header-variation="transparent"
          className={cn(styling?.headerSticky !== false ? "sticky top-3" : "relative", "z-30 px-4 sm:px-6 max-w-5xl mx-auto w-full mb-3")}
        >
          <div
            className="backdrop-blur-md rounded-2xl border px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xs gap-2"
            style={{ backgroundColor: `${tokens.surface}B3`, borderColor: tokens.border }}
          >
            <span className="text-sm sm:text-base font-bold tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none" style={{ color: tokens.text }}>{storeName}</span>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#inquiry-form" className="hover:underline">Consultation Desk</a>
              <a href="#faq" className="hover:underline">Process</a>
            </nav>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <a
                href="#inquiry-form"
                className={cn("px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span className="hidden sm:inline">{branding.ctaText || "Request Consultation"}</span>
                <span className="sm:hidden">{branding.ctaText && branding.ctaText.length <= 10 ? branding.ctaText : "Inquire"}</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="md:hidden min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-lg border text-stone-600 dark:text-stone-300 shrink-0"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden rounded-2xl border mt-2 p-3 space-y-2 text-xs font-medium backdrop-blur-md" style={{ backgroundColor: `${tokens.surface}FA`, borderColor: tokens.border }}>
              <a href="#inquiry-form" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Consultation Desk</a>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">About</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Process FAQ</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 5: Commerce Cart Header (Graceful fallback)
    if (styling?.headerVariation === "commerce_cart") {
      return (
        <header
          data-header-variation="commerce_cart"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b backdrop-blur-md transition-colors")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
            <span className="text-sm sm:text-lg font-bold tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none" style={{ color: tokens.text }}>{storeName}</span>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#inquiry-form" className="hover:underline">Inquiry</a>
              <a href="#about" className="hover:underline">About</a>
            </nav>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <a
                href="#inquiry-form"
                className={cn("px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{branding.ctaText || "Inquire"}</span>
                <span className="sm:hidden">{branding.ctaText && branding.ctaText.length <= 10 ? branding.ctaText : "Inquire"}</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="md:hidden min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-lg border text-stone-600 dark:text-stone-300 shrink-0"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t px-4 py-3 space-y-3 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a
                href="#inquiry-form"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn("w-full py-2.5 px-4 text-xs font-semibold text-white shadow-xs flex items-center justify-center gap-2", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-3.5 w-3.5" />
                <span>{branding.ctaText || "Submit Inquiry"}</span>
              </a>
              <div className="pt-1 space-y-2">
                <a href="#inquiry-form" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Inquiry</a>
                <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">About</a>
              </div>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 6: Appointment CTA (Graceful fallback)
    if (styling?.headerVariation === "appointment_cta") {
      return (
        <header
          data-header-variation="appointment_cta"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b backdrop-blur-md transition-colors")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
            <span className="text-sm sm:text-lg font-bold tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none" style={{ color: tokens.text }}>{storeName}</span>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <a
                href="#inquiry-form"
                className={cn("px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span className="hidden sm:inline">{branding.ctaText || "Book Consultation"}</span>
                <span className="sm:hidden">{branding.ctaText && branding.ctaText.length <= 10 ? branding.ctaText : "Book"}</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="md:hidden min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-lg border text-stone-600 dark:text-stone-300 shrink-0"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t px-4 py-3 space-y-3 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a
                href="#inquiry-form"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn("w-full py-2.5 px-4 text-xs font-semibold text-white shadow-xs flex items-center justify-center gap-2", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>{branding.ctaText || "Book Consultation"}</span>
              </a>
              <div className="pt-1 space-y-2">
                <a href="#inquiry-form" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Inquiry</a>
              </div>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 7 / Default Lead Inquiry
    return (
      <header
        data-header-variation={styling?.headerVariation || "lead_inquiry"}
        className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b backdrop-blur-md transition-colors")}
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {branding.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={branding.logoUrl}
                alt={storeName}
                className="h-7 sm:h-9 max-w-[100px] sm:max-w-[140px] object-contain shrink-0"
              />
            ) : (
              <div
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm sm:text-lg font-bold tracking-tight block leading-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none" style={{ color: tokens.text }}>
                {storeName}
              </span>
              <span className="text-[10px] font-medium tracking-wide uppercase hidden sm:block truncate" style={{ color: tokens.accent }}>
                Commercial Lead &amp; Strategy Advisory
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <a
              href="#inquiry-form"
              className={cn(
                "px-2.5 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 transition-all hover:opacity-90 cursor-pointer whitespace-nowrap shrink-0",
                buttonRadiusClass
              )}
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline">{branding.ctaText || "Submit Inquiry"}</span>
              <span className="sm:hidden">{branding.ctaText && branding.ctaText.length <= 10 ? branding.ctaText : "Inquire"}</span>
            </a>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              className="md:hidden min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-lg border text-stone-600 dark:text-stone-300 shrink-0"
              style={{ borderColor: tokens.border }}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-3 space-y-3 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
            <a
              href="#inquiry-form"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn("w-full py-2.5 px-4 text-xs font-semibold text-white shadow-xs flex items-center justify-center gap-2", buttonRadiusClass)}
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="h-3.5 w-3.5" />
              <span>{branding.ctaText || "Submit Strategic Inquiry"}</span>
            </a>
            <div className="pt-1 space-y-2">
              <a href="#inquiry-form" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Submit Inquiry</a>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">About</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">FAQ</a>
            </div>
          </div>
        )}
      </header>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors w-full max-w-full overflow-x-hidden selection:bg-black/10"
      style={{
        fontFamily: branding.fontFamily,
        backgroundColor: tokens.background,
        color: tokens.text,
        // CSS Custom Properties for theme tokens
        ["--theme-primary" as string]: primaryColor,
        ["--theme-secondary" as string]: tokens.secondary,
        ["--theme-accent" as string]: tokens.accent,
        ["--theme-background" as string]: tokens.background,
        ["--theme-surface" as string]: tokens.surface,
        ["--theme-text" as string]: tokens.text,
        ["--theme-text-muted" as string]: tokens.textMuted,
        ["--theme-border" as string]: tokens.border,
        ["--theme-card-bg" as string]: tokens.cardBg,
        ["--theme-badge-bg" as string]: tokens.badgeBg,
        ["--theme-badge-text" as string]: tokens.badgeText,
      }}
    >
      {/* Top Demo / Preview Status Indicator */}
      <div
        className="py-1.5 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2 border-b"
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          color: tokens.textMuted,
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="truncate">
          <strong>GridRetail {previewMode ? "Lead Generation Preview" : "Lead Generation Site"}</strong> — Layout: <em>{activeDesignTemplate.name}</em> • Theme: <em>{activeTheme.name}</em>
        </span>
      </div>

      {/* Dynamic Header */}
      {renderHeader()}

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Render Modular Sections */}
        {sections
          .filter((sec) => sec.visible && sec.type !== "footer_custom")
          .map((sec) => (
            <SectionRenderer
              key={sec.id}
              instance={sec}
              tokens={tokens}
              styling={styling}
              primaryColor={primaryColor}
              storeSlug={store.slug}
              storeName={storeName}
              clientName={store.clientName || storeName}
              products={[]}
              categories={[]}
              onQuickAdd={() => {}}
              addedItems={{}}
              activeDesignTemplate={activeDesignTemplate}
              branding={branding}
              isSelected={selectedSectionId === sec.id}
            />
          ))}

        {/* Embedded Lead Capture Section */}
        {settings.presentationMode === "embedded" && steps.length > 0 && (
          <section
            id="inquiry-form"
            className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-b transition-colors scroll-mt-20"
            style={{
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
            }}
          >
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border inline-block"
                  style={{
                    backgroundColor: tokens.badgeBg,
                    borderColor: tokens.border,
                    color: tokens.badgeText,
                  }}
                >
                  {leadForm?.name || "Direct Strategic Inquiry"}
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: tokens.text }}>
                  {leadForm?.description || "Request a Tailored Proposal & Consultation"}
                </h2>
                <p className="text-xs sm:text-sm max-w-xl mx-auto leading-relaxed" style={{ color: tokens.textMuted }}>
                  Complete our questionnaire below. Our senior advisory team will review your requirements and provide a confidential response within 1 business day.
                </p>
              </div>

              <div
                className={cn(cardRadiusClass, "p-6 sm:p-10 border transition-all")}
                style={{
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.border,
                }}
              >
                <LeadFormRenderer
                  steps={steps}
                  settings={settings}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          </section>
        )}

        {/* Modal Trigger Banner if Presentation is 'modal' */}
        {settings.presentationMode === "modal" && (
          <section
            className="py-16 px-4 text-center text-white transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="max-w-2xl mx-auto space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/20 border border-white/30 inline-block">
                Project Intake Open
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ready to Advance Your Project?</h3>
              <p className="text-sm opacity-90 max-w-lg mx-auto">
                Open our interactive advisory questionnaire to request tailored proposal scope, milestone estimates, and strategy.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={cn("px-6 py-3 bg-white text-[#18231E] hover:bg-stone-100 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer", buttonRadiusClass)}
                >
                  <span>{settings.triggerButtonText || "Launch Project Questionnaire"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal Popup */}
      {settings.presentationMode === "modal" && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={leadForm?.name || "Submit Strategic Inquiry"}
        >
          <div className="p-4 sm:p-6" style={{ backgroundColor: tokens.surface, color: tokens.text }}>
            <LeadFormRenderer
              steps={steps}
              settings={settings}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </Modal>
      )}

      {/* Footer Section */}
      <FooterSection
        instance={{
          id: "default_footer",
          type: "footer_custom",
          order: 99,
          visible: true,
          layoutVariant: styling?.footerVariation || "contact_focused",
          settings: {},
        }}
        tokens={tokens}
        styling={styling}
        primaryColor={primaryColor}
        storeName={storeName}
        clientName={store.clientName}
        storeSlug={store.slug}
        categories={[]}
      />
    </div>
  );
};
