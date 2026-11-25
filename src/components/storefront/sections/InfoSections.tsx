"use client";

import React, { useState } from "react";
import { SectionInstance } from "@/types/section";
import { ColorThemeTokens } from "@/types/template";
import { StoreStylingTokens } from "@/types/store";
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Leaf,
  ChevronDown,
  Mail,
  Award,
  CheckCircle2,
  Phone,
  Clock,
  MapPin,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface InfoSectionsProps {
  instance: SectionInstance;
  tokens: ColorThemeTokens;
  styling?: StoreStylingTokens;
  primaryColor: string;
}

export function InfoSections({ instance, tokens, styling, primaryColor }: InfoSectionsProps) {
  const { type } = instance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (instance.settings || {}) as Record<string, any>;
  const settings = s;
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const buttonRadiusClass =
    styling?.buttonRadius === "sharp"
      ? "rounded-none"
      : styling?.buttonRadius === "pill"
      ? "rounded-full"
      : "rounded-lg";

  // -------------------------------------------------------------
  // 1. BENEFITS & VALUE PILLARS
  // -------------------------------------------------------------
  if (type === "benefits_grid") {
    const iconMap: Record<string, React.ReactNode> = {
      Truck: <Truck className="h-5 w-5" style={{ color: primaryColor }} />,
      ShieldCheck: <ShieldCheck className="h-5 w-5" style={{ color: primaryColor }} />,
      RotateCcw: <RotateCcw className="h-5 w-5" style={{ color: primaryColor }} />,
      Leaf: <Leaf className="h-5 w-5" style={{ color: primaryColor }} />,
    };

    const benefits = Array.isArray(settings.benefits) ? settings.benefits : [];
    if (benefits.length === 0) return null;

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-1">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Why Discerning Clients Choose Us"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border flex flex-col items-center text-center space-y-3 shadow-2xs hover:shadow-md transition-shadow"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border }}
                >
                  {iconMap[b.iconName] || <CheckCircle2 className="h-5 w-5" style={{ color: primaryColor }} />}
                </div>
                <h4 className="font-bold text-sm" style={{ color: tokens.text }}>
                  {b.title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 2. HOW IT WORKS
  // -------------------------------------------------------------
  if (type === "how_it_works") {
    const steps = Array.isArray(settings.steps) ? settings.steps : [];

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-1">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "How It Works"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border space-y-3 relative"
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
              >
                <span
                  className="w-8 h-8 rounded-full border text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText, borderColor: tokens.border }}
                >
                  {st.step || idx + 1}
                </span>
                <h3 className="font-bold text-sm" style={{ color: tokens.text }}>
                  {st.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                  {st.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 3. FAQ ACCORDION
  // -------------------------------------------------------------
  if (type === "faq_accordion") {
    const rawFaqs = Array.isArray(settings.faqs) ? settings.faqs : [];
    const defaultFaqs = [
      {
        question: "What are your standard studio production lead times?",
        answer: "In-stock catalog pieces dispatch within 2 business days. Bespoke commissioned woodwork or hand-thrown ceramics require 3–4 weeks for careful curing and hand-waxing.",
      },
      {
        question: "How does the 30-day in-home trial work?",
        answer: "We want you to live with your pieces in natural light. If an item does not suit your space, initiate a return within 30 days for a full refund and prepaid courier collection.",
      },
      {
        question: "Do you ship internationally with import duties covered?",
        answer: "Yes. All international consignments are shipped Delivery Duty Paid (DDP). The price you see at checkout is final with no surprise customs fees upon arrival.",
      },
      {
        question: "How do I care for and maintain natural oiled finishes?",
        answer: "We include an organic beeswax maintenance balm with every wooden order. Apply lightly once every six months with a clean microfiber cloth to preserve luster.",
      },
    ];

    const faqs = rawFaqs.length > 0 ? rawFaqs : defaultFaqs;
    const isTwoColumn = instance.layoutVariant === "split_two_column";
    const sectionTitle = (settings.title as string) || (settings.headline as string) || "Frequently Asked Questions";

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {sectionTitle}
            </h2>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                {settings.subtitle as string}
              </p>
            )}
          </div>

          <div className={cn(isTwoColumn ? "grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0" : "space-y-3")}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              const question = faq.question || (faq as Record<string, string>).q || (faq as Record<string, string>).title || "Frequently Asked Question";
              const answer = faq.answer || (faq as Record<string, string>).a || (faq as Record<string, string>).content || "Details regarding our store and fulfillment policies.";

              return (
                <div
                  key={idx}
                  className="rounded-2xl border overflow-hidden transition-all duration-200"
                  style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full min-h-[52px] px-6 py-4 flex items-center justify-between text-left gap-4 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                    style={{ color: tokens.text }}
                    aria-expanded={isOpen}
                  >
                    <span>{question}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                      style={{ color: primaryColor }}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className="px-6 pb-4 pt-1 text-xs leading-relaxed border-t"
                      style={{ borderColor: tokens.border, color: tokens.textMuted }}
                    >
                      {answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 4. SHIPPING & RETURNS POLICY
  // -------------------------------------------------------------
  if (type === "shipping_returns") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Order Fulfillment & Support Policy"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="p-6 rounded-2xl border space-y-2 shadow-2xs"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <Truck className="h-6 w-6 mb-2" style={{ color: primaryColor }} />
              <h3 className="font-bold text-sm" style={{ color: tokens.text }}>
                {(settings.deliveryTitle as string) || "Order Dispatch & Handling"}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                {(settings.deliveryText as string) || "Orders are processed directly by our studio team in accordance with regional fulfillment guidelines."}
              </p>
            </div>

            <div
              className="p-6 rounded-2xl border space-y-2 shadow-2xs"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <RotateCcw className="h-6 w-6 mb-2" style={{ color: primaryColor }} />
              <h3 className="font-bold text-sm" style={{ color: tokens.text }}>
                {(settings.returnTitle as string) || "Exchange & Assistance"}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                {(settings.returnText as string) || "Please contact our support team with your order reference for order modifications or assistance."}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 5. CONTACT & CONCIERGE
  // -------------------------------------------------------------
  if (type === "contact_info") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.headline as string) || "We are Here to Assist Your Project"}
            </h2>
          </div>

          <div
            className="p-8 rounded-3xl border shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-6"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs">
                <Mail className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span className="font-semibold" style={{ color: tokens.text }}>
                  {(settings.email as string) || "concierge@gridretail.internal"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Phone className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span className="font-semibold" style={{ color: tokens.text }}>
                  {(settings.phone as string) || "+1 (800) 474-3738"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs">
                <Clock className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span style={{ color: tokens.textMuted }}>
                  {(settings.hours as string) || "Monday – Friday, 09:00 – 18:00 EST"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                <span style={{ color: tokens.textMuted }}>
                  {(settings.address as string) || "Studio 4B, 108 Mercer Street, New York"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 6. NEWSLETTER SUBSCRIPTION
  // -------------------------------------------------------------
  if (type === "newsletter_signup") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: tokens.text }}>
            {(settings.title as string) || "Stay in Touch with the Atelier"}
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
            {(settings.subtitle as string) || "Subscribe to receive product announcements, catalog releases, and store updates."}
          </p>

          {newsletterSubscribed ? (
            <div
              className="p-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold"
              style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{(settings.successMessage as string) || "Thank you for joining our private dispatch list."}</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail.trim()) {
                  setNewsletterSubscribed(true);
                }
              }}
              className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={(settings.placeholder as string) || "Enter client email address..."}
                className="min-h-[44px] w-full rounded-lg border px-3.5 py-2.5 text-xs focus:outline-hidden"
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.text }}
              />
              <button
                type="submit"
                className={cn("min-h-[44px] px-6 py-2.5 text-xs font-semibold text-white whitespace-nowrap cursor-pointer shrink-0 shadow-xs", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                {(settings.buttonText as string) || "Subscribe"}
              </button>
            </form>
          )}
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 7. ANNOUNCEMENT STRIP
  // -------------------------------------------------------------
  if (type === "announcement_strip") {
    return (
      <aside
        data-anchor={`section.${instance.id}`}
        className="py-2.5 px-4 text-xs border-b flex items-center justify-center gap-2 text-center"
        style={{
          backgroundColor: tokens.badgeBg,
          borderColor: tokens.border,
          color: tokens.badgeText,
        }}
      >
        <Megaphone className="h-3.5 w-3.5 shrink-0" style={{ color: primaryColor }} />
        <span>{settings.message as string}</span>
        {settings.actionText && (
          <a
            href={(settings.actionUrl as string) || "#"}
            className="underline font-semibold ml-1 hover:opacity-80"
          >
            {settings.actionText as string}
          </a>
        )}
      </aside>
    );
  }

  // -------------------------------------------------------------
  // 8. TRUST BADGES
  // -------------------------------------------------------------
  if (type === "trust_badges") {
    const rawBadges = Array.isArray(settings.badges) ? settings.badges : [];
    const defaultBadges = [
      { label: "Direct Support", sublabel: "Responsive merchant communication" },
      { label: "Detailed Specifications", sublabel: "Accurate product dimensions and attributes" },
      { label: "Clear Store Policies", sublabel: "Transparent order and customer terms" },
      { label: "Secure Processing", sublabel: "Standard verified checkout mechanisms" },
    ];
    const badges = rawBadges.length > 0 ? rawBadges : defaultBadges;
    const isCardsGrid = instance.layoutVariant === "cards_grid";
    const sectionTitle = (settings.title as string) || (settings.headline as string) || "Store Standards & Values";

    const badgeIcons = [
      <Award key="award" className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />,
      <ShieldCheck key="shield" className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />,
      <Leaf key="leaf" className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />,
      <CheckCircle2 key="check" className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />,
    ];

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-10 sm:py-16 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {sectionTitle}
            </h2>
          </div>

          {isCardsGrid ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {badges.map((b, idx) => {
                const label = b.label || (b as Record<string, string>).title || "Store Standard";
                const sublabel = b.sublabel || (b as Record<string, string>).description || "Published store policy";
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border flex items-center gap-3.5 shadow-2xs"
                    style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0"
                      style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border }}
                    >
                      {badgeIcons[idx % badgeIcons.length]}
                    </div>
                    <div>
                      <span className="block font-bold text-xs" style={{ color: tokens.text }}>
                        {label}
                      </span>
                      <span className="block text-[11px] leading-tight mt-0.5" style={{ color: tokens.textMuted }}>
                        {sublabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-around gap-6 text-center pt-2">
              {badges.map((b, idx) => {
                const label = b.label || (b as Record<string, string>).title || "Store Standard";
                const sublabel = b.sublabel || (b as Record<string, string>).description || "Published store policy";
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
                      style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border }}
                    >
                      {badgeIcons[idx % badgeIcons.length]}
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-xs" style={{ color: tokens.text }}>
                        {label}
                      </span>
                      <span className="block text-[10px]" style={{ color: tokens.textMuted }}>
                        {sublabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // VERIFIED STATISTICS BAR
  // -------------------------------------------------------------
  if (type === "verified_statistics_bar") {
    return (
      <VerifiedStatisticsBarSection
        instance={instance}
        tokens={tokens}
        styling={styling}
        primaryColor={primaryColor}
      />
    );
  }

  // -------------------------------------------------------------
  // 9. CUSTOM RICH TEXT
  // -------------------------------------------------------------
  if (type === "custom_rich_text") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center" style={{ color: tokens.text }}>
            {(settings.title as string) || "Editorial Dispatch"}
          </h2>
          <div className="prose text-xs sm:text-sm leading-relaxed text-center space-y-3" style={{ color: tokens.textMuted }}>
            <p>{settings.content as string}</p>
          </div>
          {(settings.signatureName || settings.signatureTitle) && (
            <div className="pt-4 text-center border-t max-w-xs mx-auto" style={{ borderColor: tokens.border }}>
              <span className="block font-bold text-xs" style={{ color: tokens.text }}>
                {settings.signatureName as string}
              </span>
              <span className="block text-[10px]" style={{ color: tokens.textMuted }}>
                {settings.signatureTitle as string}
              </span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
}

export interface MetricItem {
  value: string;
  label: string;
  sublabel?: string;
  verified?: boolean;
}

export function VerifiedStatisticsBarSection({
  instance,
  tokens,
  styling,
  primaryColor,
}: {
  instance: SectionInstance;
  tokens: ColorThemeTokens;
  styling?: StoreStylingTokens;
  primaryColor: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (instance.settings || {}) as Record<string, any>;
  const rawItems = (
    Array.isArray(settings.items)
      ? settings.items
      : Array.isArray(settings.metrics)
      ? settings.metrics
      : []
  ) as Array<Record<string, unknown>>;

  // Only display metrics with real, store-owner-supplied values (exclude unverified defaults and empty placeholders)
  const confirmedItems: MetricItem[] = [];
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const val =
      typeof it.value === "string"
        ? it.value.trim()
        : it.value !== undefined && it.value !== null
        ? String(it.value).trim()
        : "";
    const lbl =
      typeof it.label === "string"
        ? it.label.trim()
        : it.label !== undefined && it.label !== null
        ? String(it.label).trim()
        : "";
    if (!val || val === "--" || val === "..." || val === "-") continue;
    if (!lbl || lbl.toLowerCase() === "metric label" || lbl.toLowerCase().includes("placeholder")) continue;
    confirmedItems.push({
      value: val,
      label: lbl,
      sublabel: typeof it.sublabel === "string" ? it.sublabel : undefined,
      verified: it.verified === true,
    });
  }

  // If no confirmed metrics have been entered by the store owner, do NOT display placeholder metrics as verified facts
  if (confirmedItems.length === 0) {
    return null;
  }

  const items = confirmedItems;
  const isBoxedCards = instance.layoutVariant === "boxed_cards";
  const sectionTitle =
    (settings.title as string) || (settings.headline as string) || "Key Performance Indicators";
  const badge = (settings.badge as string) || "";

  const contentWidthClass =
    styling?.contentWidth === "compact"
      ? "max-w-4xl"
      : styling?.contentWidth === "wide"
      ? "max-w-7xl"
      : "max-w-6xl";

  return (
    <section
      data-anchor={`section.${instance.id}`}
      data-section-type="verified_statistics_bar"
      className="py-12 sm:py-16 px-4 sm:px-8 border-b"
      style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
    >
      <div className={cn("mx-auto space-y-8", contentWidthClass)}>
        <div className="text-center space-y-1.5">
          {badge && (
            <span
              className="text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
              style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText, borderColor: tokens.border }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{badge}</span>
            </span>
          )}
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
            {sectionTitle}
          </h2>
        </div>

        {isBoxedCards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl border text-center space-y-2 shadow-xs transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <span className="block text-3xl sm:text-4xl font-extrabold tracking-tight font-mono" style={{ color: primaryColor }}>
                  {item.value}
                </span>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm sm:text-base" style={{ color: tokens.text }}>
                    {item.label}
                  </span>
                  {item.verified === true && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                      title="Explicitly verified metric"
                      data-metric-verified="true"
                    >
                      <CheckCircle2 className="h-3 w-3 inline text-emerald-600 dark:text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
                {item.sublabel && (
                  <span className="block text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
                    {item.sublabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x border-y sm:border rounded-2xl p-6 sm:p-8" style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}>
            {items.map((item, idx) => (
              <div key={idx} className="text-center space-y-1.5 px-4 py-2">
                <span className="block text-3xl sm:text-4xl font-extrabold tracking-tight font-mono" style={{ color: primaryColor }}>
                  {item.value}
                </span>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm" style={{ color: tokens.text }}>
                    {item.label}
                  </span>
                  {item.verified === true && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                      title="Explicitly verified metric"
                      data-metric-verified="true"
                    >
                      <CheckCircle2 className="h-3 w-3 inline text-emerald-600 dark:text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
                {item.sublabel && (
                  <span className="block text-[11px] leading-tight" style={{ color: tokens.textMuted }}>
                    {item.sublabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
