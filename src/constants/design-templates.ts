import { DesignTemplate } from "@/types";

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "tmpl_modern_minimal",
    name: "Modern Minimal",
    slug: "modern-minimal",
    tagline: "Expansive whitespace, floating navigation, and understated elegance",
    description: "An airy, distraction-free architecture characterized by generous negative space, a lightweight floating header, clean sans-serif typography, and subtle bottom-aligned product metadata. Products take center stage with quiet confidence.",
    layoutFamily: "Modern Minimal",
    designCharacteristics: [
      "Floating translucent pill header with inline navigation",
      "Asymmetric split-hero with focal product spotlight",
      "Understated borderless cards with quick-hover actions",
      "Minimalist horizontal category filter pills",
    ],
    suitableUseCases: [
      "Scandinavian home design",
      "Contemporary apparel",
      "Architectural ceramics and studio wares",
      "Boutique audio and minimalist everyday carry",
    ],
    compatibleIndustries: ["Home & Living", "Fashion & Apparel", "Beauty & Cosmetics", "Electronics & Gadgets"],
    thumbnailGradient: "from-stone-100 via-zinc-100 to-slate-200",
    featured: true,
    headerLayout: "floating-minimal",
    heroLayout: "split-showcase",
    cardLayout: "understated",
  },
  {
    id: "tmpl_luxury_editorial",
    name: "Luxury Editorial",
    slug: "luxury-editorial",
    tagline: "Refined serif typography, cinematic framing, and tall lookbook cards",
    description: "Inspired by European couture and high-end atelier showrooms. Features centered brand iconography, cinematic framed hero imagery, tall lookbook aspect ratios (3:4), refined gold hairline dividers, and an artisan provenance story module.",
    layoutFamily: "Luxury Editorial",
    designCharacteristics: [
      "Centered heritage monogram header with dual flanking nav",
      "Cinematic framed hero showcase with gold foil accents",
      "Tall lookbook product cards (3:4 ratio) with refined price reveals",
      "Artisan provenance statement and craftsmanship guarantee",
    ],
    suitableUseCases: [
      "Haute horology and fine jewelry",
      "Bespoke tailoring and luxury leather goods",
      "High-end fragrance and private perfume houses",
      "Rare vintage wines and limited-batch gourmet",
    ],
    compatibleIndustries: ["Luxury Goods", "Fashion & Apparel", "Food & Gourmet", "Beauty & Cosmetics"],
    thumbnailGradient: "from-zinc-900 via-neutral-900 to-amber-950",
    featured: true,
    headerLayout: "centered-luxury",
    heroLayout: "cinematic-framed",
    cardLayout: "tall-editorial",
  },
  {
    id: "tmpl_bold_vibrant",
    name: "Bold & Vibrant",
    slug: "bold-vibrant",
    tagline: "Solid-bordered blocks, assertive drop shadows, and high-impact promo ribbons",
    description: "A high-conversion commercial design with solid-bordered structural blocks, ticker ribbons, bold drop shadows, and high-energy discount callouts. Built to maximize urgency and impulse engagement.",
    layoutFamily: "Bold & Vibrant",
    designCharacteristics: [
      "High-impact promotional ticker announcement banner",
      "Solid-bordered cards with tactile offset drop shadows",
      "Vibrant high-contrast discount badges and urgency indicators",
      "Full-width assertive newsletter CTA banner",
    ],
    suitableUseCases: [
      "Performance sportswear and outdoor equipment",
      "Streetwear and limited-edition sneakers",
      "Energy drinks and fitness nutrition",
      "Gaming peripherals and creator gear",
    ],
    compatibleIndustries: ["Sports & Outdoors", "Electronics & Gadgets", "Health & Wellness"],
    thumbnailGradient: "from-red-900 via-zinc-900 to-stone-900",
    featured: true,
    headerLayout: "bold-announcement",
    heroLayout: "high-impact-blocks",
    cardLayout: "block-solid",
  },
  {
    id: "tmpl_classic_commerce",
    name: "Classic Commerce",
    slug: "classic-commerce",
    tagline: "Customer-trusted retail hierarchy with utility bars and dense product grids",
    description: "A familiar, conversion-tested multi-tier layout offering maximum catalog clarity. Features a top utility bar with shipping and currency, a dedicated category navigation bar, structured 4-column product grids with star reviews and stock meters, and comprehensive multi-column footers.",
    layoutFamily: "Classic Commerce",
    designCharacteristics: [
      "Multi-tiered utility header with phone, help, and cart shortcuts",
      "Full-width secondary category navigation bar",
      "Structured 4-column catalog grid with ratings and stock meters",
      "Comprehensive multi-column footer with security trust badges",
    ],
    suitableUseCases: [
      "Multi-category department stores and home goods",
      "Specialty gourmet grocery and artisanal providores",
      "Electronics superstores and appliance retailers",
      "Established brand catalogs with deep inventory",
    ],
    compatibleIndustries: ["Food & Gourmet", "Electronics & Gadgets", "Home & Living", "Health & Wellness"],
    thumbnailGradient: "from-amber-100 via-stone-100 to-emerald-100",
    featured: true,
    headerLayout: "multi-tier-utility",
    heroLayout: "commercial-banner",
    cardLayout: "classic-rating",
  },
  {
    id: "tmpl_editorial_magazine",
    name: "Editorial Magazine",
    slug: "editorial-magazine",
    tagline: "Narrative-driven layout, cover story hero, and curated collection spotlights",
    description: "Merges cultural journalism with commercial curation. Incorporates magazine-style headline columns, editorial excerpt cards, alternating image-and-narrative collection spotlights, and storytelling product modules.",
    layoutFamily: "Editorial Magazine",
    designCharacteristics: [
      "Editorial newspaper-style masthead with issue/date markers",
      "Hero cover story with oversized typography and side dispatch column",
      "Alternating collection story spotlight panels",
      "Curator pick badges and artisan interview notes",
    ],
    suitableUseCases: [
      "Independent fashion journals and curated pop-ups",
      "Art print galleries and publishing houses",
      "Specialty coffee roasters with farmer origin stories",
      "Designer furniture with architectural history",
    ],
    compatibleIndustries: ["Fashion & Apparel", "Home & Living", "Food & Gourmet", "Luxury Goods"],
    thumbnailGradient: "from-neutral-100 via-stone-200 to-zinc-300",
    featured: false,
    headerLayout: "magazine-headline",
    heroLayout: "magazine-story",
    cardLayout: "captioned-story",
  },
  {
    id: "tmpl_organic_natural",
    name: "Organic & Natural",
    slug: "organic-natural",
    tagline: "Soft curved surfaces, warm natural textures, and sustainability credentials",
    description: "Designed for wellness and eco-conscious brands. Features soft rounded corners (rounded-3xl), warm cream paper backdrops, botanical pill badges, spacious product breathing room, and dedicated sustainability credential cards.",
    layoutFamily: "Organic & Natural",
    designCharacteristics: [
      "Curved pill navigation with organic icon accents",
      "Soft asymmetrical hero with organic oval image framing",
      "Smooth pill product cards with gentle ambient shadows",
      "Clean ingredient and sustainability provenance metrics",
    ],
    suitableUseCases: [
      "Organic skincare and botanical apothecary",
      "Sustainable lifestyle and eco-friendly home goods",
      "Cold-pressed wellness tonics and organic teas",
      "Ethical baby and nursery essentials",
    ],
    compatibleIndustries: ["Beauty & Cosmetics", "Health & Wellness", "Food & Gourmet", "Home & Living"],
    thumbnailGradient: "from-emerald-50 via-amber-50 to-stone-100",
    featured: false,
    headerLayout: "organic-soft",
    heroLayout: "organic-flow",
    cardLayout: "soft-rounded",
  },
  {
    id: "tmpl_tech_futuristic",
    name: "Tech & Futuristic",
    slug: "tech-futuristic",
    tagline: "Precision angular grids, telemetry HUD indicators, and technical spec highlights",
    description: "A cybernetic, precision-engineered design system featuring angular edges (rounded-none), monospaced technical telemetry, hardware specification matrices, and high-visibility status LEDs. Engineered for modern tech and high-performance hardware.",
    layoutFamily: "Tech & Futuristic",
    designCharacteristics: [
      "Cybernetic HUD header with status indicators and coordinates",
      "Hardware telemetry hero with interactive spec callouts",
      "Angular grid cards with monospaced component specs and stock LEDs",
      "Technical comparison matrix and engineering highlights",
    ],
    suitableUseCases: [
      "Next-generation consumer electronics and robotics",
      "Smart home hardware and IoT sensors",
      "Technical audio hardware and digital instruments",
      "Aerospace materials and performance outdoor gear",
    ],
    compatibleIndustries: ["Electronics & Gadgets", "Sports & Outdoors"],
    thumbnailGradient: "from-slate-950 via-slate-900 to-cyan-950",
    featured: false,
    headerLayout: "technical-hud",
    heroLayout: "cyber-specs",
    cardLayout: "monospaced-grid",
  },
  {
    id: "tmpl_playful_creative",
    name: "Playful & Creative",
    slug: "playful-creative",
    tagline: "Neo-brutalist charm, energetic tilted stickers, and tactile pill buttons",
    description: "An energetic, cheerful storefront architecture driven by neo-brutalist design, tilted discount sticker badges, vibrant pill buttons, expressive typography, and delightfully tactile micro-interactions that spark joy.",
    layoutFamily: "Playful & Creative",
    designCharacteristics: [
      "Vibrant header with whimsical sticker badge accents",
      "Playful card layout with tilted discount tags and hover bounces",
      "Tactile pill action buttons with smooth scale feedback",
      "Energetic newsletter block with geometric decorative badges",
    ],
    suitableUseCases: [
      "Direct-to-consumer fun lifestyle brands",
      "Modern confectionery and snack foods",
      "Creative stationery and joyful home accessories",
      "Apparel for creative communities and youth culture",
    ],
    compatibleIndustries: ["Health & Wellness", "Food & Gourmet", "Fashion & Apparel"],
    thumbnailGradient: "from-indigo-100 via-pink-100 to-amber-100",
    featured: false,
    headerLayout: "playful-banner",
    heroLayout: "asymmetric-cards",
    cardLayout: "sticker-playful",
  },
];

export const DEFAULT_DESIGN_TEMPLATE = DESIGN_TEMPLATES[0];

export function getDesignTemplateById(id?: string): DesignTemplate {
  if (!id) return DEFAULT_DESIGN_TEMPLATE;
  const match = DESIGN_TEMPLATES.find((t) => t.id === id);
  if (match) return match;

  // Backward compatibility: map legacy template IDs to corresponding design templates
  const legacyMap: Record<string, string> = {
    tpl_nordic_clean: "tmpl_modern_minimal",
    tpl_tech_monolith: "tmpl_tech_futuristic",
    tpl_editorial_minimal: "tmpl_editorial_magazine",
    tpl_warm_organic: "tmpl_organic_natural",
    tpl_classic_boutique: "tmpl_classic_commerce",
    tpl_bold_grid: "tmpl_bold_vibrant",
    tpl_vibrant_modern: "tmpl_playful_creative",
    tpl_luxury_haute: "tmpl_luxury_editorial",
  };

  const mappedId = legacyMap[id];
  if (mappedId) {
    const legacyMatch = DESIGN_TEMPLATES.find((t) => t.id === mappedId);
    if (legacyMatch) return legacyMatch;
  }

  return DEFAULT_DESIGN_TEMPLATE;
}
