"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Product, StoreCategory } from "@/types";
import { SectionInstance } from "@/types/section";
import { ColorThemeTokens, DesignTemplate } from "@/types/template";
import { StoreStylingTokens } from "@/types/store";
import { ShoppingBag, ArrowRight, Check, Tag, ArrowRightCircle, Star } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/currency";

interface ProductSectionsProps {
  instance: SectionInstance;
  tokens: ColorThemeTokens;
  styling?: StoreStylingTokens;
  primaryColor: string;
  storeSlug: string;
  products: Product[];
  categories: StoreCategory[];
  onQuickAdd: (productId: string) => void;
  addedItems: Record<string, boolean>;
  activeDesignTemplate?: DesignTemplate;
}

export function ProductSections({
  instance,
  tokens,
  styling,
  primaryColor,
  storeSlug,
  products,
  categories,
  onQuickAdd,
  addedItems,
  activeDesignTemplate,
}: ProductSectionsProps) {
  const { type, layoutVariant } = instance;
  const cardLayout = activeDesignTemplate?.cardLayout;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (instance.settings || {}) as Record<string, any>;
  const settings = s;
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const buttonRadiusClass =
    styling?.buttonRadius === "sharp" || cardLayout === "block-solid" || cardLayout === "monospaced-grid"
      ? "rounded-none"
      : styling?.buttonRadius === "pill" || cardLayout === "soft-rounded"
      ? "rounded-full"
      : "rounded-lg";

  const effectiveCardVariation = styling?.cardVariation || styling?.cardStyle;
  const cardRadiusClass =
    effectiveCardVariation === "block_solid" || cardLayout === "block-solid"
      ? "border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none"
      : effectiveCardVariation === "soft_rounded" || cardLayout === "soft-rounded"
      ? "border shadow-sm rounded-3xl"
      : effectiveCardVariation === "floating"
      ? "border shadow-2xl hover:-translate-y-1 transition-transform rounded-2xl"
      : effectiveCardVariation === "flat" || cardLayout === "tall-editorial"
      ? "border-0 shadow-none rounded-xl"
      : effectiveCardVariation === "bordered"
      ? "border shadow-none rounded-xl"
      : effectiveCardVariation === "elevated"
      ? "border shadow-xl rounded-2xl"
      : "rounded-2xl border shadow-xs";

  const contentWidthClass =
    styling?.contentWidth === "compact"
      ? "max-w-5xl"
      : styling?.contentWidth === "wide"
      ? "max-w-7xl"
      : "max-w-6xl";

  const aspectClass = cardLayout === "tall-editorial" ? "aspect-[3/4]" : "aspect-square";

  // Reusable Single Product Card Component
  const renderProductCard = (product: Product, badgeText?: string) => {
    const isAdded = !!addedItems[product.id];
    const hasDiscount =
      typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
      ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
      : null;

    return (
      <div
        key={product.id}
        data-card-treatment={effectiveCardVariation || "bordered"}
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-md",
          cardRadiusClass
        )}
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: tokens.border,
        }}
      >
        {/* Card Media Container */}
        <Link
          href={`/store/${storeSlug}/products/${product.id}`}
          className={cn("relative w-full overflow-hidden block", aspectClass)}
          style={{ backgroundColor: tokens.surface }}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={cn("h-full w-full flex items-center justify-center p-4", product.thumbnailColor)}>
              <span className="text-xs font-bold uppercase tracking-wider text-center">{product.name}</span>
            </div>
          )}

          {/* Badges Overlay */}
          <div className={cn(
            "absolute top-2.5 left-2.5 flex flex-col gap-1 items-start",
            cardLayout === "sticker-playful" && "-rotate-3 group-hover:rotate-0 transition-transform"
          )}>
            {badgeText && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs"
                style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}
              >
                {badgeText}
              </span>
            )}
            {hasDiscount && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white shadow-xs">
                -{discountPercent}%
              </span>
            )}
          </div>
        </Link>

        {/* Card Content & Action */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: tokens.textMuted }}>
              <span className="truncate">{product.category}</span>
              <span className="text-[10px] uppercase font-mono">{product.sku}</span>
            </div>
            <Link
              href={`/store/${storeSlug}/products/${product.id}`}
              className={cn(
                "font-bold text-xs sm:text-sm line-clamp-1 hover:underline",
                cardLayout === "tall-editorial" && "font-serif text-sm font-normal",
                cardLayout === "block-solid" && "font-black uppercase tracking-tight",
                cardLayout === "monospaced-grid" && "font-mono"
              )}
              style={{ color: tokens.text }}
            >
              {product.name}
            </Link>

            {/* Classic Commerce Rating row (only rendered when real product rating data exists) */}
            {cardLayout === "classic-rating" && typeof (product as unknown as { rating?: number }).rating === "number" && (
              <div className="flex items-center gap-1 mt-1">
                <div className="flex text-amber-400">
                  {[...Array(Math.min(5, Math.floor((product as unknown as { rating: number }).rating)))].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </div>
                <span className="text-[10px] font-medium opacity-70">
                  {((product as unknown as { rating: number }).rating).toFixed(1)}
                  {typeof (product as unknown as { reviewCount?: number }).reviewCount === "number" &&
                    ` (${(product as unknown as { reviewCount: number }).reviewCount})`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: tokens.border }}>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-xs sm:text-sm" style={{ color: tokens.text }}>
                {formatINR(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] line-through" style={{ color: tokens.textMuted }}>
                  {formatINR(product.compareAtPrice)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onQuickAdd(product.id)}
              className={cn(
                "min-h-[44px] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer",
                buttonRadiusClass,
                cardLayout === "block-solid" && "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase font-black"
              )}
              style={{ backgroundColor: isAdded ? "#10B981" : primaryColor }}
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Quick Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // 1. FEATURED PRODUCTS GRID
  // -------------------------------------------------------------
  if (type === "featured_products") {
    const limit = Number(settings.productLimit) || 8;
    const showFilter = settings.showCategoryFilter !== false;

    const filtered =
      selectedCategory === "ALL"
        ? products
        : products.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());

    const displayed = filtered.slice(0, limit);

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className={cn(contentWidthClass, "mx-auto space-y-8")}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
                {(settings.title as string) || "Featured Catalog"}
              </h2>
              {settings.subtitle && (
                <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                  {settings.subtitle as string}
                </p>
              )}
            </div>

            {/* Category Filter Tabs */}
            {showFilter && (
              <div className="flex flex-wrap gap-1.5 border p-1 rounded-xl" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={cn(
                    "min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                    selectedCategory === "ALL"
                      ? "text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  )}
                  style={{ backgroundColor: selectedCategory === "ALL" ? primaryColor : "transparent" }}
                >
                  All ({products.length})
                </button>
                {categories.map((cat) => {
                  const count = products.filter(
                    (p) => p.category?.toLowerCase() === cat.name.toLowerCase()
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={cn(
                        "min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        selectedCategory === cat.name
                          ? "text-white shadow-xs"
                          : "text-stone-600 hover:text-stone-900"
                      )}
                      style={{ backgroundColor: selectedCategory === cat.name ? primaryColor : "transparent" }}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product Grid */}
          {displayed.length > 0 ? (
            <div
              className={cn(
                "grid gap-4 sm:gap-6",
                layoutVariant === "grid_3_cols"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              )}
            >
              {displayed.map((prod) => renderProductCard(prod))}
            </div>
          ) : (
            <div
              className="py-16 px-6 text-center rounded-2xl border space-y-3"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <Tag className="h-8 w-8 mx-auto opacity-40 text-stone-400" />
              <h3 className="text-base font-bold" style={{ color: tokens.text }}>
                No products found in this category
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={cn("min-h-[44px] px-4 py-2 text-xs font-semibold text-white cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 2. BESTSELLERS SPOTLIGHT
  // -------------------------------------------------------------
  if (type === "bestsellers_grid") {
    const limit = Number(settings.productLimit) || 4;
    const bestsellers = products.slice(0, limit);

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className={cn(contentWidthClass, "mx-auto space-y-8")}>
          <div className="text-center max-w-2xl mx-auto space-y-2">
            {settings.badge && (
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.accent }}>
                {settings.badge as string}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Bestsellers Spotlight"}
            </h2>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                {settings.subtitle as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestsellers.map((prod, idx) => renderProductCard(prod, `Bestseller #${idx + 1}`))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 3. NEW ARRIVALS
  // -------------------------------------------------------------
  if (type === "new_arrivals") {
    const limit = Number(settings.productLimit) || 6;
    const arrivals = [...products]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className={cn(contentWidthClass, "mx-auto space-y-8")}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.accent }}>
                {(settings.badge as string) || "Fresh In Studio"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
                {(settings.title as string) || "Latest Arrivals"}
              </h2>
            </div>
            <Link
              href={`/store/${storeSlug}/collections`}
              className="text-xs font-semibold flex items-center gap-1 hover:underline"
              style={{ color: primaryColor }}
            >
              <span>View All Pieces</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {arrivals.map((prod) => renderProductCard(prod, "New"))}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 4. COLLECTION & CATEGORY TILES
  // -------------------------------------------------------------
  if (type === "collection_showcase") {
    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div className={cn(contentWidthClass, "mx-auto space-y-8")}>
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Explore by Collection"}
            </h2>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                {settings.subtitle as string}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, idx) => {
              const catProds = products.filter(
                (p) => p.category?.toLowerCase() === cat.name.toLowerCase()
              );
              const sampleImage = catProds.find((p) => p.imageUrl)?.imageUrl;

              return (
                <Link
                  key={cat.id || idx}
                  href={`/store/${storeSlug}/collections/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group relative aspect-4/3 rounded-2xl overflow-hidden border shadow-sm flex flex-col justify-end p-6"
                  style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}
                >
                  {sampleImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sampleImage}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-radial from-stone-200 to-stone-300" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="relative z-10 text-white space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      {catProds.length} Products
                    </span>
                    <h3 className="text-xl font-bold tracking-tight">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-stone-300 line-clamp-1">{cat.description}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 5. PRODUCT COMPARISON MATRIX
  // -------------------------------------------------------------
  if (type === "product_comparison") {
    const compareProds = products.slice(0, 2);

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-20 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.title as string) || "Compare Specifications"}
            </h2>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
                {settings.subtitle as string}
              </p>
            )}
          </div>

          {compareProds.length >= 2 ? (
            <div className="border rounded-2xl overflow-hidden shadow-xs" style={{ borderColor: tokens.border }}>
              <div className="grid grid-cols-3 p-4 border-b font-bold text-xs" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
                <div>Specification</div>
                <div className="text-center">{compareProds[0].name}</div>
                <div className="text-center">{compareProds[1].name}</div>
              </div>

              {[
                { label: "Price", v1: formatINR(compareProds[0].price), v2: formatINR(compareProds[1].price) },
                { label: "Stock Availability", v1: compareProds[0].stockStatus, v2: compareProds[1].stockStatus },
                { label: "Catalog Category", v1: compareProds[0].category, v2: compareProds[1].category },
                { label: "SKU Identifier", v1: compareProds[0].sku, v2: compareProds[1].sku },
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-3 p-4 border-b text-xs last:border-b-0" style={{ borderColor: tokens.border }}>
                  <div className="font-semibold" style={{ color: tokens.textMuted }}>{row.label}</div>
                  <div className="text-center" style={{ color: tokens.text }}>{row.v1}</div>
                  <div className="text-center" style={{ color: tokens.text }}>{row.v2}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs" style={{ color: tokens.textMuted }}>
              Add at least two products to this store to enable comparative specification analysis.
            </p>
          )}
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------
  // 6. PRODUCT DISCOVERY CTA
  // -------------------------------------------------------------
  if (type === "product_discovery_cta") {
    const imageUrl = settings.imageUrl as string;

    return (
      <section
        data-anchor={`section.${instance.id}`}
        className="py-12 sm:py-16 px-4 sm:px-8 border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
      >
        <div
          className="max-w-6xl mx-auto rounded-3xl p-8 sm:p-12 border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm"
          style={{ borderColor: tokens.border, backgroundColor: tokens.cardBg }}
        >
          {imageUrl && (
            <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url(${imageUrl})` }} />
          )}

          <div className="relative z-10 max-w-xl space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {(settings.headline as string) || "Looking for Bespoke Commissions?"}
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
              {(settings.subheadline as string) || "Our master artisans craft custom editions for residential and hospitality projects."}
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <a
              href={(settings.ctaUrl as string) || "#contact"}
              className={cn("min-h-[44px] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md inline-flex items-center gap-2 cursor-pointer", buttonRadiusClass)}
              style={{ backgroundColor: primaryColor }}
            >
              <span>{(settings.ctaText as string) || "Inquire About Custom Orders"}</span>
              <ArrowRightCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
