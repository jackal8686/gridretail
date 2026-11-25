"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Store, Product } from "@/types";
import { Template } from "@/types/template";
import { resolveColorTokens } from "@/constants/themes";
import { useCart } from "@/context/CartContext";
import { StorefrontCartDrawer } from "@/components/storefront/StorefrontCartDrawer";
import {
  ShoppingBag,
  ArrowLeft,
  Check,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/currency";

interface ProductDetailClientProps {
  store: Store;
  product: Product;
  relatedProducts: Product[];
  template: Template | null;
  storeSlug: string;
}

export function ProductDetailClient({
  store,
  product,
  relatedProducts,
  storeSlug,
}: ProductDetailClientProps) {
  const { addItem, setCartOpen, totalQuantity } = useCart();
  const [selectedImage, setSelectedImage] = useState<string>(
    product.imageUrl || (product.additionalImages && product.additionalImages[0]) || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );

  const themeId = store.themeId || "minimal-stone";
  const tokens = resolveColorTokens(themeId);
  const primaryColor = store.branding?.primaryColor || tokens.primary;

  const allImages: string[] = [];
  if (product.imageUrl) allImages.push(product.imageUrl);
  if (product.additionalImages) {
    product.additionalImages.forEach((img) => {
      if (!allImages.includes(img)) allImages.push(img);
    });
  }

  const handleAddToCart = () => {
    if (product.stockStatus === "Out of Stock") return;
    addItem(product.id, quantity, selectedVariant || undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  // Specs rendering helper
  const renderSpecifications = () => {
    if (!product.specifications) return null;
    let specList: { name: string; value: string }[] = [];
    if (Array.isArray(product.specifications)) {
      specList = product.specifications;
    } else if (typeof product.specifications === "object") {
      specList = Object.entries(product.specifications).map(([name, value]) => ({
        name,
        value: String(value),
      }));
    }

    if (specList.length === 0) return null;

    return (
      <div className="pt-6 border-t space-y-3" style={{ borderColor: tokens.border }}>
        <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: tokens.textMuted }}>
          Technical Specifications
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {specList.map((spec, i) => (
            <div
              key={i}
              className="p-2.5 rounded-lg border flex flex-col justify-between"
              style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
            >
              <dt className="text-[10px] uppercase font-semibold" style={{ color: tokens.textMuted }}>
                {spec.name}
              </dt>
              <dd className="font-medium text-xs mt-0.5" style={{ color: tokens.text }}>
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tokens.background, color: tokens.text }}
    >
      {/* Sticky Header / Navigation */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          backgroundColor: `${tokens.surface}F0`,
          borderColor: tokens.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/store/${storeSlug}`}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border hover:bg-stone-200/50 transition-colors"
              style={{ borderColor: tokens.border, color: tokens.text }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Store</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400">
              <Link href={`/store/${storeSlug}`} className="hover:underline">
                {store.name}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/store/${storeSlug}/collections/${product.category.toLowerCase().replace(/\s+/g, "-")}`}
                className="hover:underline"
                style={{ color: tokens.textMuted }}
              >
                {product.category}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium truncate max-w-xs" style={{ color: tokens.text }}>
                {product.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/store/${storeSlug}/collections`}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border hover:bg-stone-200/50 transition-colors hidden sm:inline-flex"
              style={{ borderColor: tokens.border, color: tokens.text }}
            >
              Collections
            </Link>
            <Link
              href={`/store/${storeSlug}/cart`}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border hover:bg-stone-200/50 transition-colors hidden sm:inline-flex"
              style={{ borderColor: tokens.border, color: tokens.text }}
            >
              Cart
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-xl border hover:bg-stone-200/50 transition-colors cursor-pointer"
              style={{ borderColor: tokens.border, color: tokens.text }}
              aria-label="View shopping bag"
            >
              <ShoppingBag className="h-4 w-4" />
              {totalQuantity > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 h-4.5 min-w-4.5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  {totalQuantity}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main PDP Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left: Gallery Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Stage Image */}
            <div
              className="relative aspect-4/3 sm:aspect-square w-full rounded-2xl overflow-hidden border flex items-center justify-center bg-stone-100"
              style={{ borderColor: tokens.border }}
            >
              {selectedImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-stone-300 font-bold"
                  style={{ backgroundColor: tokens.cardBg }}
                >
                  <Sparkles className="h-12 w-12 mb-2 text-stone-400" />
                  <span className="text-xl">{product.name.slice(0, 3).toUpperCase()}</span>
                </div>
              )}

              {discountPercent && (
                <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-sm">
                  Save {discountPercent}%
                </span>
              )}

              <span
                className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-md"
                style={{
                  backgroundColor: `${tokens.surface}E6`,
                  borderColor: tokens.border,
                  color: product.stockStatus === "In Stock" ? "#16a34a" : "#ca8a04",
                }}
              >
                ● {product.stockStatus}
              </span>
            </div>

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={cn(
                      "w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer",
                      selectedImage === img
                        ? "border-[#176B4D] shadow-md ring-2 ring-emerald-500/20"
                        : "border-stone-200 opacity-70 hover:opacity-100"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Buy Box & Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs uppercase font-semibold tracking-wider"
                  style={{ color: tokens.textMuted }}
                >
                  {product.category}
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-xs text-stone-400 font-mono">SKU: {product.sku}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: tokens.text }}>
                {product.name}
              </h1>
            </div>

            {/* Price section */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold tracking-tight" style={{ color: tokens.text }}>
                {formatINR(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-lg line-through text-stone-400 font-medium">
                  {formatINR(product.compareAtPrice)}
                </span>
              )}
              <span className="text-xs uppercase font-semibold" style={{ color: tokens.textMuted }}>
                {product.currency || "INR"}
              </span>
            </div>

            {/* Description */}
            <div className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
              <p>{product.description || "A curated piece crafted with high attention to quality, finish, and timeless design."}</p>
            </div>

            {/* Variants selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: tokens.text }}>
                  Select Option: <span className="font-normal text-stone-500">{selectedVariant}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                        selectedVariant === v
                          ? "bg-[#18231E] text-white border-[#18231E] shadow-xs"
                          : "border-stone-200 hover:border-stone-400 bg-white text-stone-700"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Picker & Add to Cart */}
            <div className="pt-4 border-t space-y-4" style={{ borderColor: tokens.border }}>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center border rounded-xl"
                  style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-2.5 hover:bg-stone-200/50 rounded-l-xl disabled:opacity-30 cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-4 text-xs font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="p-2.5 hover:bg-stone-200/50 rounded-r-xl cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stockStatus === "Out of Stock"}
                  className={cn(
                    "flex-1 py-3 px-6 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 text-white",
                    product.stockStatus === "Out of Stock"
                      ? "opacity-50 cursor-not-allowed bg-stone-400"
                      : added
                      ? "bg-emerald-600"
                      : ""
                  )}
                  style={{
                    backgroundColor: added
                      ? "#059669"
                      : product.stockStatus === "Out of Stock"
                      ? undefined
                      : primaryColor,
                  }}
                >
                  {added ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Added to Bag</span>
                    </>
                  ) : product.stockStatus === "Out of Stock" ? (
                    <span>Sold Out</span>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" />
                      <span>Add to Bag • {formatINR(product.price * quantity)}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Specs */}
              {renderSpecifications()}
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 sm:mt-24 pt-12 border-t" style={{ borderColor: tokens.border }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: tokens.text }}>
                  You May Also Like
                </h2>
                <p className="text-xs mt-1" style={{ color: tokens.textMuted }}>
                  Curated companion pieces from the {product.category} collection
                </p>
              </div>
              <Link
                href={`/store/${storeSlug}/collections/${product.category.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-xs font-semibold flex items-center gap-1 hover:underline"
                style={{ color: primaryColor }}
              >
                <span>View Collection</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/store/${storeSlug}/products/${rel.id}`}
                  className="group block rounded-2xl border overflow-hidden transition-all hover:shadow-lg"
                  style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
                >
                  <div className="aspect-square bg-stone-100 overflow-hidden flex items-center justify-center">
                    {rel.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={rel.imageUrl}
                        alt={rel.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="font-bold text-xs" style={{ color: tokens.textMuted }}>
                        {rel.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 space-y-1">
                    <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: tokens.textMuted }}>
                      {rel.category}
                    </p>
                    <h4 className="font-bold text-xs truncate group-hover:text-emerald-700 transition-colors" style={{ color: tokens.text }}>
                      {rel.name}
                    </h4>
                    <p className="font-bold text-xs mt-1" style={{ color: primaryColor }}>
                      {formatINR(rel.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <StorefrontCartDrawer
        products={[product, ...relatedProducts]}
        tokens={tokens}
        primaryColor={primaryColor}
        storeName={store.name}
      />
    </div>
  );
}
