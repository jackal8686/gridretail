"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Store,
  LayoutTemplate,
  Compass,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";

export interface SpotlightItem {
  id: string;
  title: string;
  description: string;
  category: "Destinations" | "Stores" | "Templates" | "Sections";
  href: string;
  badge?: string;
  badgeColor?: string;
}

const STATIC_DESTINATIONS: SpotlightItem[] = [
  {
    id: "dest-create",
    title: "Create New Store",
    description: "Launch the store generation wizard",
    category: "Destinations",
    href: "/stores/new",
    badge: "Action",
    badgeColor: "bg-[#E2F5E9] text-[#176B4D]",
  },
  {
    id: "dest-stores",
    title: "Store Management",
    description: "View and manage all generated client websites",
    category: "Destinations",
    href: "/stores",
  },
  {
    id: "dest-dashboard",
    title: "Dashboard Overview",
    description: "Key performance indicators and platform overview",
    category: "Destinations",
    href: "/dashboard",
  },
  {
    id: "dest-templates",
    title: "Design Templates Catalog",
    description: "Browse themes and storefront design layouts",
    category: "Destinations",
    href: "/templates",
  },
  {
    id: "dest-analytics",
    title: "Analytics & Telemetry",
    description: "Visitor conversion and generation telemetry",
    category: "Destinations",
    href: "/analytics",
  },
  {
    id: "dest-settings",
    title: "Workspace Settings",
    description: "Configure workspace parameters and team settings",
    category: "Destinations",
    href: "/settings",
  },
  {
    id: "dest-clients",
    title: "Client Dossiers",
    description: "Manage client accounts and industry profiles",
    category: "Destinations",
    href: "/clients",
  },
  {
    id: "dest-products",
    title: "Master Product Catalog",
    description: "View global SKUs and product inventories",
    category: "Destinations",
    href: "/products",
  },
];

const STATIC_TEMPLATES: SpotlightItem[] = [
  {
    id: "tpl-warm-organic",
    title: "Warm Organic",
    description: "E-Commerce template with earthy tones and gentle curves",
    category: "Templates",
    href: "/templates",
    badge: "E-Commerce",
    badgeColor: "bg-[#EBF3EF] text-[#176B4D]",
  },
  {
    id: "tpl-bold-electric",
    title: "Bold Electric",
    description: "High-contrast dynamic layout for technology and audio",
    category: "Templates",
    href: "/templates",
    badge: "E-Commerce",
    badgeColor: "bg-[#EBF3EF] text-[#176B4D]",
  },
  {
    id: "tpl-crisp-clean",
    title: "Crisp Clean",
    description: "Minimalist Scandinavian design with refined typography",
    category: "Templates",
    href: "/templates",
    badge: "E-Commerce",
    badgeColor: "bg-[#EBF3EF] text-[#176B4D]",
  },
  {
    id: "tpl-modern-editorial",
    title: "Modern Editorial",
    description: "High-fashion typographic layout with asymmetrical balance",
    category: "Templates",
    href: "/templates",
    badge: "E-Commerce",
    badgeColor: "bg-[#EBF3EF] text-[#176B4D]",
  },
  {
    id: "tpl-professional-advisory",
    title: "Professional Advisory",
    description: "Purpose-built template for legal and consultancies with booking calendar",
    category: "Templates",
    href: "/templates",
    badge: "Appointments",
    badgeColor: "bg-[#EBF0F5] text-[#2D6A9F]",
  },
  {
    id: "tpl-enterprise-growth",
    title: "Enterprise Advisory",
    description: "Lead generation template with consultation and quote capture",
    category: "Templates",
    href: "/templates",
    badge: "Lead Gen",
    badgeColor: "bg-[#F3EBF5] text-[#7B3F9E]",
  },
];

