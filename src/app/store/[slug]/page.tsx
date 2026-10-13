import React from "react";
import { notFound } from "next/navigation";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { Product } from "@/types";
import { cn } from "@/utils/cn";
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Truck,
  RotateCcw,
} from "lucide-react";

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    notFound();
  }

  // Load template metadata
  const template = await TemplateRepository.findById(store.templateId);

  // Load configured products or fallback to industry products
  let products: Product[] = [];
  if (store.selectedProductIds && store.selectedProductIds.length > 0) {
    products = await ProductRepository.findByIds(store.selectedProductIds);
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll({ category: store.industry });
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll();
  }

  const branding = store.branding || {
    primaryColor: template?.colorPalette.primary || "#176B4D",
    secondaryColor: template?.colorPalette.secondary || "#FAF9F6",
    fontFamily: "Inter, sans-serif",
    heroHeadline: `Welcome to ${store.name}`,
    heroSubheadline: `Curated ${store.industry} collection designed for modern living.`,
  };

  const enabledSections = store.enabledSections || [
    "hero",
    "featured_products",
    "about",
    "newsletter",
    "footer",
  ];

  // Specific visual styling based on template style
  const isDarkTemplate =
    template?.style === "High-Tech Dark" ||
    template?.style === "Luxury Haute" ||
    template?.style === "Bold Grid";

  return (
    <div
      className="min-h-screen flex flex-col transition-colors selection:bg-black/10"
      style={{
        fontFamily: branding.fontFamily,
        backgroundColor: isDarkTemplate ? "#0F172A" : branding.secondaryColor || "#FAF9F6",
        color: isDarkTemplate ? "#F8FAFC" : "#18231E",
      }}
    >
      {/* Demo Storefront Banner */}
      <div
        className="py-1.5 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2 border-b"
        style={{
          backgroundColor: isDarkTemplate ? "#1E293B" : "#F0F4F1",
          borderColor: isDarkTemplate ? "#334155" : "#E4E9E5",
          color: isDarkTemplate ? "#94A3B8" : "#4F5D56",
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>
          <strong>GridRetail Live Demo Storefront</strong> — Pitch Simulation for {store.clientName}
        </span>
      </div>

      {/* Storefront Header */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md px-6 py-4 flex items-center justify-between"
        style={{
          backgroundColor: isDarkTemplate ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
          borderColor: isDarkTemplate ? "#1E293B" : "#E4E9E5",
        }}
      >
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tight" style={{ color: branding.primaryColor }}>
            {store.name}
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium opacity-80">
            <span className="hover:opacity-100 cursor-pointer">Catalog</span>
            <span className="hover:opacity-100 cursor-pointer">Collections</span>
            <span className="hover:opacity-100 cursor-pointer">Our Story</span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-transform hover:scale-105"
            style={{
              borderColor: branding.primaryColor,
              color: isDarkTemplate ? "#FFFFFF" : branding.primaryColor,
            }}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Bag (0)</span>
          </button>
        </div>
      </header>

      {/* Storefront Main Content */}
      <main className="flex-1">
        {/* HERO SECTION */}
        {enabledSections.includes("hero") && (
          <section
            className="py-16 md:py-24 px-6 max-w-6xl mx-auto text-center space-y-6 animate-in fade-in"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border"
              style={{
                borderColor: branding.primaryColor,
                color: branding.primaryColor,
                backgroundColor: isDarkTemplate ? "rgba(255,255,255,0.05)" : "rgba(23,107,77,0.08)",
              }}
            >
              <span>{store.industry}</span>
              <span>•</span>
              <span>{template?.style || "Contemporary"}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
              {branding.heroHeadline || `Welcome to ${store.name}`}
            </h1>

            <p className="text-base sm:text-lg max-w-2xl mx-auto opacity-75 font-normal leading-relaxed">
              {branding.heroSubheadline ||
                `Explore our bespoke collection designed specifically for ${store.clientName}.`}
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="px-6 py-3 rounded-lg text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg flex items-center gap-2"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <span>Explore Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* VALUE PROPOSITIONS BAR */}
        <section
          className="border-y py-6 px-6"
          style={{
            borderColor: isDarkTemplate ? "#1E293B" : "#E4E9E5",
            backgroundColor: isDarkTemplate ? "#090D16" : "#FFFFFF",
          }}
        >
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left text-xs">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Truck className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold">Complimentary Courier Delivery</p>
                <p className="opacity-70">On all domestic retail orders</p>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold">Verified Authenticity Guarantee</p>
                <p className="opacity-70">Direct provenance from artisans</p>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <RotateCcw className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold">30-Day Effortless Returns</p>
                <p className="opacity-70">Full satisfaction assurance</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS GRID */}
        {enabledSections.includes("featured_products") && (
          <section className="py-16 px-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-3 border-b pb-4"
              style={{ borderColor: isDarkTemplate ? "#1E293B" : "#E4E9E5" }}
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  Featured Demonstration Catalog
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                  Selected Pieces ({products.length})
                </h2>
              </div>
              <span className="text-xs opacity-75 font-medium">
                Live interactive pitch items
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-xl border overflow-hidden flex flex-col justify-between group transition-all hover:shadow-lg"
                  style={{
                    backgroundColor: isDarkTemplate ? "#1E293B" : "#FFFFFF",
                    borderColor: isDarkTemplate ? "#334155" : "#E4E9E5",
                  }}
                >
                  <div
                    className={cn(
                      "h-48 flex items-center justify-center text-xl font-bold tracking-wider relative overflow-hidden transition-transform group-hover:scale-102",
                      prod.thumbnailColor
                    )}
                  >
                    <span>{prod.name.slice(0, 2).toUpperCase()}</span>
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-stone-800 shadow-2xs">
                      {prod.category}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-base line-clamp-1">{prod.name}</h3>
                      <p className="text-xs opacity-70 mt-1 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between"
                      style={{ borderColor: isDarkTemplate ? "#334155" : "#F0F4F1" }}
                    >
                      <div>
                        <span className="text-xs opacity-60">Price</span>
                        <p className="text-base font-bold">
                          ${prod.price.toFixed(2)}{" "}
                          <span className="text-[10px] opacity-70 font-normal">{prod.currency}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        Quick Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* BRAND STORY / ABOUT */}
        {enabledSections.includes("about") && (
          <section
            className="py-16 px-6 border-t"
            style={{
              borderColor: isDarkTemplate ? "#1E293B" : "#E4E9E5",
              backgroundColor: isDarkTemplate ? "#0B1120" : "#FFFFFF",
            }}
          >
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                About {store.name}
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                Designed for {store.clientName}
              </h2>
              <p className="text-sm sm:text-base opacity-75 leading-relaxed max-w-2xl mx-auto">
                {store.description ||
                  `Every element of this demonstration has been tailored to reflect ${store.clientName}'s distinctive brand heritage, modern e-commerce requirements, and audience expectations.`}
              </p>
            </div>
          </section>
        )}

        {/* NEWSLETTER */}
        {enabledSections.includes("newsletter") && (
          <section className="py-16 px-6 max-w-xl mx-auto text-center space-y-4">
            <h3 className="text-2xl font-bold tracking-tight">Stay in Touch</h3>
            <p className="text-xs opacity-75">
              Subscribe to receive exclusive collection updates and private showroom previews.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter client email address"
                className="w-full rounded-lg border px-3.5 py-2 text-xs bg-white text-stone-900 focus:outline-hidden"
                style={{ borderColor: "#E4E9E5" }}
              />
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
                style={{ backgroundColor: branding.primaryColor }}
              >
                Subscribe
              </button>
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      {enabledSections.includes("footer") && (
        <footer
          className="border-t py-8 px-6 text-xs opacity-75"
          style={{
            borderColor: isDarkTemplate ? "#1E293B" : "#E4E9E5",
            backgroundColor: isDarkTemplate ? "#090D16" : "#FAF9F6",
          }}
        >
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="font-bold">{store.name}</span> — Tailored Storefront Demo for {store.clientName}
            </div>
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <span className="font-semibold text-emerald-600">GridRetail Generation Engine</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
