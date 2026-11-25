"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SectionInstance } from "@/types/section";
import { ColorThemeTokens } from "@/types/template";
import { StoreCategory } from "@/types";
import { StoreStylingTokens } from "@/types/store";
import {
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Lock,
  Calendar,
  CheckCircle2,
  Send,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface FooterSectionProps {
  instance: SectionInstance;
  tokens: ColorThemeTokens;
  styling?: StoreStylingTokens;
  primaryColor: string;
  storeName: string;
  clientName: string;
  storeSlug: string;
  categories: StoreCategory[];
}

export function FooterSection({
  instance,
  tokens,
  styling,
  primaryColor,
  storeName,
  clientName,
  storeSlug,
  categories,
}: FooterSectionProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (instance.settings || {}) as Record<string, any>;
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const buttonRadiusClass =
    styling?.buttonRadius === "sharp"
      ? "rounded-none"
      : styling?.buttonRadius === "pill"
      ? "rounded-full"
      : "rounded-lg";

  const contentWidthClass =
    styling?.contentWidth === "compact"
      ? "max-w-5xl"
      : styling?.contentWidth === "wide"
      ? "max-w-7xl"
      : "max-w-6xl";

  // Determine footer variation: styling takes precedence, then instance layoutVariant
  let activeVariation = styling?.footerVariation;
  if (!activeVariation) {
    if (
      instance.layoutVariant &&
      [
        "minimal_inline",
        "multi_column",
        "business_info",
        "commerce_directory",
        "service_practitioner",
        "contact_focused",
      ].includes(instance.layoutVariant)
    ) {
      activeVariation = instance.layoutVariant as NonNullable<StoreStylingTokens["footerVariation"]>;
    } else {
      activeVariation = "multi_column";
    }
  }

  const copyrightText =
    (settings.copyrightNotice as string) ||
    `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`;

  // -------------------------------------------------------------
  // VARIATION 1: MINIMAL INLINE
  // -------------------------------------------------------------
  if (activeVariation === "minimal_inline") {
    return (
      <footer
        data-anchor="section.footer"
        data-footer-variation="minimal_inline"
        className="border-t py-8 px-4 sm:px-8 text-xs transition-colors"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.textMuted }}
      >
        <div className={cn("mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left", contentWidthClass)}>
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: tokens.text }}>
              {storeName}
            </span>
            <span>—</span>
            <span>{copyrightText}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <a href="#privacy" className="hover:underline">
              Privacy Notice
            </a>
            <a href="#terms" className="hover:underline">
              Terms of Engagement
            </a>
            {settings.showEngineBadge !== false && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: primaryColor }}>
                GridRetail Engine
              </span>
            )}
          </div>
        </div>
      </footer>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 2: MULTI-COLUMN (Standard 4-Column Directory)
  // -------------------------------------------------------------
  if (activeVariation === "multi_column") {
    return (
      <footer
        data-anchor="section.footer"
        data-footer-variation="multi_column"
        className="border-t py-12 px-4 sm:px-8 text-xs transition-colors"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.textMuted }}
      >
        <div className={cn("mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10", contentWidthClass)}>
          {/* Brand Column */}
          <div className="space-y-3">
            <span className="font-bold text-sm tracking-tight" style={{ color: tokens.text }}>
              {storeName}
            </span>
            <p className="text-xs leading-relaxed max-w-sm">
              {(settings.brandBio as string) ||
                `Curated storefront and digital platform demonstration tailored for ${clientName}.`}
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px]">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Digital Storefront Platform</span>
            </div>
          </div>

          {/* Collections / Offerings Links */}
          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Offerings
            </span>
            <ul className="space-y-1.5">
              <li>
                <Link href={`/store/${storeSlug}/collections`} className="hover:underline">
                  All Collections
                </Link>
              </li>
              {categories.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/store/${storeSlug}/collections/${c.slug || c.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Client Service */}
          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Client Care
            </span>
            <ul className="space-y-1.5">
              <li>
                <a href="#faq" className="hover:underline">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="#shipping" className="hover:underline">
                  Service &amp; Delivery Standards
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:underline">
                  Concierge Inquiries
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Stay Updated
            </span>
            <p className="text-[11px] leading-relaxed">
              Subscribe for catalog updates and store announcements.
            </p>
            {newsletterSubscribed ? (
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Thank you for subscribing!</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail) setNewsletterSubscribed(true);
                }}
                className="space-y-2 pt-1"
              >
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    aria-label="Email address for newsletter"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border text-xs flex-1 outline-hidden"
                    style={{ borderColor: tokens.border, backgroundColor: tokens.background, color: tokens.text }}
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe to newsletter"
                    className={cn("px-3 py-1.5 text-xs font-semibold text-white cursor-pointer shrink-0", buttonRadiusClass)}
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className={cn("mx-auto border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]", contentWidthClass)} style={{ borderColor: tokens.border }}>
          <span>{copyrightText}</span>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <a href="#terms" className="hover:underline">Terms of Service</a>
            {settings.showEngineBadge !== false && (
              <span className="font-semibold" style={{ color: primaryColor }}>Powered by GridRetail</span>
            )}
          </div>
        </div>
      </footer>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 3: BUSINESS INFO (Corporate & Physical Details)
  // -------------------------------------------------------------
  if (activeVariation === "business_info") {
    return (
      <footer
        data-anchor="section.footer"
        data-footer-variation="business_info"
        className="border-t py-12 px-4 sm:px-8 text-xs transition-colors"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.textMuted }}
      >
        <div className={cn("mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-10", contentWidthClass)}>
          {/* Company Details */}
          <div className="space-y-3">
            <span className="font-bold text-sm tracking-tight" style={{ color: tokens.text }}>
              {storeName} Business Directory
            </span>
            <p className="text-xs leading-relaxed">
              {(settings.businessDescription as string) ||
                `Commercial storefront entity managed under dedicated terms for ${clientName}.`}
            </p>
            {(settings.registrationNo || settings.jurisdiction) && (
              <div className="pt-2 text-[11px] space-y-1">
                {settings.registrationNo && <div>Registration No: {settings.registrationNo as string}</div>}
                {settings.jurisdiction && <div>Jurisdiction: {settings.jurisdiction as string}</div>}
              </div>
            )}
          </div>

          {/* Office Hours & Scheduling */}
          <div className="space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Operating Hours
            </span>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-stone-400" />
                <span>{(settings.operatingHours as string) || "Monday – Friday: Standard Business Hours"}</span>
              </div>
              {settings.weekendHours && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-stone-400" />
                  <span>{settings.weekendHours as string}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Direct Contact
            </span>
            <div className="space-y-2">
              {settings.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-stone-400" />
                  <span>{settings.address as string}</span>
                </div>
              )}
              {settings.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-stone-400" />
                  <span>{settings.phone as string}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-stone-400" />
                <span>advisory@{storeSlug || "brand"}.gridretail.demo</span>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("mx-auto border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]", contentWidthClass)} style={{ borderColor: tokens.border }}>
          <span>{copyrightText}</span>
          <span className="font-semibold" style={{ color: primaryColor }}>GridRetail Enterprise Infrastructure</span>
        </div>
      </footer>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 4: COMMERCE DIRECTORY (E-commerce Focused)
  // -------------------------------------------------------------
  if (activeVariation === "commerce_directory") {
    return (
      <footer
        data-anchor="section.footer"
        data-footer-variation="commerce_directory"
        className="border-t py-12 px-4 sm:px-8 text-xs transition-colors"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.textMuted }}
      >
        <div className={cn("mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10", contentWidthClass)}>
          {/* Brand & Shopping Confidence */}
          <div className="space-y-3">
            <span className="font-bold text-sm tracking-tight" style={{ color: tokens.text }}>
              {storeName}
            </span>
            <p className="text-xs leading-relaxed">
              {(settings.brandBio as string) || "Authentic design essentials crafted for enduring quality and curated everyday utility."}
            </p>
            <div className="p-3 rounded-lg border text-[11px] space-y-1.5" style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}>
              <div className="flex items-center gap-1.5 font-semibold" style={{ color: tokens.text }}>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Storefront Customer Care</span>
              </div>
              <p className="text-[10px]">Contact our dedicated team for catalog questions and order assistance.</p>
            </div>
          </div>

          {/* Shop Categories */}
          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Shop Catalog
            </span>
            <ul className="space-y-1.5">
              <li>
                <Link href={`/store/${storeSlug}/collections`} className="hover:underline">
                  All Collections
                </Link>
              </li>
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/store/${storeSlug}/collections/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="hover:underline"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Shipping & Support */}
          <div className="space-y-2">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Order Care
            </span>
            <ul className="space-y-1.5">
              <li>
                <a href="#catalog" className="hover:underline">
                  Browse Catalog
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:underline">
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="#about" className="hover:underline">
                  About the Store
                </a>
              </li>
            </ul>
          </div>

          {/* Checkout & Platform Notice */}
          <div className="space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Simulated Checkout
            </span>
            <p className="text-[11px] leading-relaxed">
              GridRetail demonstration storefront. Product ordering and bag operations operate in simulated checkout mode.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] pt-1 text-emerald-600 dark:text-emerald-400">
              <Lock className="h-3 w-3" />
              <span>Simulated Order Confirmation</span>
            </div>
          </div>
        </div>

        <div className={cn("mx-auto border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]", contentWidthClass)} style={{ borderColor: tokens.border }}>
          <span>{copyrightText}</span>
          <span className="font-semibold" style={{ color: primaryColor }}>Powered by GridRetail Commerce</span>
        </div>
      </footer>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 5: SERVICE PRACTITIONER (Appointment Focused)
  // -------------------------------------------------------------
  if (activeVariation === "service_practitioner") {
    return (
      <footer
        data-anchor="section.footer"
        data-footer-variation="service_practitioner"
        className="border-t py-12 px-4 sm:px-8 text-xs transition-colors"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.textMuted }}
      >
        <div className={cn("mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-10", contentWidthClass)}>
          {/* Practitioner Overview Note */}
          <div className="space-y-3">
            <span className="font-bold text-sm tracking-tight" style={{ color: tokens.text }}>
              {storeName} Advisory Practice
            </span>
            <p className="text-xs leading-relaxed">
              {(settings.practiceDescription as string) ||
                "Professional consultation and advisory services tailored for client requirements."}
            </p>
            <div className="p-3 rounded-lg border text-[11px] space-y-1" style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}>
              <div className="font-semibold" style={{ color: tokens.text }}>Consultation Notice</div>
              <p className="text-[10px]">Client discussions and consultation scopes are managed directly with dedicated advisors.</p>
            </div>
          </div>

          {/* Quick Booking Shortcuts */}
          <div className="space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Consultation Booking
            </span>
            <ul className="space-y-2">
              <li>
                <a
                  href="#schedule"
                  className="hover:underline flex items-center gap-1.5"
                  style={{ color: primaryColor }}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Schedule Consultation</span>
                </a>
              </li>
              <li>
                <a href="#booking-section" className="hover:underline">
                  View Appointment Calendar
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:underline">
                  Consultation FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Practice Policies */}
          <div className="space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: tokens.text }}>
              Practice Policies
            </span>
            <div className="space-y-1.5 text-[11px] leading-relaxed">
              <div><strong>Format:</strong> Virtual or In-Person Consultations</div>
              <div><strong>Direct Desk:</strong> appointments@{storeSlug || "brand"}.gridretail.demo</div>
            </div>
          </div>
        </div>

        <div className={cn("mx-auto border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]", contentWidthClass)} style={{ borderColor: tokens.border }}>
          <span>{copyrightText}</span>
          <span className="font-semibold" style={{ color: primaryColor }}>GridRetail Appointment Scheduling</span>
        </div>
      </footer>
    );
  }

  // -------------------------------------------------------------
  // VARIATION 6: CONTACT-FOCUSED (Lead Gen Focused)
  // -------------------------------------------------------------
  if (activeVariation === "contact_focused") {
    return (
      <footer
        data-anchor="section.footer"
        data-footer-variation="contact_focused"
        className="border-t py-12 px-4 sm:px-8 text-xs transition-colors"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.textMuted }}
      >
        <div className={cn("mx-auto space-y-8", contentWidthClass)}>
          {/* High-Visibility Call-Out Banner */}
          <div
            className="p-6 sm:p-8 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-bold text-base sm:text-lg" style={{ color: tokens.text }}>
                Ready to Discuss Your Project Scope?
              </h3>
              <p className="text-xs sm:text-sm text-stone-500">
                Submit an inquiry to connect directly with our advisory team.
              </p>
            </div>

            <a
              href="#inquiry"
              className={cn(
                "min-h-[44px] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md inline-flex items-center gap-2 cursor-pointer shrink-0",
                buttonRadiusClass
              )}
              style={{ backgroundColor: primaryColor }}
            >
              <span>Request Consultation</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
              >
                <Phone className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-400">Direct Phone</div>
                <div className="text-xs font-semibold" style={{ color: tokens.text }}>
                  {(settings.phone as string) || "Available for Registered Clients"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
              >
                <Mail className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-400">Inquiry Desk</div>
                <div className="text-xs font-semibold" style={{ color: tokens.text }}>leads@{storeSlug || "brand"}.gridretail.demo</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
              >
                <Clock className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-stone-400">Inquiry Handling</div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active Queue Review</div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]" style={{ borderColor: tokens.border }}>
            <span>{copyrightText}</span>
            <div className="flex items-center gap-4">
              <a href="#privacy" className="hover:underline">Privacy Policy</a>
              <a href="#terms" className="hover:underline">Terms of Service</a>
              <span className="font-semibold" style={{ color: primaryColor }}>Powered by GridRetail</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return null;
}