const STATIC_SECTIONS: SpotlightItem[] = [
  {
    id: "sec-hero",
    title: "Modular Hero Section",
    description: "High-impact visual hero banner with custom headline and CTA buttons",
    category: "Sections",
    href: "/templates",
    badge: "All Types",
  },
  {
    id: "sec-products",
    title: "Featured Product Showcase",
    description: "Interactive SKU carousel and responsive catalog grid with currency formatting",
    category: "Sections",
    href: "/templates",
    badge: "E-Commerce",
  },
  {
    id: "sec-services",
    title: "Service Menu & Consultation Grid",
    description: "Service cards with pricing, duration, and direct appointment booking",
    category: "Sections",
    href: "/templates",
    badge: "Appointments",
  },
  {
    id: "sec-lead-form",
    title: "Lead Capture Form",
    description: "Multi-field business inquiry and consultation request capture",
    category: "Sections",
    href: "/templates",
    badge: "Lead Gen",
  },
  {
    id: "sec-testimonials",
    title: "Social Proof & Testimonials",
    description: "Client endorsements with ratings and author credentials",
    category: "Sections",
    href: "/templates",
    badge: "All Types",
  },
  {
    id: "sec-faq",
    title: "Frequently Asked Questions",
    description: "Interactive accordion answering common prospect questions",
    category: "Sections",
    href: "/templates",
    badge: "All Types",
  },
];

