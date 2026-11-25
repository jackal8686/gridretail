import { Template } from "@/types";
import { DESIGN_TEMPLATES } from "@/constants/design-templates";
import { COLOR_THEMES } from "@/constants/themes";

export const MOCK_DESIGN_TEMPLATES = DESIGN_TEMPLATES;
export const MOCK_THEMES = COLOR_THEMES;

/**
 * Unified template registry providing both new design templates
 * and legacy templates for seamless backward compatibility.
 */
export const MOCK_TEMPLATES: Template[] = [
  {
    id: "tpl_nordic_clean",
    name: "Nordic Clean",
    description: "Serene, whitespace-driven layout tailored for contemporary Scandinavian home wares, ceramics, and architectural furniture.",
    industry: "Home & Living",
    style: "Clean Nordic",
    featured: true,
    colorPalette: {
      primary: "#2C3E35",
      secondary: "#EAE6DF",
      accent: "#B88E72",
    },
    layoutType: "Grid",
    compatibleIndustries: ["Home & Living", "Beauty & Cosmetics", "Luxury Goods"],
    thumbnailGradient: "from-stone-100 via-amber-50 to-emerald-50",
  },
  {
    id: "tpl_tech_monolith",
    name: "Tech Monolith",
    description: "Engineered dark-mode experience featuring crisp micro-interactions, spec comparisons, and metallic accents for electronics.",
    industry: "Electronics & Gadgets",
    style: "High-Tech Dark",
    featured: true,
    colorPalette: {
      primary: "#0F172A",
      secondary: "#1E293B",
      accent: "#06B6D4",
    },
    layoutType: "Split",
    compatibleIndustries: ["Electronics & Gadgets", "Sports & Outdoors"],
    thumbnailGradient: "from-slate-900 via-slate-800 to-cyan-950",
  },
  {
    id: "tpl_editorial_minimal",
    name: "Editorial Minimal",
    description: "High-fashion lookbook aesthetic inspired by European periodicals, dramatic typography, and staggered image galleries.",
    industry: "Fashion & Apparel",
    style: "Editorial & Minimal",
    featured: true,
    colorPalette: {
      primary: "#18181B",
      secondary: "#F4F4F5",
      accent: "#A1A1AA",
    },
    layoutType: "Editorial",
    compatibleIndustries: ["Fashion & Apparel", "Luxury Goods", "Jewelry"],
    thumbnailGradient: "from-zinc-100 via-stone-50 to-neutral-200",
  },
  {
    id: "tpl_warm_organic",
    name: "Warm Organic",
    description: "Earthy, wholesome layout emphasizing sustainability credentials, ingredient spotlights, and botanical photography.",
    industry: "Beauty & Cosmetics",
    style: "Warm Organic",
    featured: false,
    colorPalette: {
      primary: "#3D4035",
      secondary: "#F2EFE9",
      accent: "#8B9D83",
    },
    layoutType: "Grid",
    compatibleIndustries: ["Beauty & Cosmetics", "Food & Gourmet", "Health & Wellness"],
    thumbnailGradient: "from-stone-100 via-amber-50 to-emerald-100",
  },
  {
    id: "tpl_classic_boutique",
    name: "Classic Boutique",
    description: "Timeless serif typography, refined gold detailing, and heritage story modules designed for specialty food and wine artisans.",
    industry: "Food & Gourmet",
    style: "Classic Boutique",
    featured: false,
    colorPalette: {
      primary: "#451A03",
      secondary: "#FEF3C7",
      accent: "#D97706",
    },
    layoutType: "Showcase",
    compatibleIndustries: ["Food & Gourmet", "Luxury Goods", "Hospitality"],
    thumbnailGradient: "from-amber-50 via-orange-50 to-amber-100",
  },
  {
    id: "tpl_bold_grid",
    name: "Bold Grid",
    description: "High-energy isometric masonry layout with vibrant badges, dynamic filters, and high-impact hero sections for sports gear.",
    industry: "Sports & Outdoors",
    style: "Bold Grid",
    featured: false,
    colorPalette: {
      primary: "#111827",
      secondary: "#F3F4F6",
      accent: "#EF4444",
    },
    layoutType: "Grid",
    compatibleIndustries: ["Sports & Outdoors", "Streetwear", "Fitness"],
    thumbnailGradient: "from-neutral-900 via-zinc-800 to-red-950",
  },
  {
    id: "tpl_vibrant_modern",
    name: "Vibrant Modern",
    description: "Playful neo-brutalist accents, rounded pill badges, and cheerful colorways optimized for direct-to-consumer lifestyle brands.",
    industry: "Health & Wellness",
    style: "Vibrant Modern",
    featured: false,
    colorPalette: {
      primary: "#4F46E5",
      secondary: "#EEF2FF",
      accent: "#EC4899",
    },
    layoutType: "Showcase",
    compatibleIndustries: ["Health & Wellness", "Kids & Toys", "Stationery"],
    thumbnailGradient: "from-indigo-50 via-purple-50 to-pink-50",
  },
  {
    id: "tpl_luxury_haute",
    name: "Luxury Haute",
    description: "Unapologetically opulent dark aesthetic with champagne gold foil styling, generous padding, and cinematic hero video spaces.",
    industry: "Luxury Goods",
    style: "Luxury Haute",
    featured: false,
    colorPalette: {
      primary: "#0A0A0A",
      secondary: "#262626",
      accent: "#CA8A04",
    },
    layoutType: "Editorial",
    compatibleIndustries: ["Luxury Goods", "Watches & Fine Jewelry", "Automotive"],
    thumbnailGradient: "from-black via-zinc-900 to-yellow-950",
  },
];
