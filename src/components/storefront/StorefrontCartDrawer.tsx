"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, parseCartItemKey } from "@/context/CartContext";
import { Product } from "@/types/product";
import { ColorThemeTokens } from "@/types/template";
import { formatINR } from "@/utils/currency";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

interface StorefrontCartDrawerProps {
  products: Product[];
  tokens: ColorThemeTokens;
  primaryColor: string;
  storeName: string;
}

export function StorefrontCartDrawer({
  products,
  tokens,
  primaryColor,
  storeName,
}: StorefrontCartDrawerProps) {
  const router = useRouter();
  const { lineItems, cartOpen, setCartOpen, updateQuantity, removeItem, storeSlug } = useCart();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const cartEntries = Object.entries(lineItems);
  const cartSubtotal = cartEntries.reduce((sum, [, item]) => {
    const prod = products.find((p) => p.id === item.productId);
    return sum + (prod ? prod.price * item.quantity : 0);
  }, 0);

  if (!cartOpen) return null;

  const handleCheckoutClick = () => {
    setCartOpen(false);
    router.push(`/store/${storeSlug}/checkout`);
  };

  const handleViewCartClick = () => {
    setCartOpen(false);
    router.push(`/store/${storeSlug}/cart`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setCartOpen(false)}
        role="button"
        tabIndex={0}
        aria-label="Close cart overlay"
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") setCartOpen(false);
        }}
      />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-md shadow-2xl flex flex-col"
          style={{ backgroundColor: tokens.surface, color: tokens.text }}
        >
          {/* Header */}
          <div
            className="p-4 sm:p-6 border-b flex items-center justify-between"
            style={{ borderColor: tokens.border }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" style={{ color: primaryColor }} />
              <h3 className="font-bold text-base" style={{ color: tokens.text }}>
                {storeName ? `${storeName} Bag` : "Your Shopping Bag"}
              </h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: tokens.border, color: tokens.textMuted }}
              >
                {cartEntries.reduce((a, [, item]) => a + item.quantity, 0)} items
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(false)}
              className="p-1 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" style={{ color: tokens.textMuted }} />
            </button>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {cartEntries.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                  style={{ backgroundColor: tokens.cardBg }}
                >
                  <ShoppingBag className="h-8 w-8" style={{ color: tokens.textMuted }} />
                </div>
                <p className="font-medium text-sm" style={{ color: tokens.text }}>
                  Your bag is currently empty
                </p>
                <p className="text-xs max-w-xs mx-auto" style={{ color: tokens.textMuted }}>
                  Explore the catalog to discover curated products and timeless designs.
                </p>
              </div>
            ) : (
              cartEntries.map(([itemKey, item]) => {
                const prod = products.find((p) => p.id === item.productId);
                if (!prod) return null;
                const { variant } = parseCartItemKey(itemKey);
                const displayVariant = item.variant || variant;

                return (
                  <div
                    key={itemKey}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-100 flex items-center justify-center">
                      {prod.imageUrl && !imageErrors[prod.id] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                          onError={() => setImageErrors((prev) => ({ ...prev, [prod.id]: true }))}
                        />
                      ) : (
                        <span className="font-bold text-xs" style={{ color: tokens.textMuted }}>
                          {prod.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/store/${storeSlug}/products/${prod.id}`}
                        onClick={() => setCartOpen(false)}
                        className="font-semibold text-xs truncate block hover:underline"
                        style={{ color: tokens.text }}
                      >
                        {prod.name}
                      </Link>
                      {displayVariant && (
                        <span
                          className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded border"
                          style={{ borderColor: tokens.border, color: tokens.textMuted }}
                        >
                          {displayVariant}
                        </span>
                      )}
                      <p className="text-[11px] mt-0.5" style={{ color: tokens.textMuted }}>
                        {formatINR(prod.price)} each
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="flex items-center border rounded-md"
                          style={{ borderColor: tokens.border }}
                        >
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemKey, -1)}
                            className="px-2 py-0.5 hover:bg-stone-200/50 text-xs cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemKey, 1)}
                            className="px-2 py-0.5 hover:bg-stone-200/50 text-xs cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(itemKey)}
                          className="text-stone-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-xs" style={{ color: tokens.text }}>
                        {formatINR(prod.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Subtotal & Actions */}
          {cartEntries.length > 0 && (
            <div className="p-4 sm:p-6 border-t space-y-3" style={{ borderColor: tokens.border }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: tokens.textMuted }}>Subtotal</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>
                  {formatINR(cartSubtotal)}
                </span>
              </div>
              <div
                className="pt-2 border-t flex items-center justify-between"
                style={{ borderColor: tokens.border }}
              >
                <span className="font-bold text-sm" style={{ color: tokens.text }}>
                  Total Due
                </span>
                <span className="font-black text-base" style={{ color: primaryColor }}>
                  {formatINR(cartSubtotal)}
                </span>
              </div>

              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className="w-full py-3 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Proceed to Simulated Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleViewCartClick}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs border flex items-center justify-center gap-2 cursor-pointer hover:bg-stone-100/50 transition-colors"
                  style={{ borderColor: tokens.border, color: tokens.text }}
                >
                  <span>View &amp; Edit Full Cart</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
