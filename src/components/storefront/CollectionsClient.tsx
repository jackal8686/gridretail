"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Store, Product, StoreCategory } from "@/types";
import { Template } from "@/types/template";
import { resolveColorTokens } from "@/constants/themes";
import { useCart } from "@/context/CartContext";
import { StorefrontCartDrawer } from "@/components/storefront/StorefrontCartDrawer";
import {
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  Filter,
  Check,
  Tag,
  ArrowUpDown,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/currency";

interface CollectionsClientProps {
  store: Store;
  products: Product[];
  categories: StoreCategory[];
  currentCategorySlug?: string;
  template: Template | null;
  storeSlug: string;
}

export function CollectionsClient({
  store,
  products,
  categories,
  currentCategorySlug,
  storeSlug,
}: CollectionsClientProps) {
  const { addItem, setCartOpen, totalQuantity } = useCart();
  const themeId = store.themeId || "minimal-stone";
  const tokens = resolveColorTokens(themeId);
  const primaryColor = store.branding?.primaryColor || tokens.primary;

  const [selectedCategory, setSelectedCategory] = useState<string>(
    currentCategorySlug || "all"
  );
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock">("all");
  const [priceMax, setPriceMax] = useState<number>(1000);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  // Compute highest price in catalog
  const highestPrice = useMemo(() => {
    return products.reduce((max, p) => (p.price > max ? p.price : max), 100);
  }, [products]);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== "all") {
          const cat = categories.find((c) => c.slug === selectedCategory);
          const catName = cat?.name || selectedCategory;
          if (p.category.toLowerCase() !== catName.toLowerCase()) return false;
        }
        // Stock filter
        if (stockFilter === "in-stock" && p.stockStatus === "Out of Stock") return false;
        // Price filter
        if (p.price > priceMax) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0; // featured (original order)
      });
  }, [products, categories, selectedCategory, stockFilter, priceMax, sortBy]);

  const handleQuickAdd = (productId: string) => {
    addItem(productId, 1);
    setAddedItems((prev) => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setAddedItems((prev) => ({ ...prev, [productId]: false }));
    }, 1500);
  };

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tokens.background, color: tokens.text }}
    >
      {/* Sticky Header */}
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
              <span className="font-medium" style={{ color: tokens.text }}>
                {activeCategoryObj ? activeCategoryObj.name : "All Collections"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Hero Banner for Collection */}
      <div
        className="py-12 px-4 sm:px-6 lg:px-8 border-b"
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: tokens.border,
        }}
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: tokens.textMuted }}>
            Curated Catalog
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: tokens.text }}>
            {activeCategoryObj ? activeCategoryObj.name : "All Collections"}
          </h1>
          <p className="text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: tokens.textMuted }}>
            {activeCategoryObj?.description ||
              `Explore the full product collection from ${store.name}. Filter by price, category, and availability.`}
          </p>
        </div>
      </div>

      {/* Main Body with Sidebar Filters and Product Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar (1 col) */}
          <aside className="space-y-6">
            <div
              className="p-5 rounded-2xl border space-y-6"
              style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: tokens.border }}>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" style={{ color: primaryColor }} />
                  <span className="font-bold text-xs" style={{ color: tokens.text }}>
                    Filter Catalog
                  </span>
                </div>
                {(selectedCategory !== "all" || stockFilter !== "all" || priceMax < highestPrice) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setStockFilter("all");
                      setPriceMax(highestPrice);
                    }}
                    className="text-[10px] font-semibold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: tokens.textMuted }}>
                  Categories
                </label>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                      selectedCategory === "all"
                        ? "text-white"
                        : "hover:bg-stone-100 text-stone-700"
                    )}
                    style={{
                      backgroundColor: selectedCategory === "all" ? primaryColor : undefined,
                    }}
                  >
                    <span>All Products</span>
                    <span className="text-[10px] opacity-75">{products.length}</span>
                  </button>
                  {categories.map((cat) => {
                    const count = products.filter(
                      (p) => p.category.toLowerCase() === cat.name.toLowerCase()
                    ).length;
                    const isSelected = selectedCategory === cat.slug;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.slug || cat.name.toLowerCase().replace(/\s+/g, "-"))}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                          isSelected ? "text-white" : "hover:bg-stone-100 text-stone-700"
                        )}
                        style={{
                          backgroundColor: isSelected ? primaryColor : undefined,
                        }}
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] opacity-75">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability Filter */}
              <div className="pt-4 border-t" style={{ borderColor: tokens.border }}>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: tokens.textMuted }}>
                  Availability
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      checked={stockFilter === "all"}
                      onChange={() => setStockFilter("all")}
                      className="accent-[#176B4D]"
                    />
                    <span>All Items</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      checked={stockFilter === "in-stock"}
                      onChange={() => setStockFilter("in-stock")}
                      className="accent-[#176B4D]"
                    />
                    <span>In Stock Only</span>
                  </label>
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="pt-4 border-t" style={{ borderColor: tokens.border }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <label className="font-bold text-[11px] uppercase tracking-wider" style={{ color: tokens.textMuted }}>
                    Max Price
                  </label>
                  <span className="font-bold" style={{ color: tokens.text }}>
                    ${priceMax.toFixed(0)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max={Math.ceil(highestPrice)}
                  step="10"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-full accent-[#176B4D] cursor-pointer"
                />
              </div>
            </div>
          </aside>

          {/* Product Grid Column (3 cols) */}
          <section className="lg:col-span-3 space-y-6">
            {/* Top Toolbar: Result count & Sort */}
            <div
              className="p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <span style={{ color: tokens.textMuted }}>
                Showing <strong style={{ color: tokens.text }}>{filteredProducts.length}</strong> of{" "}
                <strong>{products.length}</strong> products
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <ArrowUpDown className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                <span className="text-[11px] text-stone-500 shrink-0">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "featured" | "price-asc" | "price-desc" | "name")}
                  className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-white focus:outline-hidden focus:border-[#176B4D] cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Alphabetical</option>
                </select>
              </div>
            </div>

            {/* Grid or Empty State */}
            {filteredProducts.length === 0 ? (
              <div
                className="text-center py-20 rounded-2xl border space-y-3"
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <Tag className="h-10 w-10 mx-auto text-stone-300" />
                <h3 className="font-bold text-sm" style={{ color: tokens.text }}>
                  No products match your filters
                </h3>
                <p className="text-xs max-w-sm mx-auto" style={{ color: tokens.textMuted }}>
                  Try resetting your price range or selecting another category to view available items.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setStockFilter("all");
                    setPriceMax(highestPrice);
                  }}
                  className="mt-2 px-4 py-2 bg-[#18231E] hover:bg-[#2C3B34] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((p) => {
                  const isAdded = !!addedItems[p.id];
                  const discount =
                    p.compareAtPrice && p.compareAtPrice > p.price
                      ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
                      : null;

                  return (
                    <div
                      key={p.id}
                      className="group rounded-2xl border overflow-hidden transition-all hover:shadow-lg flex flex-col justify-between"
                      style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
                    >
                      <div>
                        {/* Image stage */}
                        <Link
                          href={`/store/${storeSlug}/products/${p.id}`}
                          className="block relative aspect-square bg-stone-100 overflow-hidden"
                        >
                          {p.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-stone-400">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          {discount && (
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                              Save {discount}%
                            </span>
                          )}

                          {p.stockStatus === "Out of Stock" && (
                            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900/80 text-white backdrop-blur-xs">
                              Sold Out
                            </span>
                          )}
                        </Link>

                        {/* Product Info */}
                        <div className="p-3.5 space-y-1">
                          <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: tokens.textMuted }}>
                            {p.category}
                          </p>
                          <Link
                            href={`/store/${storeSlug}/products/${p.id}`}
                            className="block font-bold text-xs truncate hover:underline"
                            style={{ color: tokens.text }}
                          >
                            {p.name}
                          </Link>
                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="font-extrabold text-sm" style={{ color: tokens.text }}>
                              {formatINR(p.price)}
                            </span>
                            {p.compareAtPrice && p.compareAtPrice > p.price && (
                              <span className="text-[11px] line-through text-stone-400">
                                {formatINR(p.compareAtPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Add Button */}
                      <div className="p-3.5 pt-0">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(p.id)}
                          disabled={p.stockStatus === "Out of Stock"}
                          className={cn(
                            "w-full py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-white",
                            p.stockStatus === "Out of Stock"
                              ? "opacity-50 cursor-not-allowed bg-stone-400"
                              : isAdded
                              ? "bg-emerald-600"
                              : ""
                          )}
                          style={{
                            backgroundColor: isAdded
                              ? "#059669"
                              : p.stockStatus === "Out of Stock"
                              ? undefined
                              : primaryColor,
                          }}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-3.5 w-3.5" />
                              <span>Quick Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Shopping Bag Drawer */}
      <StorefrontCartDrawer
        products={products}
        tokens={tokens}
        primaryColor={primaryColor}
        storeName={store.name}
      />
    </div>
  );
}