interface GlobalSpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSpotlightModal({ isOpen, onClose }: GlobalSpotlightModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [stores, setStores] = useState<SpotlightItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch real stores from API on mount
  useEffect(() => {
    let active = true;
    async function loadStores() {
      try {
        const res = await fetch("/api/stores");
        if (!res.ok) return;
        const json = await res.json();
        const storeList = Array.isArray(json) ? json : (json?.stores || []);
        if (active && Array.isArray(storeList) && storeList.length > 0) {
          const mapped: SpotlightItem[] = storeList.map((s: {
            id: string;
            name: string;
            industry?: string;
            websiteType?: string;
            slug?: string;
            clientName?: string;
            templateId?: string;
          }) => {
            const typeLabel =
              s.websiteType === "appointments"
                ? "Appointments"
                : s.websiteType === "lead_gen"
                ? "Lead Gen"
                : "E-Commerce";
            const badgeColor =
              s.websiteType === "appointments"
                ? "bg-[#EBF0F5] text-[#2D6A9F]"
                : s.websiteType === "lead_gen"
                ? "bg-[#F3EBF5] text-[#7B3F9E]"
                : "bg-[#EBF3EF] text-[#176B4D]";

            const extraDetails = [
              s.industry || "Retail",
              `/store/${s.slug || s.id}`,
              s.clientName ? `Client: ${s.clientName}` : null,
              s.templateId ? `Template: ${s.templateId}` : null,
            ].filter(Boolean).join(" • ");

            return {
              id: `store-${s.id}`,
              title: s.name,
              description: extraDetails,
              category: "Stores" as const,
              href: `/stores/${s.id}`,
              badge: typeLabel,
              badgeColor,
            };
          });
          setStores(mapped);
        }
      } catch {
        // Fallback to static stores if API is unreachable
        setStores([
          {
            id: "store-str_01",
            title: "Aura Minimalist Living",
            description: "Home & Decor • E-Commerce Storefront",
            category: "Stores",
            href: "/stores/str_01",
            badge: "E-Commerce",
            badgeColor: "bg-[#EBF3EF] text-[#176B4D]",
          },
          {
            id: "store-str_02",
            title: "Volt Audio Dynamics",
            description: "Consumer Electronics • High-Performance Audio",
            category: "Stores",
            href: "/stores/str_02",
            badge: "E-Commerce",
            badgeColor: "bg-[#EBF3EF] text-[#176B4D]",
          },
          {
            id: "store-str_03",
            title: "Botanica Apothecary",
            description: "Health & Beauty • Organic Skincare",
            category: "Stores",
            href: "/stores/str_03",
            badge: "E-Commerce",
            badgeColor: "bg-[#EBF3EF] text-[#176B4D]",
          },
          {
            id: "store-str_07",
            title: "Summit Legal Practice",
            description: "Legal & Consulting • Appointment Scheduling",
            category: "Stores",
            href: "/stores/str_07",
            badge: "Appointments",
            badgeColor: "bg-[#EBF0F5] text-[#2D6A9F]",
          },
          {
            id: "store-str_08",
            title: "Apex Growth Advisory",
            description: "Management Consulting • Lead Generation",
            category: "Stores",
            href: "/stores/str_08",
            badge: "Lead Gen",
            badgeColor: "bg-[#F3EBF5] text-[#7B3F9E]",
          },
        ]);
      }
    }
    loadStores();
    return () => {
      active = false;
    };
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...STATIC_DESTINATIONS, ...stores, ...STATIC_TEMPLATES, ...STATIC_SECTIONS];
    if (!q) {
      // Default view: popular destinations and recent stores
      return [
        ...STATIC_DESTINATIONS.slice(0, 4),
        ...stores.slice(0, 3),
        ...STATIC_TEMPLATES.slice(0, 2),
      ];
    }
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    );
  }, [query, stores]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside spotlight
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        onClose();
        router.push(current.href);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item: SpotlightItem) => {
    onClose();
    router.push(item.href);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E4E9E5] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[#E4E9E5] bg-white">
          <Search className="h-5 w-5 text-[#66736C] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stores, templates, sections, destinations (or type Esc to close)..."
            className="w-full text-sm text-[#18231E] placeholder-[#909D96] bg-transparent focus:outline-hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-[#909D96] hover:text-[#18231E]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-[10px] bg-[#FAF9F6] border border-[#E4E9E5] px-1.5 py-0.5 rounded text-[#66736C] font-mono">
              ESC
            </span>
          )}
        </div>

        {/* Quick Filter Badges when query is empty */}
        {!query && (
          <div className="px-4 py-2 border-b border-[#F0F4F1] bg-[#FAF9F6] flex items-center gap-2 text-xs text-[#66736C] overflow-x-auto">
            <span className="text-[11px] font-semibold text-[#909D96] uppercase tracking-wider">Quick:</span>
            <button
              type="button"
              onClick={() => setQuery("store")}
              className="px-2 py-0.5 rounded-md bg-white border border-[#E4E9E5] text-[11px] hover:border-[#176B4D] hover:text-[#176B4D] transition-colors"
            >
              Stores
            </button>
            <button
              type="button"
              onClick={() => setQuery("template")}
              className="px-2 py-0.5 rounded-md bg-white border border-[#E4E9E5] text-[11px] hover:border-[#176B4D] hover:text-[#176B4D] transition-colors"
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setQuery("section")}
              className="px-2 py-0.5 rounded-md bg-white border border-[#E4E9E5] text-[11px] hover:border-[#176B4D] hover:text-[#176B4D] transition-colors"
            >
              Sections
            </button>
            <button
              type="button"
              onClick={() => setQuery("analytics")}
              className="px-2 py-0.5 rounded-md bg-white border border-[#E4E9E5] text-[11px] hover:border-[#176B4D] hover:text-[#176B4D] transition-colors"
            >
              Analytics
            </button>
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#66736C]">
              <Search className="h-8 w-8 text-[#CCD5CE] mx-auto mb-2" />
              <p className="font-medium text-[#18231E]">No matching results found</p>
              <p className="mt-1">Try searching for a store name, template title, or page destination.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon =
                item.category === "Stores"
                  ? Store
                  : item.category === "Templates"
                  ? LayoutTemplate
                  : item.category === "Sections"
                  ? Layers
                  : Compass;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#176B4D]/10 text-[#176B4D]"
                      : "hover:bg-[#FAF9F6] text-[#18231E]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[#176B4D] text-white"
                          : "bg-[#F0F4F1] text-[#66736C]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              item.badgeColor || "bg-[#F0F4F1] text-[#66736C]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#66736C] truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] text-[#909D96] hidden sm:inline">
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`h-3.5 w-3.5 ${
                        isSelected ? "text-[#176B4D]" : "text-[#CCD5CE]"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div className="px-4 py-2.5 bg-[#FAF9F6] border-t border-[#E4E9E5] text-[11px] text-[#66736C] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-[#E4E9E5] rounded text-[10px] font-mono">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-[#E4E9E5] rounded text-[10px] font-mono">
                ↵
              </kbd>{" "}
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-[#E4E9E5] rounded text-[10px] font-mono">
                esc
              </kbd>{" "}
              Close
            </span>
          </div>
          <span className="font-medium text-[#176B4D]">GridRetail Spotlight</span>
        </div>
      </div>
    </div>
  );
}
