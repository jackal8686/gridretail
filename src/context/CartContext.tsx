"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types/product";

export interface CartLineItem {
  key: string; // `${productId}:::${variant || ''}`
  productId: string;
  variant?: string;
  quantity: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string;
}

interface CartContextType {
  // Legacy compatibility: items maps itemKey -> quantity
  items: Record<string, number>;
  lineItems: Record<string, CartLineItem>;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addItem: (productId: string, quantity?: number, variant?: string) => void;
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, delta: number) => void;
  clearCart: () => void;
  totalQuantity: number;
  storeSlug: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function buildCartItemKey(productId: string, variant?: string): string {
  if (!variant || !variant.trim()) {
    return productId;
  }
  return `${productId}:::${variant.trim()}`;
}

export function parseCartItemKey(key: string): { productId: string; variant?: string } {
  if (key.includes(":::")) {
    const [productId, ...rest] = key.split(":::");
    const variant = rest.join(":::").trim();
    return { productId, variant: variant || undefined };
  }
  return { productId: key };
}

export function CartProvider({
  children,
  storeSlug,
}: {
  children: React.ReactNode;
  storeSlug: string;
}) {
  const [lineItems, setLineItems] = useState<Record<string, CartLineItem>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `gridretail_cart_v2_${storeSlug}`;
  const legacyStorageKey = `gridretail_cart_${storeSlug}`;

  // Hydrate cart from localStorage on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setLineItems(parsed);
        }
      } else {
        // Fallback check for v1 legacy cart
        const legacy = localStorage.getItem(legacyStorageKey);
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          if (parsedLegacy && typeof parsedLegacy === "object") {
            const converted: Record<string, CartLineItem> = {};
            for (const [prodId, qty] of Object.entries(parsedLegacy)) {
              if (typeof qty === "number" && qty > 0) {
                converted[prodId] = {
                  key: prodId,
                  productId: prodId,
                  quantity: qty,
                };
              }
            }
            setLineItems(converted);
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey, legacyStorageKey]);

  // Persist cart to localStorage
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lineItems));
      // Also write legacy map for any legacy components reading old key
      const legacyMap: Record<string, number> = {};
      for (const [, item] of Object.entries(lineItems)) {
        legacyMap[item.productId] = (legacyMap[item.productId] || 0) + item.quantity;
      }
      localStorage.setItem(legacyStorageKey, JSON.stringify(legacyMap));
    } catch {
      // Ignore localStorage errors
    }
  }, [lineItems, isLoaded, storageKey, legacyStorageKey]);

  const addItem = (productId: string, quantity = 1, variant?: string) => {
    const key = buildCartItemKey(productId, variant);
    setLineItems((prev) => {
      const existing = prev[key];
      const newQty = (existing?.quantity || 0) + quantity;
      return {
        ...prev,
        [key]: {
          key,
          productId,
          variant: variant || existing?.variant,
          quantity: newQty,
        },
      };
    });
    setCartOpen(true);
  };

  const removeItem = (itemKey: string) => {
    setLineItems((prev) => {
      const copy = { ...prev };
      // Check direct key or product ID
      if (copy[itemKey]) {
        delete copy[itemKey];
      } else {
        // If product ID was passed, remove all variants of this product
        for (const k of Object.keys(copy)) {
          if (copy[k].productId === itemKey) {
            delete copy[k];
          }
        }
      }
      return copy;
    });
  };

  const updateQuantity = (itemKey: string, delta: number) => {
    setLineItems((prev) => {
      let targetKey = itemKey;
      if (!prev[targetKey]) {
        // Try to match by productId if only prodId passed
        const foundKey = Object.keys(prev).find((k) => prev[k].productId === itemKey);
        if (foundKey) targetKey = foundKey;
      }

      const existing = prev[targetKey];
      if (!existing) return prev;

      const next = existing.quantity + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[targetKey];
        return copy;
      }

      return {
        ...prev,
        [targetKey]: {
          ...existing,
          quantity: next,
        },
      };
    });
  };

  const clearCart = () => {
    setLineItems({});
  };

  // Build legacy items map (key -> quantity)
  const items: Record<string, number> = {};
  for (const [key, item] of Object.entries(lineItems)) {
    items[key] = item.quantity;
  }

  const totalQuantity = Object.values(lineItems).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        lineItems,
        cartOpen,
        setCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalQuantity,
        storeSlug,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
