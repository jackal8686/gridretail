import { Store } from "@/types/store";
import { SectionInstance, SectionType } from "@/types/section";
import { getDefaultSectionInstance, getSectionDefinition } from "@/constants/sections";

/**
 * Resolves a store's configured sections with guaranteed backward compatibility.
 * If the store has Phase 10 `sections`, they are returned in order.
 * If the store only has legacy Phase 1-9 `orderedSections` / `enabledSections`,
 * it synthesizes equivalent SectionInstance objects preserving all branding and copy.
 */
export function resolveStoreSections(store: Partial<Store>): SectionInstance[] {
  const branding = (store.branding || {}) as Record<string, unknown>;
  const bannerUrl = (branding.bannerUrl as string) || "";
  const heroHeadline = (branding.heroHeadline as string) || "";
  const heroSubheadline = (branding.heroSubheadline as string) || "";
  const ctaText = (branding.ctaText as string) || "";
  const aboutText = (branding.aboutText as string) || store.description || "";
  const logoUrl = (branding.logoUrl as string) || "";

  if (Array.isArray(store.sections) && store.sections.length > 0) {
    return [...store.sections]
      .map((sec) => {
        const def = getSectionDefinition(sec.type);
        const s = (sec.settings || {}) as Record<string, unknown>;

        if (def?.category === "hero" || sec.type.startsWith("hero_") || sec.type === "promotional_banner") {
          const effectiveImage = bannerUrl || (s.imageUrl as string) || (s.backgroundImageUrl as string) || (s.bannerUrl as string) || "";
          
          let effectiveBadge = (s.badge as string) || (branding.badge as string) || "";
          let effectiveBulletPoints = s.bulletPoints as string[] | undefined;

          // Cross-industry copy consistency:
          if (store.websiteType === "appointments") {
            const isLegal = store.appointmentIndustry?.toLowerCase().includes("legal") || store.name?.toLowerCase().includes("legal") || (store.description || "").toLowerCase().includes("legal");
            if (!effectiveBadge || effectiveBadge === "Featured Collection" || effectiveBadge === "Store Notice") {
              effectiveBadge = isLegal ? "Legal Consultation Services" : "Practice Overview";
            }
            const isDefaultEcommerceBullets = Array.isArray(effectiveBulletPoints) && 
              effectiveBulletPoints.some(b => b.includes("Curated catalog") || b.includes("product specifications") || b.includes("merchant ordering"));
            if (!effectiveBulletPoints || effectiveBulletPoints.length === 0 || isDefaultEcommerceBullets) {
              effectiveBulletPoints = isLegal
                ? ["Confidential consultation enquiries", "Connect with the legal team", "Explore practice areas"]
                : ["Confidential consultation enquiries", "Connect with the practice team", "Explore consultation options"];
            }
          } else if (store.websiteType === "lead_gen") {
            if (!effectiveBadge || effectiveBadge === "Featured Collection" || effectiveBadge === "Store Notice") {
              effectiveBadge = "Growth Advisory";
            }
            const isDefaultEcommerceBullets = Array.isArray(effectiveBulletPoints) && 
              effectiveBulletPoints.some(b => b.includes("Curated catalog") || b.includes("product specifications") || b.includes("merchant ordering"));
            if (!effectiveBulletPoints || effectiveBulletPoints.length === 0 || isDefaultEcommerceBullets) {
              effectiveBulletPoints = ["Discuss your business goals", "Explore advisory services", "Request an initial assessment"];
            }
          }

          return {
            ...sec,
            settings: {
              ...s,
              imageUrl: effectiveImage,
              backgroundImageUrl: effectiveImage,
              bannerUrl: effectiveImage,
              badge: effectiveBadge,
              bulletPoints: effectiveBulletPoints,
              headline: (heroHeadline && heroHeadline !== "" ? heroHeadline : (s.headline as string)) || (store.websiteType === "appointments" ? "Professional Advisory & Strategic Consultation" : (store.websiteType === "lead_gen" ? "Strategic Solutions & Dedicated Advisory" : "")),
              subheadline: (heroSubheadline && heroSubheadline !== "" ? heroSubheadline : (s.subheadline as string)) || (store.websiteType === "appointments" ? (store.description || "Schedule a focused, confidential appointment with our experienced practitioners.") : (store.websiteType === "lead_gen" ? (store.description || "Submit your inquiry to receive a tailored proposal and strategic consultation from our team.") : "")),
              ctaText: (ctaText && ctaText !== "" ? ctaText : (s.ctaText as string)) || (store.websiteType === "appointments" ? "Book Consultation" : (store.websiteType === "lead_gen" ? "Request Consultation" : "")),
              ctaUrl: (s.ctaUrl as string) || (store.websiteType === "appointments" ? "#booking-section" : (store.websiteType === "lead_gen" ? "#inquiry-form" : "#catalog")),
            },
          };
        }

        if (sec.type === "brand_story") {
          return {
            ...sec,
            settings: {
              ...s,
              bodyParagraph1: (aboutText && aboutText !== "" ? aboutText : (s.bodyParagraph1 as string)) || "",
              imageUrl: s.imageUrl || (logoUrl ? logoUrl : s.imageUrl),
            },
          };
        }

        return sec;
      })
      .sort((a, b) => a.order - b.order);
  }

  // Legacy fallback synthesis
  const defaultOrdered = store.websiteType === "appointments"
    ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
    : store.websiteType === "lead_gen"
    ? ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
    : ["hero", "featured_products", "about", "newsletter", "footer"];

  const ordered = Array.isArray(store.orderedSections) && store.orderedSections.length > 0
    ? store.orderedSections
    : defaultOrdered;

  const enabled = Array.isArray(store.enabledSections)
    ? store.enabledSections
    : defaultOrdered;

  const storeName = store.name || "GridRetail Store";
  const industry = store.industry || "Retail";
  const storeScope = store.slug || store.id || "store";

  return ordered.map((secId, idx) => {
    const isVisible = enabled.includes(secId);
    const stableId = `sec_legacy_${storeScope}_${secId}_${idx}`;

    switch (secId) {
      case "hero": {
        const instance = getDefaultSectionInstance("hero_split", idx, store.websiteType);
        instance.id = stableId;
        instance.visible = isVisible;
        const isLegal = store.appointmentIndustry?.toLowerCase().includes("legal") || store.name?.toLowerCase().includes("legal") || (store.description || "").toLowerCase().includes("legal");

        let heroBadge = branding.badge || (instance.settings.badge as string);
        let heroBulletPoints = instance.settings.bulletPoints as string[];

        const brandingBullets = Array.isArray(branding.bulletPoints) ? (branding.bulletPoints as string[]) : undefined;

        if (store.websiteType === "appointments") {
          heroBadge = (branding.badge as string) || (isLegal ? "Legal Consultation Services" : "Practice Overview");
          heroBulletPoints = brandingBullets || (isLegal
            ? ["Confidential consultation enquiries", "Connect with the legal team", "Explore practice areas"]
            : ["Confidential consultation enquiries", "Connect with the practice team", "Explore consultation options"]);
        } else if (store.websiteType === "lead_gen") {
          heroBadge = (branding.badge as string) || "Growth Advisory";
          heroBulletPoints = brandingBullets || ["Discuss your business goals", "Explore advisory services", "Request an initial assessment"];
        }

        instance.settings = {
          ...instance.settings,
          badge: heroBadge,
          bulletPoints: heroBulletPoints,
          headline: branding.heroHeadline || (store.websiteType === "appointments" ? "Professional Advisory & Strategic Consultation" : (store.websiteType === "lead_gen" ? "Strategic Solutions & Dedicated Advisory" : `Welcome to ${storeName}`)),
          subheadline: branding.heroSubheadline || (store.websiteType === "appointments" ? (store.description || "Schedule a focused, confidential appointment with our experienced practitioners.") : (store.websiteType === "lead_gen" ? (store.description || "Submit your inquiry to receive a tailored proposal and strategic consultation from our team.") : `Curated ${industry} collection designed for modern living.`)),
          ctaText: (ctaText && ctaText !== "" ? ctaText : (store.websiteType === "appointments" ? "Book Consultation" : (store.websiteType === "lead_gen" ? "Request Consultation" : "Explore Catalog"))),
          ctaUrl: store.websiteType === "appointments" ? "#booking-section" : (store.websiteType === "lead_gen" ? "#inquiry-form" : "#catalog"),
          imageUrl: bannerUrl,
          backgroundImageUrl: bannerUrl,
          bannerUrl: bannerUrl,
        };
        return instance;
      }

      case "featured_products": {
        const instance = getDefaultSectionInstance("featured_products", idx);
        instance.id = stableId;
        instance.visible = isVisible;
        instance.settings = {
          ...instance.settings,
          title: "Featured Catalog",
          subtitle: `Explore our latest ${industry} collection.`,
          showCategoryFilter: true,
          productLimit: 8,
          showQuickAdd: true,
        };
        return instance;
      }

      case "benefits_grid": {
        const instance = getDefaultSectionInstance("benefits_grid", idx);
        instance.id = stableId;
        instance.visible = isVisible;
        if (store.websiteType === "appointments") {
          instance.settings = {
            ...instance.settings,
            badge: "Client Commitments",
            title: "Confidential, Accredited Consultations",
            subtitle: "Direct calendar access to verified senior practitioners.",
            benefit1Title: "Confidential Advisory",
            benefit1Desc: "Private, end-to-end encrypted consultations and secure records.",
            benefit2Title: "Direct Slot Booking",
            benefit2Desc: "Instant slot reservation without back-and-forth correspondence.",
            benefit3Title: "Accredited Specialists",
            benefit3Desc: "Senior advisors with extensive verified professional credentials.",
            benefit4Title: "Flexible Rescheduling",
            benefit4Desc: "Manage and reschedule appointments effortlessly online.",
          };
        } else if (store.websiteType === "lead_gen") {
          instance.settings = {
            ...instance.settings,
            badge: "Value Proposition",
            title: "Why Industry Leaders Partner With Us",
            subtitle: "Delivering measurable business outcomes through dedicated expertise and disciplined execution.",
            benefit1Title: "Dedicated Advisory",
            benefit1Desc: "Senior domain specialists personally oversee your engagement from conception to delivery.",
            benefit2Title: "Rapid Turnaround",
            benefit2Desc: "Streamlined consultation pipeline ensures high-velocity proposals and execution.",
            benefit3Title: "Proven Results",
            benefit3Desc: "Track record of delivering transformative value for ambitious corporate clients.",
            benefit4Title: "Transparent Terms",
            benefit4Desc: "Clear milestone-based deliverables with complete accountability and predictable pricing.",
          };
        }
        return instance;
      }

      case "how_it_works": {
        const instance = getDefaultSectionInstance("how_it_works", idx);
        instance.id = stableId;
        instance.visible = isVisible;
        if (store.websiteType === "lead_gen") {
          instance.settings = {
            ...instance.settings,
            badge: "Our Process",
            title: "From Initial Inquiry to Execution",
            subtitle: "A transparent, collaborative four-stage methodology designed for speed and clarity.",
            step1Title: "1. Submit Project Scope",
            step1Desc: "Complete our brief inquiry questionnaire detailing your requirements and timeline.",
            step2Title: "2. Strategic Discovery",
            step2Desc: "We conduct an in-depth advisory session to diagnose constraints and align objectives.",
            step3Title: "3. Tailored Proposal",
            step3Desc: "Receive a comprehensive proposal outlining milestones, deliverables, and resource commitments.",
            step4Title: "4. Deployment & Impact",
            step4Desc: "Our team executes the approved roadmap with continuous communication and measurable ROI.",
          };
        }
        return instance;
      }

      case "faq_accordion": {
        const instance = getDefaultSectionInstance("faq_accordion", idx);
        instance.id = stableId;
        instance.visible = isVisible;
        if (store.websiteType === "appointments") {
          instance.settings = {
            ...instance.settings,
            badge: "Practice FAQ",
            title: "Frequently Asked Questions",
            subtitle: "Common inquiries about booking, consultations, and practice policies.",
            q1: "How do I schedule an appointment?",
            a1: "Select your desired service, choose an available date and time slot, enter your contact details, and receive instant confirmation.",
            q2: "Can I reschedule or cancel my booking?",
            a2: "Yes, you can look up your appointment using your email in the My Appointments section and cancel prior to the cancellation window.",
            q3: "Are consultations conducted in-person or virtually?",
            a3: "We offer both in-person sessions at our practice location and encrypted video consultations depending on your service selection.",
            q4: "What happens after I complete a booking?",
            a4: "You receive an instant confirmation number with timing, meeting links or location details, and a direct cancellation link.",
          };
        } else if (store.websiteType === "lead_gen") {
          instance.settings = {
            ...instance.settings,
            badge: "Client FAQs",
            title: "Frequently Asked Questions",
            subtitle: "Answers to common questions about our engagement model, proposal process, and timelines.",
            q1: "What happens after I submit an inquiry?",
            a1: "Our team reviews your submission within 1 business day and schedules an initial strategic discovery call.",
            q2: "Is our business information kept confidential?",
            a2: "Yes. All client discussions and submitted data are governed by strict confidentiality commitments.",
            q3: "How quickly can we receive a customized proposal?",
            a3: "Following our initial discovery conversation, we deliver a formal, detailed proposal within 2 to 3 business days.",
            q4: "Can we request modifications to our initial project scope?",
            a4: "Absolutely. Our engagements are designed with agile review milestones to accommodate evolving priorities.",
          };
        }
        return instance;
      }

      case "about": {
        const instance = getDefaultSectionInstance("brand_story", idx);
        instance.id = stableId;
        instance.visible = isVisible;
        instance.settings = {
          ...instance.settings,
          badge: "About Us",
          headline: `Designed for ${store.clientName || storeName}`,
          bodyParagraph1: branding.aboutText || store.description || `Every element of this demonstration has been tailored to reflect ${store.clientName || storeName}'s distinctive brand heritage.`,
          bodyParagraph2: store.websiteType === "appointments"
            ? "Delivering dedicated consultation services with uncompromising professional rigor and discretion."
            : store.websiteType === "lead_gen"
            ? "Partnering with organizations to architect and execute high-impact commercial growth strategies."
            : "Thoughtfully curated to present a distinctive brand aesthetic and seamless purchasing experience.",
          imageUrl: branding.logoUrl || "",
        };
        return instance;
      }

      case "newsletter": {
        const instance = getDefaultSectionInstance("newsletter_signup", idx);
        instance.id = stableId;
        instance.visible = isVisible;
        return instance;
      }

      case "footer": {
        const instance = getDefaultSectionInstance("footer_custom", idx);
        instance.id = stableId;
        instance.visible = isVisible;
        instance.settings = {
          ...instance.settings,
          brandBio: store.websiteType === "appointments"
            ? `${storeName} — Professional Appointments & Advisory for ${store.clientName || "Valued Clients"}`
            : store.websiteType === "lead_gen"
            ? `${storeName} — Strategic Commercial Solutions & Advisory for ${store.clientName || "Valued Clients"}`
            : `${storeName} — Tailored Storefront Demo for ${store.clientName || "Valued Client"}`,
          copyrightNotice: `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`,
          showEngineBadge: true,
        };
        return instance;
      }

      default: {
        // If it's already a valid SectionType string
        const defInstance = getDefaultSectionInstance(secId as SectionType, idx);
        defInstance.id = stableId;
        defInstance.visible = isVisible;
        return defInstance;
      }
    }
  });
}
