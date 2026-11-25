"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Product } from "@/types";
import { Template } from "@/types/template";
import { resolveColorTokens } from "@/constants/themes";
import { useCart, parseCartItemKey } from "@/context/CartContext";
import { formatINR } from "@/utils/currency";
import {
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";

interface CartPageClientProps {
  store: Store;
  products: Product[];
  template: Template | null;
  storeSlug: string;
}

export function CartPageClient({
  store,
  products,
  storeSlug,
}: CartPageClientProps) {
  const router = useRouter();
  const { lineItems, updateQuantity, removeItem, clearCart, totalQuantity } = useCart();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const themeId = store.themeId || "minimal-stone";
  const tokens = resolveColorTokens(themeId);
  const primaryColor = store.branding?.primaryColor || tokens.primary;

  const cartEntries = Object.entries(lineItems);
  const cartSubtotal = cartEntries.reduce((sum, [, item]) => {
    const prod = products.find((p) => p.id === item.productId);
    return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tokens.background, color: tokens.text }}
    >
      {/* Sticky Top Header */}
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
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="font-bold text-sm" style={{ color: tokens.text }}>
                {store.name}
              </span>
              <span style={{ color: tokens.textMuted }}>•</span>
              <span style={{ color: tokens.textMuted }}>Shopping Bag &amp; Cart</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/store/${storeSlug}/collections`}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border hover:bg-stone-200/50 transition-colors"
              style={{ borderColor: tokens.border, color: tokens.text }}
            >
              Collections
            </Link>
          </div>
        </div>
      </header>

      {/* Main Cart Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: tokens.text }}>
            Shopping Bag ({totalQuantity})
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: tokens.textMuted }}>
            Review your selected pieces before proceeding to checkout.
          </p>
        </div>

        {cartEntries.length === 0 ? (
          <div
            className="p-12 sm:p-16 rounded-2xl border text-center space-y-4 max-w-lg mx-auto my-12"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: tokens.border }}
            >
              <ShoppingBag className="h-8 w-8" style={{ color: tokens.textMuted }} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: tokens.text }}>
              Your bag is currently empty
            </h2>
            <p className="text-xs" style={{ color: tokens.textMuted }}>
              Explore our curated collections to find signature artisanal pieces tailored for modern living.
            </p>
            <div className="pt-2">
              <Link
                href={`/store/${storeSlug}/collections`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-transform active:scale-98"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Browse Catalog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Cart Items Table / List */}
            <div className="lg:col-span-8 space-y-4">
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <div
                  className="px-6 py-3 border-b text-xs font-semibold uppercase tracking-wider flex items-center justify-between"
                  style={{ borderColor: tokens.border, color: tokens.textMuted }}
                >
                  <span>Product Details</span>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] hover:underline cursor-pointer opacity-75 hover:opacity-100"
                  >
                    Clear All
                  </button>
                </div>

                <div className="divide-y" style={{ borderColor: tokens.border }}>
                  {cartEntries.map(([itemKey, item]) => {
                    const prod = products.find((p) => p.id === item.productId);
                    if (!prod) return null;
                    const { variant } = parseCartItemKey(itemKey);
                    const displayVariant = item.variant || variant;

                    return (
                      <div
                        key={itemKey}
                        className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 justify-between"
                      >
                        {/* Thumbnail & Product Details */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-stone-100 border flex items-center justify-center" style={{ borderColor: tokens.border }}>
                            {prod.imageUrl && !imageErrors[prod.id] ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={() => setImageErrors((prev) => ({ ...prev, [prod.id]: true }))}
                              />
                            ) : (
                              <span className="font-bold text-sm" style={{ color: tokens.textMuted }}>
                                {prod.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <Link
                              href={`/store/${storeSlug}/products/${prod.id}`}
                              className="font-bold text-sm sm:text-base hover:underline block truncate"
                              style={{ color: tokens.text }}
                            >
                              {prod.name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs" style={{ color: tokens.textMuted }}>
                                {formatINR(prod.price)}
                              </span>
                              {displayVariant && (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                                  style={{ borderColor: tokens.border, color: tokens.text }}
                                >
                                  {displayVariant}
                                </span>
                              )}
                              <span className="text-[10px] text-stone-400">SKU: {prod.sku}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quantity and Line Total */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0" style={{ borderColor: tokens.border }}>
                          <div
                            className="flex items-center border rounded-xl"
                            style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, -1)}
                              className="p-2 hover:bg-stone-200/50 rounded-l-xl cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="px-3 text-xs font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemKey, 1)}
                              className="p-2 hover:bg-stone-200/50 rounded-r-xl cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-20">
                            <span className="font-black text-sm sm:text-base block" style={{ color: tokens.text }}>
                              {formatINR(prod.price * item.quantity)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(itemKey)}
                            className="p-2 rounded-lg text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Continue Shopping button */}
              <div className="pt-2 flex items-center justify-between">
                <Link
                  href={`/store/${storeSlug}/collections`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                  style={{ color: tokens.text }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Continue Shopping</span>
                </Link>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-4">
              <div
                className="rounded-2xl border p-6 space-y-5 sticky top-24"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <h2 className="font-bold text-base" style={{ color: tokens.text }}>
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs divide-y" style={{ borderColor: tokens.border }}>
                  <div className="flex items-center justify-between pt-1">
                    <span style={{ color: tokens.textMuted }}>Items Subtotal</span>
                    <span className="font-bold" style={{ color: tokens.text }}>
                      {formatINR(cartSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 text-sm">
                    <span className="font-bold" style={{ color: tokens.text }}>Total Due</span>
                    <span className="font-black text-lg" style={{ color: primaryColor }}>
                      {formatINR(cartSubtotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/store/${storeSlug}/checkout`)}
                  className="w-full py-3.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Proceed to Simulated Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Demonstration Notice */}
                <div className="pt-4 border-t text-[11px] leading-relaxed" style={{ borderColor: tokens.border, color: tokens.textMuted }}>
                  <p>
                    <strong>Interactive Demo:</strong> Store catalog, pricing, and checkout are simulated for evaluation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
