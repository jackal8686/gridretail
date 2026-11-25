"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Store, Template, Product, PreviewUpdatePayload, StoreCategory } from "@/types";
import { SectionInstance, SectionType } from "@/types/section";
import { StoreStylingTokens } from "@/types/store";
import { resolveStoreSections } from "@/lib/sections/resolver";
import { getDefaultSectionInstance } from "@/constants/sections";
import { SectionRenderer } from "./sections/SectionRenderer";
import { HeroSections } from "./sections/HeroSections";
import { FooterSection } from "./sections/FooterSection";
import { ThemeAwareHeroGraphic } from "./ThemeAwareHeroGraphic";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/currency";

import { getThemeById } from "@/constants/themes";
import { getDesignTemplateById } from "@/constants/design-templates";
import { isAllowedPreviewOrigin, validatePreviewMessage } from "@/lib/security/preview-origin";
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Tag,
  Percent,
  Check,
  SlidersHorizontal,
  Star,
  Leaf,
  Cpu,
  Search,
  Clock,
  X,
  Trash2,
  Plus,
  Minus,
  Menu,
} from "lucide-react";

interface StorefrontViewProps {
  initialStore: Store;
  template: Template | null;
  initialProducts: Product[];
  isPreviewMode?: boolean;
}

export function StorefrontView({
  initialStore,
  template,
  initialProducts,
  isPreviewMode = false,
}: StorefrontViewProps) {
  // Theme & Design Template States (Independent Customization Systems)
  const [activeThemeId, setActiveThemeId] = useState<string>(
    initialStore.themeId || initialStore.templateId || template?.id || "theme_nordic_pine"
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    initialStore.templateId || template?.id || "tmpl_modern_minimal"
  );

  const activeTheme = useMemo(() => getThemeById(activeThemeId), [activeThemeId]);
  const activeDesignTemplate = useMemo(() => getDesignTemplateById(activeTemplateId), [activeTemplateId]);

  const tokens = activeTheme.tokens;
  const isDark = activeTheme.isDark;

  const [storeName, setStoreName] = useState(initialStore.name);
  const [branding, setBranding] = useState(
    initialStore.branding || {
      primaryColor: tokens.primary,
      secondaryColor: tokens.secondary,
      fontFamily: "Inter, sans-serif",
      heroHeadline: `Welcome to ${initialStore.name}`,
      heroSubheadline:
        initialStore.websiteType === "appointments"
          ? `Professional ${initialStore.industry} consultation services and appointment scheduling.`
          : initialStore.websiteType === "lead_gen"
          ? `Strategic ${initialStore.industry} advisory and professional solutions.`
          : `Curated ${initialStore.industry} collection designed for modern living.`,
      aboutText: initialStore.description,
      ctaText:
        initialStore.websiteType === "appointments"
          ? "Book Consultation"
          : initialStore.websiteType === "lead_gen"
          ? "Request Information"
          : "Explore Catalog",
    }
  );

  const [enabledSections, setEnabledSections] = useState<string[]>(
    initialStore.enabledSections || [
      "hero",
      "featured_products",
      "about",
      "newsletter",
      "footer",
    ]
  );
  const [orderedSections, setOrderedSections] = useState<string[]>(
    initialStore.orderedSections || [
      "hero",
      "featured_products",
      "about",
      "newsletter",
      "footer",
    ]
  );

  const [sections, setSections] = useState<SectionInstance[]>(() =>
    resolveStoreSections(initialStore)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [styling, setStyling] = useState<StoreStylingTokens | undefined>(
    initialStore.styling
  );

  const [products] = useState<Product[]>(initialProducts);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartCount = useMemo(() => {
    return Object.values(cartItems).reduce((sum, qty) => sum + qty, 0);
  }, [cartItems]);

  const cartSubtotal = useMemo(() => {
    return Object.entries(cartItems).reduce((sum, [pId, qty]) => {
      const prod = products.find((p) => p.id === pId);
      return sum + (prod ? prod.price * qty : 0);
    }, 0);
  }, [cartItems, products]);

  // Unified cart persistence across store pages
  const storageKey = `gridretail_cart_v2_${initialStore.slug}`;
  const legacyStorageKey = `gridretail_cart_${initialStore.slug}`;
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  // Load cart on mount from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawV2 = localStorage.getItem(storageKey);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (parsed && typeof parsed === "object") {
          const aggregated: Record<string, number> = {};
          for (const item of Object.values(parsed) as Array<{ productId?: string; quantity?: number }>) {
            if (item && item.productId && typeof item.quantity === "number") {
              aggregated[item.productId] = (aggregated[item.productId] || 0) + item.quantity;
            }
          }
          setCartItems(aggregated);
          setIsCartLoaded(true);
          return;
        }
      }
      const rawLegacy = localStorage.getItem(legacyStorageKey);
      if (rawLegacy) {
        const parsed = JSON.parse(rawLegacy);
        if (parsed && typeof parsed === "object") {
          setCartItems(parsed);
        }
      }
    } catch {
      // Ignore storage parse error
    }
    setIsCartLoaded(true);
  }, [storageKey, legacyStorageKey]);

  // Persist cart when cartItems changes
  useEffect(() => {
    if (!isCartLoaded || typeof window === "undefined") return;
    try {
      const v2Map: Record<string, { id: string; productId: string; quantity: number }> = {};
      for (const [pId, qty] of Object.entries(cartItems)) {
        if (qty > 0) {
          v2Map[pId] = { id: pId, productId: pId, quantity: qty };
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(v2Map));
      localStorage.setItem(legacyStorageKey, JSON.stringify(cartItems));
    } catch {
      // Ignore storage write error
    }
  }, [cartItems, isCartLoaded, storageKey, legacyStorageKey]);

  // Compute category list from store categories and products
  const categories = useMemo(() => {
    const list: { id: string; name: string; description?: string; count: number }[] = [];
    const storeCats: StoreCategory[] = initialStore.categories || [];

    storeCats.forEach((sc) => {
      const count = products.filter(
        (p) => p.category?.toLowerCase() === sc.name.toLowerCase()
      ).length;
      list.push({
        id: sc.id || sc.slug || sc.name,
        name: sc.name,
        description: sc.description,
        count,
      });
    });

    products.forEach((p) => {
      if (p.category && !list.some((c) => c.name.toLowerCase() === p.category.toLowerCase())) {
        const count = products.filter(
          (prod) => prod.category?.toLowerCase() === p.category.toLowerCase()
        ).length;
        list.push({
          id: p.category.toLowerCase().replace(/\s+/g, "-"),
          name: p.category,
          count,
        });
      }
    });

    return list;
  }, [initialStore.categories, products]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "ALL") return products;
    return products.filter(
      (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [products, selectedCategory]);

  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === "ALL") return null;
    return categories.find((c) => c.name.toLowerCase() === selectedCategory.toLowerCase());
  }, [categories, selectedCategory]);

  // Live postMessage Listener for Customizer
  useEffect(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "GRIDRETAIL_PREVIEW_READY", slug: initialStore.slug },
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

        if (payload.name !== undefined) {
          setStoreName(payload.name);
        }

        if (payload.themeId) {
          setActiveThemeId(payload.themeId);
        }

        if (payload.templateId) {
          setActiveTemplateId(payload.templateId);
        }

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

        if (payload.enabledSections) {
          setEnabledSections(payload.enabledSections);
        }

        if (payload.orderedSections && Array.isArray(payload.orderedSections)) {
          setOrderedSections(payload.orderedSections);
        }

        if (payload.sections && Array.isArray(payload.sections)) {
          setSections(payload.sections);
        } else if (payload.orderedSections || payload.enabledSections || payload.branding) {
          setSections((prev) =>
            resolveStoreSections({
              ...initialStore,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStore.slug]);

  const handleQuickAdd = (productId: string) => {
    setAddedItems((prev) => ({ ...prev, [productId]: true }));
    setCartItems((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [productId]: false }));
    }, 1500);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const primaryColor = branding.primaryColor || tokens.primary;

  const buttonRadiusClass =
    styling?.buttonRadius === "sharp"
      ? "rounded-none"
      : styling?.buttonRadius === "pill"
      ? "rounded-full"
      : "rounded-lg";

  // -------------------------------------------------------------
  // DISTINCT HEADER RENDERING FOR EACH OF THE 8 TEMPLATES
  // -------------------------------------------------------------
  const renderHeader = () => {
    const layout = activeDesignTemplate.headerLayout;

    // Header Variation 6: Appointment CTA
    if (styling?.headerVariation === "appointment_cta") {
      return (
        <header
          data-header-variation="appointment_cta"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3.5")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={branding.logoUrl} alt={storeName} className="h-7 max-w-[120px] object-contain" />
              )}
              <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✦ Direct Booking
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-5 text-xs" style={{ color: tokens.textMuted }}>
              <button type="button" onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })} className="hover:underline cursor-pointer">Advisory Services</button>
              <a href="#about" className="hover:underline">Practitioner Desk</a>
              <a href="#faq" className="hover:underline">Session FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Book Consultation</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 px-4 space-y-2 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <button type="button" onClick={() => { setIsMobileMenuOpen(false); document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" }); }} className="block w-full text-left py-1 hover:underline">Advisory Services</button>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practitioner Desk</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Session FAQ</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 7: Lead Inquiry
    if (styling?.headerVariation === "lead_inquiry") {
      return (
        <header
          data-header-variation="lead_inquiry"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3.5")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={branding.logoUrl} alt={storeName} className="h-7 max-w-[120px] object-contain" />
              )}
              <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
              <span className="hidden sm:inline-block text-[10px] text-stone-500 font-mono">
                ⚡ Direct Client Advisory Desk
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#inquiry"
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Request Quote</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 px-4 space-y-2 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#catalog-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Catalog</a>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">About</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">FAQ</a>
            </div>
          )}
        </header>
      );
    }

    // Header 1: Floating Minimal (Modern Minimal)
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
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                {branding.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-7 sm:h-8 max-w-[120px] sm:max-w-[150px] object-contain shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: primaryColor }}>
                  {storeName}
                </span>
              </div>
              <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="hover:opacity-100 cursor-pointer"
                >
                  All Products
                </button>
                {!isPreviewMode && (
                  <Link
                    href={`/store/${initialStore.slug}/collections`}
                    className="hover:opacity-100 cursor-pointer"
                  >
                    Collections
                  </Link>
                )}
                {categories.slice(0, 3).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hover:opacity-100 cursor-pointer"
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Bag ({cartCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-full border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden rounded-2xl border mt-2 p-3 space-y-2 text-xs font-medium backdrop-blur-md" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setSelectedCategory("ALL");
                  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="block w-full text-left py-1 hover:underline"
              >
                All Products
              </button>
              <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">About</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">FAQ</a>
            </div>
          )}
        </header>
      );
    }

    // Header 2: Centered Luxury (Centered Logo)
    if (styling?.headerVariation === "centered_logo" || (!styling?.headerVariation && layout === "centered-luxury")) {
      return (
        <header
          data-header-variation="centered_logo"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b backdrop-blur-md py-4 px-4 sm:px-6")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex flex-col items-center justify-center space-y-2 text-center">
            <span className="text-[10px] tracking-[0.25em] uppercase font-serif" style={{ color: tokens.accent }}>
              ✦ ATELIER SHOWROOM ✦
            </span>
            <div className="flex items-center justify-between w-full">
              <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-serif" style={{ color: tokens.textMuted }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="hover:underline"
                >
                  Lookbook
                </button>
                {!isPreviewMode && (
                  <Link
                    href={`/store/${initialStore.slug}/collections`}
                    className="hover:underline"
                  >
                    Collections
                  </Link>
                )}
                {categories.slice(0, 2).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hover:underline"
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
              <div className="flex items-center gap-3 mx-auto">
                {branding.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-8 sm:h-10 max-w-[140px] sm:max-w-[180px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <h1 className="text-xl sm:text-2xl font-serif tracking-widest uppercase font-bold" style={{ color: primaryColor }}>
                  {storeName}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="min-h-[40px] px-4 py-1.5 text-xs uppercase font-serif tracking-widest border transition-all cursor-pointer"
                  style={{ borderColor: tokens.accent, color: tokens.text }}
                >
                  Archive ({cartCount})
                </button>
              </div>
            </div>
          </div>
        </header>
      );
    }

    // Header 3: Bold Announcement (Bold & Vibrant)
    if (layout === "bold-announcement") {
      return (
        <header className="sticky top-0 z-30 w-full">
          {/* Animated Ticker Ribbon */}
          <div
            className="py-1.5 px-4 text-center text-[11px] font-black tracking-wider uppercase flex items-center justify-center gap-3 border-b-2"
            style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: "#000000" }}
          >
            <span>
              {initialStore.websiteType === "appointments"
                ? "⚡ PROFESSIONAL PRACTICE"
                : initialStore.websiteType === "lead_gen"
                ? "⚡ STRATEGIC ADVISORY"
                : "⚡ CURATED COLLECTION"}
            </span>
            <span>•</span>
            <span>OFFICIAL BRAND SHOWROOM</span>
            <span>•</span>
            <span>GRIDRETAIL CLIENT DEMO</span>
          </div>
          <div
            className="border-b-2 px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_0_0_#000000]"
            style={{ backgroundColor: tokens.surface, borderColor: "#000000" }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {branding.logoUrl && (
                <div className="border-2 border-black bg-white p-1 shadow-[2px_2px_0_0_#000000] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-7 sm:h-8 max-w-[110px] sm:max-w-[140px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                </div>
              )}
              <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {!isPreviewMode && (
                <Link
                  href={`/store/${initialStore.slug}/collections`}
                  className="hidden sm:inline-flex px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black bg-white hover:bg-stone-100 transition-colors"
                  style={{ color: tokens.text }}
                >
                  Collections
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="min-h-[44px] px-5 py-2 text-xs font-black uppercase tracking-wider border-2 shadow-[2px_2px_0_0_#000000] cursor-pointer"
                style={{ backgroundColor: tokens.accent, color: "#FFFFFF", borderColor: "#000000" }}
              >
                Cart ({cartCount})
              </button>
            </div>
          </div>
        </header>
      );
    }

    // Header 4: Multi-tier Utility (Corporate / Classic Commerce)
    if (styling?.headerVariation === "corporate" || (!styling?.headerVariation && (layout === "multi-tier-utility" || layout === "technical-hud"))) {
      return (
        <header
          data-header-variation="corporate"
          className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 w-full border-b shadow-xs")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          {/* Top Utility Bar */}
          <div className="border-b py-1.5 px-4 sm:px-6 text-[11px] flex items-center justify-between" style={{ backgroundColor: tokens.background, borderColor: tokens.border, color: tokens.textMuted }}>
            <div className="flex items-center gap-4">
              <span>{storeName} — Product Catalogue</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Currency: INR (₹)</span>
            </div>
          </div>
          {/* Main Bar */}
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoUrl}
                  alt={storeName}
                  className="h-8 sm:h-9 max-w-[130px] sm:max-w-[160px] object-contain"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              )}
              <span className="text-xl font-bold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <div className="hidden sm:flex flex-1 max-w-md mx-4 relative">
              <input
                type="text"
                placeholder="Search catalog products..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border focus:outline-hidden"
                style={{ backgroundColor: tokens.background, borderColor: tokens.border, color: tokens.text }}
                readOnly
              />
              <Search className="h-4 w-4 absolute left-2.5 top-2 opacity-50" />
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="min-h-[40px] px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Cart ({cartCount})</span>
            </button>
          </div>
          {/* Category Bar */}
          <div className="border-t px-4 sm:px-6 py-2 overflow-x-auto flex items-center gap-6 text-xs font-semibold" style={{ borderColor: tokens.border, color: tokens.textMuted }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className="hover:underline cursor-pointer"
              style={{ color: selectedCategory === "ALL" ? primaryColor : undefined }}
            >
              All Categories
            </button>
            {!isPreviewMode && (
              <Link
                href={`/store/${initialStore.slug}/collections`}
                className="hover:underline cursor-pointer"
              >
                Collections
              </Link>
            )}
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                className="hover:underline cursor-pointer whitespace-nowrap"
                style={{ color: selectedCategory === c.name ? primaryColor : undefined }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </header>
      );
    }

    // Header 5: Magazine Headline (Editorial Magazine)
    if (layout === "magazine-headline") {
      return (
        <header className="sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
          <div className="max-w-6xl mx-auto">
            <div className="border-b pb-1 mb-2 flex items-center justify-between text-[10px] tracking-widest uppercase font-serif" style={{ borderColor: tokens.border, color: tokens.textMuted }}>
              <span>THE CURATED CHRONICLE</span>
              <span>VOL. IX • NO. 42 • SPRING 2026</span>
              <span>STORE EDITION</span>
            </div>
            <div className="flex items-center justify-between py-1 gap-4">
              <div className="flex items-center gap-3">
                {branding.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-8 sm:h-10 max-w-[140px] sm:max-w-[180px] object-contain shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight" style={{ color: tokens.text }}>
                  {storeName}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                {!isPreviewMode && (
                  <Link
                    href={`/store/${initialStore.slug}/collections`}
                    className="px-3 py-1.5 border text-xs font-serif tracking-wider uppercase hover:underline shrink-0"
                    style={{ borderColor: tokens.border, color: tokens.text }}
                  >
                    Collections
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="px-4 py-1.5 border text-xs font-serif tracking-wider uppercase hover:underline shrink-0 cursor-pointer"
                  style={{ borderColor: tokens.border, color: tokens.text }}
                >
                  Dispatch ({cartCount})
                </button>
              </div>
            </div>
          </div>
        </header>
      );
    }

    // Header 6: Organic Soft / Transparent Glass
    if (styling?.headerVariation === "transparent" || (!styling?.headerVariation && layout === "organic-soft")) {
      return (
        <header
          data-header-variation="transparent"
          className={cn(styling?.headerSticky !== false ? "sticky top-3" : "relative", "z-30 px-4 sm:px-6 max-w-5xl mx-auto w-full mb-3")}
        >
          <div
            className="backdrop-blur-md rounded-2xl border px-6 py-3 flex items-center justify-between shadow-xs"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="flex items-center gap-2.5">
              {branding.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoUrl}
                  alt={storeName}
                  className="h-7 sm:h-8 max-w-[120px] sm:max-w-[140px] rounded-lg object-contain shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              ) : (
                <Leaf className="h-4 w-4 shrink-0" style={{ color: tokens.accent }} />
              )}
              <span className="text-lg font-semibold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <nav className="hidden sm:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <span className="cursor-pointer" onClick={() => setSelectedCategory("ALL")}>Catalog</span>
              {!isPreviewMode && (
                <Link href={`/store/${initialStore.slug}/collections`} className="cursor-pointer hover:opacity-80">
                  Collections
                </Link>
              )}
              {categories.slice(0, 3).map((c) => (
                <span key={c.id} className="cursor-pointer" onClick={() => setSelectedCategory(c.name)}>{c.name}</span>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 text-white cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Bag ({cartCount})</span>
            </button>
          </div>
        </header>
      );
    }

    // Header 7: Technical HUD (Tech & Futuristic)
    if (layout === "technical-hud") {
      return (
        <header className="sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3 font-mono" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYS_ONLINE</span>
              </div>
              {branding.logoUrl && (
                <div className="border border-emerald-500/30 bg-black/40 p-1 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-6 sm:h-7 max-w-[100px] sm:max-w-[130px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                </div>
              )}
              <span className="text-lg font-black tracking-widest uppercase" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: tokens.textMuted }}>
              <span>LATENCY: 12ms</span>
              <span>{"//"}</span>
              <span>PROTOCOL: TLSv1.3</span>
            </div>
            <div className="flex items-center gap-3">
              {!isPreviewMode && (
                <Link
                  href={`/store/${initialStore.slug}/collections`}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border hover:bg-white/10 transition-colors"
                  style={{ borderColor: tokens.border, color: tokens.badgeText }}
                >
                  COLLECTIONS
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider border rounded-none flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>REGISTER [{cartCount}]</span>
              </button>
            </div>
          </div>
        </header>
      );
    }

    // Header 8: Playful Banner (Playful & Creative / Commerce Cart Fallback)
    return (
      <header
        data-header-variation={styling?.headerVariation || "commerce_cart"}
        className={cn(styling?.headerSticky !== false ? "sticky top-0" : "relative", "z-30 border-b-2 px-4 sm:px-6 py-3.5")}
        style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={branding.logoUrl}
                alt={storeName}
                className="h-8 sm:h-9 max-w-[120px] sm:max-w-[140px] object-contain transform -rotate-2 hover:rotate-0 transition-transform shrink-0"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
            )}
            <span className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: primaryColor }}>
              {storeName}
            </span>
            <span
              className="hidden sm:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full transform -rotate-3 text-white shadow-xs"
              style={{ backgroundColor: tokens.accent }}
            >
              POPULAR ✨
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!isPreviewMode && (
              <Link
                href={`/store/${initialStore.slug}/collections`}
                className="hidden sm:inline-block px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border-2 border-black bg-white hover:bg-stone-100 transition-all"
                style={{ color: tokens.text }}
              >
                Collections
              </Link>
            )}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-md transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              My Bag ({cartCount})
            </button>
          </div>
        </div>
      </header>
    );
  };

  // -------------------------------------------------------------
  // DISTINCT HERO RENDERING FOR EACH OF THE 8 TEMPLATES
  // -------------------------------------------------------------
  const renderHero = () => {
    const layout = activeDesignTemplate.heroLayout;

    // Hero 1: Split Showcase (Modern Minimal)
    if (layout === "split-showcase") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
        >
          <div className="space-y-5 text-left">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}
            >
              {initialStore.industry} • {activeDesignTemplate.name}
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight" style={{ color: tokens.text }}>
              {branding.heroHeadline || `Welcome to ${storeName}`}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.textMuted }}>
              {branding.heroSubheadline ||
                (initialStore.websiteType === "appointments"
                  ? `Professional consultation and advisory services for ${initialStore.clientName}.`
                  : initialStore.websiteType === "lead_gen"
                  ? `Strategic industry solutions and client partnership for ${initialStore.clientName}.`
                  : `Designed exclusively for ${initialStore.clientName}. Explore our curated architectural collection.`)}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6 py-3 rounded-full text-sm font-semibold text-white shadow-md hover:opacity-90 flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <span>{branding.ctaText || "Explore Catalog"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          {branding.bannerUrl ? (
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3] border" style={{ borderColor: tokens.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.bannerUrl}
                alt={storeName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
            </div>
          ) : (
            <ThemeAwareHeroGraphic
              tokens={tokens}
              primaryColor={primaryColor}
              industry={initialStore.industry}
              storeName={storeName}
              aspectRatio="aspect-[4/3]"
              className="rounded-2xl shadow-inner"
            />
          )}
        </section>
      );
    }

    // Hero 2: Cinematic Framed (Luxury Editorial)
    if (layout === "cinematic-framed") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-16 sm:py-24 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6"
        >
          <div className="inline-flex items-center gap-3">
            <span className="h-px w-12" style={{ backgroundColor: tokens.accent }} />
            <span className="text-xs uppercase tracking-[0.3em] font-serif" style={{ color: tokens.accent }}>
              {initialStore.websiteType === "appointments"
                ? "CONSULTATION SERVICES"
                : initialStore.websiteType === "lead_gen"
                ? "STRATEGIC SOLUTIONS"
                : "CURATED CATALOG COLLECTION"}
            </span>
            <span className="h-px w-12" style={{ backgroundColor: tokens.accent }} />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-light tracking-wide max-w-3xl mx-auto" style={{ color: tokens.text }}>
            {branding.heroHeadline || `Welcome to ${storeName}`}
          </h1>
          <p className="text-sm sm:text-base font-serif italic max-w-xl mx-auto opacity-80" style={{ color: tokens.textMuted }}>
            {branding.heroSubheadline ||
              (initialStore.websiteType === "appointments"
                ? `Dedicated legal and advisory representation created for ${initialStore.clientName}.`
                : initialStore.websiteType === "lead_gen"
                ? `Strategic advisory and market acceleration solutions created for ${initialStore.clientName}.`
                : `A bespoke curation created for ${initialStore.clientName}. Rare materials, masterful hand-finishing.`)}
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3 text-xs uppercase tracking-[0.2em] font-serif border hover:bg-white/10 transition-all cursor-pointer"
              style={{ borderColor: tokens.accent, color: tokens.text }}
            >
              {branding.ctaText || "View Collection"}
            </button>
          </div>
          {branding.bannerUrl ? (
            <div
              className="relative rounded-xl overflow-hidden border shadow-xl max-w-4xl mx-auto aspect-[16/7] sm:aspect-[21/9] mt-8 group"
              style={{ borderColor: tokens.accent }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.bannerUrl}
                alt={storeName}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto mt-8">
              <ThemeAwareHeroGraphic
                tokens={tokens}
                primaryColor={primaryColor}
                industry={initialStore.industry}
                storeName={storeName}
                aspectRatio="aspect-[16/7] sm:aspect-[21/9]"
                className="rounded-xl border shadow-xl"
              />
            </div>
          )}
        </section>
      );
    }

    // Hero 3: High-Impact Blocks (Bold & Vibrant)
    if (layout === "high-impact-blocks") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto"
        >
          <div
            className="p-8 sm:p-12 border-3 rounded-none shadow-[8px_8px_0_0_#000000] space-y-5"
            style={{ backgroundColor: tokens.cardBg, borderColor: "#000000" }}
          >
            <span
              className="inline-block px-3 py-1 font-black text-xs uppercase tracking-wider border-2 shadow-[2px_2px_0_0_#000000]"
              style={{ backgroundColor: tokens.accent, color: "#FFFFFF", borderColor: "#000000" }}
            >
              ⚡ FEATURED COMMERCIAL CATALOG
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight" style={{ color: tokens.text }}>
              {branding.heroHeadline || `Welcome to ${storeName}`}
            </h1>
            <p className="text-sm sm:text-lg font-bold max-w-2xl" style={{ color: tokens.textMuted }}>
              {branding.heroSubheadline || `Built for performance and maximum impact. Exclusive catalog for ${initialStore.clientName}.`}
            </p>
            <button
              type="button"
              onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3.5 text-sm font-black uppercase tracking-wider border-2 shadow-[4px_4px_0_0_#000000] cursor-pointer"
              style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: "#000000" }}
            >
              {branding.ctaText || "Shop Drops Now"}
            </button>
            {branding.bannerUrl && (
              <div className="border-3 border-black shadow-[4px_4px_0_0_#000000] overflow-hidden aspect-[16/8] sm:aspect-[21/9] max-h-[360px] w-full mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        </section>
      );
    }

    // Hero 4: Commercial Banner (Classic Commerce)
    if (layout === "commercial-banner") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-10 sm:py-14 px-4 sm:px-6 max-w-6xl mx-auto"
        >
          <div
            className="rounded-xl border p-6 sm:p-10 flex flex-col gap-6 shadow-sm"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-4 max-w-xl text-left">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.accent }}>
                  {initialStore.websiteType === "appointments"
                    ? "Professional Practice"
                    : initialStore.websiteType === "lead_gen"
                    ? "Advisory Practice"
                    : "Special Catalog Showcase"}
                </span>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ color: tokens.text }}>
                  {branding.heroHeadline || `Welcome to ${storeName}`}
                </h1>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
                  {branding.heroSubheadline ||
                    (initialStore.websiteType === "appointments"
                      ? "Explore our legal and advisory practice areas, consultation schedule, and specialist team."
                      : initialStore.websiteType === "lead_gen"
                      ? "Explore our strategic growth advisory, partnership programs, and consultation options."
                      : "Browse our featured catalog and explore available collections and products.")}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="px-6 py-2.5 rounded-md text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {branding.ctaText ||
                      (initialStore.websiteType === "appointments"
                        ? "Book Consultation"
                        : initialStore.websiteType === "lead_gen"
                        ? "Request Consultation"
                        : "Explore Products")}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
                <div className="p-4 rounded-lg border text-center" style={{ backgroundColor: tokens.background, borderColor: tokens.border }}>
                  <Star className="h-5 w-5 mx-auto mb-1 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold block" style={{ color: tokens.text }}>
                    {initialStore.websiteType === "appointments"
                      ? "Verified Practice"
                      : initialStore.websiteType === "lead_gen"
                      ? "Verified Advisory"
                      : "Curated Selection"}
                  </span>
                  <span className="text-[10px]" style={{ color: tokens.textMuted }}>
                    {initialStore.websiteType === "appointments"
                      ? "Direct Specialist"
                      : initialStore.websiteType === "lead_gen"
                      ? "Direct Advisory"
                      : "Direct from Store"}
                  </span>
                </div>
                <div className="p-4 rounded-lg border text-center" style={{ backgroundColor: tokens.background, borderColor: tokens.border }}>
                  <Clock className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                  <span className="text-xs font-bold block" style={{ color: tokens.text }}>
                    {initialStore.websiteType === "appointments"
                      ? "Direct Booking"
                      : initialStore.websiteType === "lead_gen"
                      ? "Direct Inquiry"
                      : "Direct Order"}
                  </span>
                  <span className="text-[10px]" style={{ color: tokens.textMuted }}>
                    {initialStore.websiteType === "appointments"
                      ? "Instant Confirmation"
                      : initialStore.websiteType === "lead_gen"
                      ? "Prompt Consultation"
                      : "Online Checkout"}
                  </span>
                </div>
              </div>
            </div>
            {branding.bannerUrl && (
              <div className="w-full rounded-lg overflow-hidden border shadow-xs aspect-[16/7] sm:aspect-[21/8] max-h-[340px]" style={{ borderColor: tokens.border }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        </section>
      );
    }

    // Hero 5: Magazine Story (Editorial Magazine)
    if (layout === "magazine-story") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto border-b"
          style={{ borderColor: tokens.border }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8 space-y-4">
              <span className="text-xs font-serif uppercase tracking-widest" style={{ color: tokens.accent }}>
                Cover Story • Field Report
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black leading-tight tracking-tight" style={{ color: tokens.text }}>
                {branding.heroHeadline || `Welcome to ${storeName}`}
              </h1>
              <p className="text-base sm:text-lg font-serif opacity-80 leading-relaxed" style={{ color: tokens.textMuted }}>
                {branding.heroSubheadline || `An in-depth inquiry into contemporary artisanal creation for ${initialStore.clientName}.`}
              </p>
            </div>
            <div className="md:col-span-4 border-l pl-6 space-y-4" style={{ borderColor: tokens.border }}>
              <span className="text-xs font-serif uppercase tracking-wider font-bold block" style={{ color: tokens.text }}>
                Editorial Perspective
              </span>
              <p className="text-xs font-serif leading-relaxed italic" style={{ color: tokens.textMuted }}>
                &ldquo;Design is not merely aesthetic ornamentation, but the thoughtful orchestration of everyday human experience.&rdquo;
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
                className="text-xs font-serif uppercase tracking-wider font-bold underline flex items-center gap-1.5"
                style={{ color: primaryColor }}
              >
                <span>Read Full Curation</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {branding.bannerUrl && (
            <div className="mt-8 border overflow-hidden aspect-[16/7] sm:aspect-[21/9] max-h-[400px] relative" style={{ borderColor: tokens.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.bannerUrl}
                alt={storeName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-4 py-1.5 text-[10px] font-serif uppercase tracking-wider backdrop-blur-xs border-t"
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textMuted }}
              >
                Visual Feature • Collection Overview
              </div>
            </div>
          )}
        </section>
      );
    }

    // Hero 6: Organic Flow (Organic & Natural)
    if (layout === "organic-flow") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto"
        >
          <div
            className="p-8 sm:p-14 rounded-3xl border text-center space-y-5"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}>
              <Leaf className="h-3.5 w-3.5" />
              <span>Thoughtful Design & Balanced Materials</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {branding.heroHeadline || `Welcome to ${storeName}`}
            </h1>
            <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed" style={{ color: tokens.textMuted }}>
              {branding.heroSubheadline || `Earthy textures, wholesome ingredients, and sustainable creations for ${initialStore.clientName}.`}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
                className="px-6 py-3 rounded-2xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {branding.ctaText || "Explore Mindful Goods"}
              </button>
            </div>
            {branding.bannerUrl && (
              <div className="rounded-2xl overflow-hidden border shadow-sm aspect-[16/8] sm:aspect-[21/9] max-h-[360px] mx-auto mt-4" style={{ borderColor: tokens.border }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        </section>
      );
    }

    // Hero 7: Cyber Specs (Tech & Futuristic)
    if (layout === "cyber-specs") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto font-mono"
        >
          <div
            className="border p-6 sm:p-10 rounded-none space-y-6"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div className="flex items-center justify-between border-b pb-3 text-xs" style={{ borderColor: tokens.border, color: tokens.badgeText }}>
              <span>SYSTEM ARCHITECTURE // v4.2</span>
              <span>DEPLOYED NODE: LOCALHOST:3000</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider" style={{ color: primaryColor }}>
              {branding.heroHeadline || `Welcome to ${storeName}`}
            </h1>
            <p className="text-xs sm:text-sm font-sans max-w-2xl leading-relaxed" style={{ color: tokens.textMuted }}>
              {branding.heroSubheadline || `Engineered dark-mode experience featuring precision telemetry and micro-specifications.`}
            </p>
            {branding.bannerUrl && (
              <div className="border overflow-hidden aspect-[16/8] sm:aspect-[21/9] max-h-[340px] relative group" style={{ borderColor: tokens.border }}>
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-black/70 border border-emerald-500/40 text-emerald-400">
                  OPTICAL_FEED // LIVE_STREAM
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover filter contrast-105"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">THROUGHPUT</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>10.4 GB/s</span>
              </div>
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">UPTIME SLA</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>99.99%</span>
              </div>
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">FIRMWARE</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>v2.8-STABLE</span>
              </div>
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">ENCRYPTION</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>AES-256-GCM</span>
              </div>
            </div>
          </div>
        </section>
      );
    }

    // Hero 8: Asymmetric Cards (Playful & Creative)
    return (
      <section
        key="hero"
        data-anchor="section.hero"
        className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-5"
      >
        <div className="inline-block transform -rotate-1 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-xs" style={{ backgroundColor: tokens.accent }}>
          🎉 Super Fun Shopping Experience!
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ color: tokens.text }}>
          {branding.heroHeadline || `Welcome to ${storeName}`}
        </h1>
        <p className="text-sm sm:text-base font-medium max-w-xl mx-auto" style={{ color: tokens.textMuted }}>
          {branding.heroSubheadline || `A joyful storefront built with bold neo-brutalist accents and bright cheerful energy.`}
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3 rounded-full text-sm font-black text-white shadow-lg transform hover:scale-105 active:scale-95 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            {branding.ctaText || "Explore Fun Drops ✨"}
          </button>
        </div>
        {branding.bannerUrl && (
          <div className="rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000000] overflow-hidden aspect-[16/8] sm:aspect-[21/9] max-h-[360px] max-w-4xl mx-auto mt-6 transform -rotate-1 hover:rotate-0 transition-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.bannerUrl}
              alt={storeName}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
            />
          </div>
        )}
      </section>
    );
  };

  // -------------------------------------------------------------
  // TAILORED VALUE PROPOSITIONS SECTION (Hidden by default unless configured)
  // -------------------------------------------------------------
  const renderValueProps = () => {
    return null;
  };

  // -------------------------------------------------------------
  // DISTINCT PRODUCT CARD RENDERING PER DESIGN TEMPLATE
  // -------------------------------------------------------------
  const renderProductCard = (prod: Product) => {
    const cardStyle = activeDesignTemplate.cardLayout;
    const hasValidImage = prod.imageUrl && !imageErrors[prod.id];
    const hasDiscount = prod.compareAtPrice && prod.compareAtPrice > prod.price;
    const discountPercent = hasDiscount
      ? Math.round(((prod.compareAtPrice! - prod.price) / prod.compareAtPrice!) * 100)
      : 0;
    const isAdded = addedItems[prod.id];

    // Card 1: Tall Lookbook (Luxury Editorial)
    if (cardStyle === "tall-editorial") {
      return (
        <div
          key={prod.id}
          data-anchor={`product.${prod.id}`}
          className="group flex flex-col justify-between border transition-all"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-stone-900">
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prod.imageUrl}
                alt={prod.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center font-serif">
                <span className="text-2xl font-light" style={{ color: tokens.accent }}>{prod.name.slice(0, 2).toUpperCase()}</span>
                <span className="text-[10px] uppercase tracking-widest mt-2" style={{ color: tokens.textMuted }}>{prod.category}</span>
              </div>
            )}
            <span
              className="absolute top-3 right-3 text-[10px] font-serif uppercase tracking-widest px-2.5 py-1 border backdrop-blur-md"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.accent, color: tokens.text }}
            >
              {prod.category}
            </span>
          </div>
          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div>
              {!isPreviewMode ? (
                <Link
                  href={`/store/${initialStore.slug}/products/${prod.id}`}
                  className="font-serif text-base tracking-wide line-clamp-1 hover:underline block"
                  style={{ color: tokens.text }}
                >
                  {prod.name}
                </Link>
              ) : (
                <h3 className="font-serif text-base tracking-wide line-clamp-1" style={{ color: tokens.text }}>
                  {prod.name}
                </h3>
              )}
              <p className="font-serif italic text-xs mt-1 line-clamp-2" style={{ color: tokens.textMuted }}>
                {prod.description}
              </p>
            </div>
            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
              <span className="font-serif text-base font-light" style={{ color: tokens.text }}>{formatINR(prod.price)}</span>
              <button
                type="button"
                onClick={() => handleQuickAdd(prod.id)}
                className="px-4 py-1.5 text-xs uppercase font-serif tracking-widest border transition-all hover:opacity-80"
                style={{ borderColor: tokens.accent, color: tokens.text }}
              >
                {isAdded ? "Added" : "Acquire"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Card 2: Block Solid (Bold & Vibrant)
    if (cardStyle === "block-solid") {
      return (
        <div
          key={prod.id}
          data-anchor={`product.${prod.id}`}
          className="border-2 shadow-[4px_4px_0_0_#000000] flex flex-col justify-between transition-all"
          style={{ backgroundColor: tokens.cardBg, borderColor: "#000000" }}
        >
          <div className="relative aspect-[4/3] overflow-hidden border-b-2" style={{ borderColor: "#000000" }}>
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-2xl uppercase" style={{ color: tokens.text }}>
                {prod.name.slice(0, 2)}
              </div>
            )}
            {hasDiscount && (
              <span className="absolute top-2 left-2 text-xs font-black uppercase px-2 py-0.5 border-2 shadow-[2px_2px_0_0_#000000] bg-rose-500 text-white border-black">
                {discountPercent}% OFF
              </span>
            )}
            <span className="absolute bottom-2 right-2 text-[10px] font-black uppercase px-2 py-0.5 border-2 shadow-[1px_1px_0_0_#000000] bg-yellow-300 text-black border-black">
              {prod.category}
            </span>
          </div>
          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div>
              {!isPreviewMode ? (
                <Link
                  href={`/store/${initialStore.slug}/products/${prod.id}`}
                  className="font-black text-sm uppercase line-clamp-1 hover:underline block"
                  style={{ color: tokens.text }}
                >
                  {prod.name}
                </Link>
              ) : (
                <h3 className="font-black text-sm uppercase line-clamp-1" style={{ color: tokens.text }}>{prod.name}</h3>
              )}
              <p className="text-xs font-bold mt-1 line-clamp-2" style={{ color: tokens.textMuted }}>{prod.description}</p>
            </div>
            <div className="pt-2 border-t-2 flex items-center justify-between" style={{ borderColor: "#000000" }}>
              <span className="text-base font-black" style={{ color: tokens.text }}>{formatINR(prod.price)}</span>
              <button
                type="button"
                onClick={() => handleQuickAdd(prod.id)}
                className="px-4 py-2 text-xs font-black uppercase border-2 shadow-[2px_2px_0_0_#000000] cursor-pointer"
                style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: "#000000" }}
              >
                {isAdded ? "Added!" : "Buy"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Card 3: Classic Rating (Classic Commerce)
    if (cardStyle === "classic-rating") {
      return (
        <div
          key={prod.id}
          data-anchor={`product.${prod.id}`}
          className="rounded-lg border shadow-xs flex flex-col justify-between overflow-hidden"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
        >
          <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800">
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xl" style={{ color: tokens.textMuted }}>
                {prod.name.slice(0, 2)}
              </div>
            )}
            <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-white/90 text-stone-800 shadow-xs">
              {prod.category}
            </span>
          </div>
          <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              {/* Conditional rating display: only render if specifications contain rating or reviews */}
              {(() => {
                const specRating = Array.isArray(prod.specifications)
                  ? prod.specifications.find((s) => s.name.toLowerCase() === "rating" || s.name.toLowerCase() === "reviews")?.value
                  : (prod.specifications as Record<string, string> | undefined)?.rating;
                if (!specRating) return null;
                return (
                  <div className="flex items-center gap-1 text-amber-500 text-[10px] mb-1">
                    <Star className="h-3 w-3 fill-amber-500" />
                    <Star className="h-3 w-3 fill-amber-500" />
                    <Star className="h-3 w-3 fill-amber-500" />
                    <Star className="h-3 w-3 fill-amber-500" />
                    <Star className="h-3 w-3 fill-amber-500" />
                    <span className="text-stone-500 ml-1">({specRating})</span>
                  </div>
                );
              })()}
              {!isPreviewMode ? (
                <Link
                  href={`/store/${initialStore.slug}/products/${prod.id}`}
                  className="font-bold text-sm line-clamp-1 hover:underline block"
                  style={{ color: tokens.text }}
                >
                  {prod.name}
                </Link>
              ) : (
                <h3 className="font-bold text-sm line-clamp-1" style={{ color: tokens.text }}>{prod.name}</h3>
              )}
              <p className="text-xs mt-1 line-clamp-2" style={{ color: tokens.textMuted }}>{prod.description}</p>
            </div>
            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
              <div>
                <span className="text-base font-bold" style={{ color: tokens.text }}>{formatINR(prod.price)}</span>
                {hasDiscount && (
                  <span className="text-xs line-through ml-1.5 opacity-50">{formatINR(prod.compareAtPrice!)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleQuickAdd(prod.id)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-white shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {isAdded ? "Added" : "Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Card 3.5: Captioned Story (Editorial Magazine)
    if (cardStyle === "captioned-story") {
      return (
        <div
          key={prod.id}
          data-anchor={`product.${prod.id}`}
          className="border-b pb-4 flex flex-col justify-between font-serif space-y-3"
          style={{ borderColor: tokens.border }}
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                <span className="text-xl font-serif italic" style={{ color: tokens.textMuted }}>{prod.name}</span>
              </div>
            )}
            <span
              className="absolute top-2 left-2 text-[9px] uppercase tracking-widest px-2 py-0.5 border"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.text }}
            >
              DISPATCH NO. {prod.sku || prod.id.slice(0, 5)}
            </span>
          </div>
          <div className="space-y-1.5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                {!isPreviewMode ? (
                  <Link
                    href={`/store/${initialStore.slug}/products/${prod.id}`}
                    className="font-bold text-sm tracking-tight line-clamp-1 hover:underline block"
                    style={{ color: tokens.text }}
                  >
                    {prod.name}
                  </Link>
                ) : (
                  <h3 className="font-bold text-sm tracking-tight line-clamp-1" style={{ color: tokens.text }}>
                    {prod.name}
                  </h3>
                )}
                <span className="font-serif text-sm font-semibold shrink-0" style={{ color: primaryColor }}>
                  {formatINR(prod.price)}
                </span>
              </div>
              <p className="text-xs italic leading-relaxed line-clamp-2" style={{ color: tokens.textMuted }}>
                “{prod.description}”
              </p>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-dashed" style={{ borderColor: tokens.border }}>
              <span className="text-[10px] uppercase tracking-wider font-sans opacity-60">{prod.category}</span>
              <button
                type="button"
                onClick={() => handleQuickAdd(prod.id)}
                className="text-xs font-serif font-bold uppercase tracking-wider hover:underline cursor-pointer"
                style={{ color: primaryColor }}
              >
                {isAdded ? "Added to Dispatch" : "Inquire / Acquire →"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Card 4: Monospaced Grid (Tech & Futuristic)
    if (cardStyle === "monospaced-grid") {
      return (
        <div
          key={prod.id}
          data-anchor={`product.${prod.id}`}
          className="border rounded-none font-mono flex flex-col justify-between"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
        >
          <div className="relative aspect-[4/3] bg-black">
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs" style={{ color: tokens.badgeText }}>
                <span>[ITEM_CODE: {prod.sku || prod.id.slice(0, 8)}]</span>
              </div>
            )}
            <span
              className="absolute top-2 right-2 text-[9px] px-2 py-0.5 border"
              style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
            >
              {prod.category}
            </span>
          </div>
          <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[9px] block opacity-50">SKU // {prod.sku || "PROD-GEN"}</span>
              {!isPreviewMode ? (
                <Link
                  href={`/store/${initialStore.slug}/products/${prod.id}`}
                  className="font-bold text-xs uppercase tracking-wider line-clamp-1 hover:underline block"
                  style={{ color: tokens.text }}
                >
                  {prod.name}
                </Link>
              ) : (
                <h3 className="font-bold text-xs uppercase tracking-wider line-clamp-1" style={{ color: tokens.text }}>{prod.name}</h3>
              )}
            </div>
            <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
              <span className="font-bold text-sm" style={{ color: tokens.badgeText }}>{formatINR(prod.price)}</span>
              <button
                type="button"
                onClick={() => handleQuickAdd(prod.id)}
                className="px-3 py-1 text-[10px] font-bold uppercase border"
                style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: tokens.border }}
              >
                {isAdded ? "ACQUIRED" : "ENGAGE"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Card 5: Soft Rounded (Organic & Natural)
    if (cardStyle === "soft-rounded") {
      return (
        <div
          key={prod.id}
          data-anchor={`product.${prod.id}`}
          className="rounded-3xl border p-3 flex flex-col justify-between shadow-xs transition-all hover:shadow-md"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
        >
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100">
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                <Leaf className="h-8 w-8 opacity-40" />
              </div>
            )}
            <span className="absolute top-2.5 right-2.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white/95 text-stone-800 shadow-2xs">
              {prod.category}
            </span>
          </div>
          <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              {!isPreviewMode ? (
                <Link
                  href={`/store/${initialStore.slug}/products/${prod.id}`}
                  className="font-semibold text-sm line-clamp-1 hover:underline block"
                  style={{ color: tokens.text }}
                >
                  {prod.name}
                </Link>
              ) : (
                <h3 className="font-semibold text-sm line-clamp-1" style={{ color: tokens.text }}>{prod.name}</h3>
              )}
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: tokens.textMuted }}>{prod.description}</p>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <span className="font-bold text-sm" style={{ color: tokens.text }}>{formatINR(prod.price)}</span>
              <button
                type="button"
                onClick={() => handleQuickAdd(prod.id)}
                className="px-4 py-1.5 rounded-xl text-xs font-medium text-white shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {isAdded ? "Added" : "Select"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Card 6: Sticker Playful (Playful & Creative)
    if (cardStyle === "sticker-playful") {
      return (
        <div
          key={prod.id}
          data-anchor={`product.${prod.id}`}
          className="rounded-2xl border-2 p-3 flex flex-col justify-between shadow-md transform hover:-translate-y-1 transition-all"
          style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
        >
          <div className="relative aspect-square rounded-xl overflow-hidden bg-indigo-50">
            {hasValidImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-2xl" style={{ color: tokens.accent }}>
                ✨
              </div>
            )}
            <span
              className="absolute top-2 left-2 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full transform -rotate-6 text-white shadow-xs"
              style={{ backgroundColor: tokens.accent }}
            >
              {prod.category}
            </span>
          </div>
          <div className="p-2 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              {!isPreviewMode ? (
                <Link
                  href={`/store/${initialStore.slug}/products/${prod.id}`}
                  className="font-black text-sm line-clamp-1 hover:underline block"
                  style={{ color: tokens.text }}
                >
                  {prod.name}
                </Link>
              ) : (
                <h3 className="font-black text-sm line-clamp-1" style={{ color: tokens.text }}>{prod.name}</h3>
              )}
              <p className="text-xs font-medium mt-0.5 line-clamp-2" style={{ color: tokens.textMuted }}>{prod.description}</p>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <span className="font-black text-base" style={{ color: primaryColor }}>{formatINR(prod.price)}</span>
              <button
                type="button"
                onClick={() => handleQuickAdd(prod.id)}
                className="px-4 py-1.5 rounded-full text-xs font-black text-white shadow-xs transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: primaryColor }}
              >
                {isAdded ? "YAY! 🎉" : "Add ✨"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default / Understated (Modern Minimal)
    return (
      <div
        key={prod.id}
        data-anchor={`product.${prod.id}`}
        className="rounded-xl border overflow-hidden flex flex-col justify-between group transition-all hover:shadow-lg"
        style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
      >
        <div className="relative overflow-hidden aspect-[4/3] bg-stone-100 flex items-center justify-center">
          {hasValidImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prod.imageUrl}
              alt={prod.name}
              onError={() => setImageErrors((prev) => ({ ...prev, [prod.id]: true }))}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex flex-col items-center justify-center text-xl font-bold tracking-wider select-none",
                prod.thumbnailColor || "bg-emerald-100 text-emerald-800"
              )}
            >
              <span>{prod.name.slice(0, 2).toUpperCase()}</span>
              <span className="text-[10px] font-medium opacity-70 mt-1">{prod.category}</span>
            </div>
          )}
          <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full bg-white/95 text-stone-800 shadow-xs backdrop-blur-xs">
            {prod.category}
          </span>
          {hasDiscount && (
            <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-0.5">
              <Percent className="h-2.5 w-2.5" />
              <span>{discountPercent}% OFF</span>
            </span>
          )}
        </div>
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          <div>
            {!isPreviewMode ? (
              <Link
                href={`/store/${initialStore.slug}/products/${prod.id}`}
                className="font-bold text-sm sm:text-base line-clamp-1 hover:underline block"
                style={{ color: tokens.text }}
              >
                {prod.name}
              </Link>
            ) : (
              <h3 className="font-bold text-sm sm:text-base line-clamp-1 group-hover:underline" style={{ color: tokens.text }}>
                {prod.name}
              </h3>
            )}
            <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: tokens.textMuted }}>
              {prod.description}
            </p>
          </div>
          <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: tokens.border }}>
            <div>
              <span className="text-[10px] block uppercase font-medium" style={{ color: tokens.textMuted }}>Price</span>
              <div className="flex items-baseline gap-1.5">
                <p className="text-base sm:text-lg font-bold" style={{ color: tokens.text }}>{formatINR(prod.price)}</p>
                {hasDiscount && (
                  <span className="text-xs line-through opacity-50 font-normal">{formatINR(prod.compareAtPrice!)}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAdd(prod.id)}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              style={{ backgroundColor: isAdded ? "#16804A" : primaryColor }}
            >
              {isAdded ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <span>Quick Add</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // DYNAMIC SECTION RENDERER
  // -------------------------------------------------------------
  const renderSectionBlock = (sectionId: string) => {
    if (!enabledSections.includes(sectionId)) return null;

    switch (sectionId) {
      case "hero":
        return styling?.heroVariation ? (
          <HeroSections
            key="hero"
            instance={{
              id: "hero_default",
              type: "hero_full_width",
              order: 0,
              visible: true,
              layoutVariant: styling.heroVariation,
              settings: {
                headline: branding.heroHeadline,
                subheadline: branding.heroSubheadline,
                bannerUrl: branding.bannerUrl,
                ctaText: branding.ctaText,
              },
            }}
            tokens={tokens}
            styling={styling}
            primaryColor={primaryColor}
            activeDesignTemplate={activeDesignTemplate}
            branding={branding}
          />
        ) : (
          renderHero()
        );

      case "featured_products":
        return (
          <React.Fragment key="featured_products">
            {renderValueProps()}

            <section
              id="catalog-section"
              data-anchor="section.featured_products"
              className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto"
            >
              {/* Header Title Bar */}
              <div
                className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-3 border-b pb-4"
                style={{ borderColor: tokens.border }}
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: tokens.accent }}>
                    {initialStore.websiteType === "appointments"
                      ? "Practice Offerings"
                      : initialStore.websiteType === "lead_gen"
                      ? "Specialized Services"
                      : "Curated Catalog"}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1" style={{ color: tokens.text }}>
                    {initialStore.websiteType === "appointments"
                      ? `Consultation Services (${products.length} Available)`
                      : initialStore.websiteType === "lead_gen"
                      ? `Advisory Practices (${products.length} Solutions)`
                      : `Featured Collection (${products.length} Products)`}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: tokens.textMuted }}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Showing {filteredProducts.length} of {products.length} items</span>
                </div>
              </div>

              {/* Category Filter Pills */}
              {categories.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("ALL")}
                      className={cn(
                        "min-h-[44px] px-4 py-2.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 border",
                        selectedCategory === "ALL" ? "text-white shadow-xs" : "hover:opacity-80"
                      )}
                      style={{
                        backgroundColor: selectedCategory === "ALL" ? primaryColor : tokens.surface,
                        borderColor: selectedCategory === "ALL" ? primaryColor : tokens.border,
                        color: selectedCategory === "ALL" ? "#FFFFFF" : tokens.text,
                      }}
                    >
                      <span>All Products</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                        {products.length}
                      </span>
                    </button>

                    {categories.map((cat) => {
                      const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
                          className={cn(
                            "min-h-[44px] px-4 py-2.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 border",
                            isSelected ? "text-white shadow-xs" : "hover:opacity-80"
                          )}
                          style={{
                            backgroundColor: isSelected ? primaryColor : tokens.surface,
                            borderColor: isSelected ? primaryColor : tokens.border,
                            color: isSelected ? "#FFFFFF" : tokens.text,
                          }}
                        >
                          <Tag className="h-3 w-3 opacity-70" />
                          <span>{cat.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeCategoryMeta?.description && (
                    <div
                      className="mt-3 p-3.5 rounded-xl border text-xs leading-relaxed"
                      style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
                    >
                      <strong className="font-semibold block mb-0.5">{activeCategoryMeta.name}</strong>
                      <span>{activeCategoryMeta.description}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Product Grid */}
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredProducts.map((prod) => renderProductCard(prod))}
                </div>
              ) : (
                <div
                  className="py-16 px-6 text-center rounded-2xl border space-y-3"
                  style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
                >
                  <Tag className="h-8 w-8 mx-auto opacity-40 text-stone-400" />
                  <h3 className="text-lg font-bold" style={{ color: tokens.text }}>No products found in &ldquo;{selectedCategory}&rdquo;</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ALL")}
                    className="min-h-[44px] px-5 py-2 rounded-lg text-xs font-semibold text-white shadow-xs cursor-pointer inline-flex items-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>View All Catalog Items</span>
                  </button>
                </div>
              )}
            </section>
          </React.Fragment>
        );

      case "about":
        return (
          <section
            key="about"
            data-anchor="section.about"
            className="py-12 sm:py-16 px-4 sm:px-6 border-t"
            style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
          >
            <div className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.accent }}>
                About {storeName}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
                Designed for {initialStore.clientName}
              </h2>
              <p className="text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl mx-auto" style={{ color: tokens.textMuted }}>
                {branding.aboutText ||
                  initialStore.description ||
                  `Every element of this demonstration has been tailored to reflect ${initialStore.clientName}'s distinctive brand heritage, modern e-commerce requirements, and audience expectations.`}
              </p>
            </div>
          </section>
        );

      case "newsletter":
        return (
          <section
            key="newsletter"
            data-anchor="section.newsletter"
            className="py-12 sm:py-16 px-4 sm:px-6 max-w-xl mx-auto text-center space-y-3 sm:space-y-4"
          >
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: tokens.text }}>Stay in Touch</h3>
            <p className="text-xs" style={{ color: tokens.textMuted }}>
              Subscribe to receive exclusive collection updates and private showroom previews.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter client email address"
                className="min-h-[44px] w-full rounded-lg border px-3.5 py-2.5 text-xs focus:outline-hidden"
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.text }}
              />
              <button
                type="button"
                className="min-h-[44px] px-5 py-2.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap cursor-pointer shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                Subscribe
              </button>
            </div>
          </section>
        );

      default: {
        try {
          const fallbackInstance = getDefaultSectionInstance(sectionId as SectionType, 0);
          return (
            <SectionRenderer
              key={`fallback_${sectionId}`}
              instance={fallbackInstance}
              tokens={tokens}
              styling={styling}
              primaryColor={primaryColor}
              storeSlug={initialStore.slug}
              storeName={storeName}
              clientName={initialStore.clientName}
              products={products}
              categories={categories}
              onQuickAdd={handleQuickAdd}
              addedItems={addedItems}
              activeDesignTemplate={activeDesignTemplate}
              branding={branding}
            />
          );
        } catch {
          return null;
        }
      }
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col transition-colors selection:bg-black/10 w-full max-w-full overflow-x-hidden"
      style={{
        fontFamily: branding.fontFamily,
        backgroundColor: tokens.background,
        color: tokens.text,
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
      {/* Demo Storefront Status Banner */}
      <div
        className="py-2 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2 border-b"
        style={{
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          color: tokens.textMuted,
        }}
      >
        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="truncate">
          <strong>GridRetail {isPreviewMode ? "Live Interactive Preview" : "Live Demo Storefront"}</strong> — Layout: <em>{activeDesignTemplate.name}</em> • Theme: <em>{activeTheme.name}</em>
        </span>
      </div>

      {/* Dynamic Header */}
      {renderHeader()}

      {/* Main Content Sections */}
      <main className="flex-1">
        {sections && sections.length > 0
          ? sections
              .filter((sec) => sec.type !== "footer_custom")
              .map((sec) => (
                <SectionRenderer
                  key={sec.id}
                  instance={sec}
                  tokens={tokens}
                  styling={styling}
                  primaryColor={primaryColor}
                  storeSlug={initialStore.slug}
                  storeName={storeName}
                  clientName={initialStore.clientName}
                  products={products}
                  categories={categories}
                  onQuickAdd={handleQuickAdd}
                  addedItems={addedItems}
                  activeDesignTemplate={activeDesignTemplate}
                  branding={branding}
                  isSelected={selectedSectionId === sec.id}
                />
              ))
          : orderedSections
              .filter((id) => id !== "footer")
              .map((id) => renderSectionBlock(id))}
      </main>

      {/* FOOTER */}
      {sections.some((sec) => sec.type === "footer_custom" && sec.visible) ? (
        sections
          .filter((sec) => sec.type === "footer_custom" && sec.visible)
          .map((sec) => (
            <SectionRenderer
              key={sec.id}
              instance={sec}
              tokens={tokens}
              styling={styling}
              primaryColor={primaryColor}
              storeSlug={initialStore.slug}
              storeName={storeName}
              clientName={initialStore.clientName}
              products={products}
              categories={categories}
              onQuickAdd={handleQuickAdd}
              addedItems={addedItems}
              activeDesignTemplate={activeDesignTemplate}
              branding={branding}
              isSelected={selectedSectionId === sec.id}
            />
          ))
      ) : (
        orderedSections.includes("footer") && enabledSections.includes("footer") && (
          <FooterSection
            instance={{
              id: "default_footer",
              type: "footer_custom",
              order: 99,
              visible: true,
              layoutVariant: styling?.footerVariation || "multi_column",
              settings: {},
            }}
            tokens={tokens}
            styling={styling}
            primaryColor={primaryColor}
            storeName={storeName}
            clientName={initialStore.clientName}
            storeSlug={initialStore.slug}
            categories={categories}
          />
        )
      )}


      {/* INTERACTIVE CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-md border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b flex items-center justify-between" style={{ borderColor: tokens.border }}>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" style={{ color: primaryColor }} />
                  <h2 className="text-lg font-bold" style={{ color: tokens.text }}>Shopping Bag</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}>
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors"
                  style={{ color: tokens.textMuted }}
                  aria-label="Close cart drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {Object.keys(cartItems).length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-stone-100 dark:bg-stone-800">
                      <ShoppingBag className="h-6 w-6 opacity-40" />
                    </div>
                    <p className="text-sm font-medium" style={{ color: tokens.text }}>Your bag is empty</p>
                    <p className="text-xs max-w-xs mx-auto" style={{ color: tokens.textMuted }}>
                      Add items from the featured collection to build an order preview.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCartOpen(false);
                          document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Browse Catalog
                      </button>
                      {!isPreviewMode && (
                        <Link
                          href={`/store/${initialStore.slug}/collections`}
                          onClick={() => setIsCartOpen(false)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold border hover:bg-stone-100/50 transition-colors"
                          style={{ borderColor: tokens.border, color: tokens.text }}
                        >
                          View Collections
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  Object.entries(cartItems).map(([productId, quantity]) => {
                    const prod = products.find((p) => p.id === productId);
                    if (!prod) return null;
                    return (
                      <div
                        key={productId}
                        className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-100 flex items-center justify-center">
                          {prod.imageUrl && !imageErrors[prod.id] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-xs" style={{ color: tokens.textMuted }}>
                              {prod.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs truncate" style={{ color: tokens.text }}>{prod.name}</h4>
                          <p className="text-[11px]" style={{ color: tokens.textMuted }}>{formatINR(prod.price)} each</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center border rounded-md" style={{ borderColor: tokens.border }}>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(productId, -1)}
                                className="px-2 py-0.5 hover:bg-stone-200/50 text-xs"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2 text-xs font-semibold">{quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(productId, 1)}
                                className="px-2 py-0.5 hover:bg-stone-200/50 text-xs"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(productId)}
                              className="text-stone-400 hover:text-rose-500 transition-colors p-1"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-xs" style={{ color: tokens.text }}>
                            {formatINR(prod.price * quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Subtotal & Checkout */}
              {Object.keys(cartItems).length > 0 && (
                <div className="p-4 sm:p-6 border-t space-y-3" style={{ borderColor: tokens.border }}>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: tokens.textMuted }}>Subtotal</span>
                    <span className="font-bold text-sm" style={{ color: tokens.text }}>{formatINR(cartSubtotal)}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
                    <span className="font-bold text-sm" style={{ color: tokens.text }}>Total Due</span>
                    <span className="font-black text-base" style={{ color: primaryColor }}>{formatINR(cartSubtotal)}</span>
                  </div>
                  {isPreviewMode ? (
                    <button
                      type="button"
                      onClick={() => alert(`Demo checkout order simulated for ${storeName} (Total: ${formatINR(cartSubtotal)})`)}
                      className="w-full py-3 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>Proceed to Simulated Checkout</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <Link
                        href={`/store/${initialStore.slug}/checkout`}
                        onClick={() => setIsCartOpen(false)}
                        className="w-full py-3 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 text-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span>Proceed to Simulated Checkout</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/store/${initialStore.slug}/cart`}
                        onClick={() => setIsCartOpen(false)}
                        className="w-full py-2.5 rounded-xl font-semibold text-xs border text-center transition-colors block hover:bg-stone-100/50"
                        style={{ borderColor: tokens.border, color: tokens.text }}
                      >
                        View Full Shopping Bag
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
