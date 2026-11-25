import { SectionDefinition, SectionType, SectionInstance } from "@/types/section";
import { generateSectionId, deepCloneSectionSettings } from "@/lib/sections/id-generator";

export const SECTION_DEFINITIONS: Record<SectionType, SectionDefinition> = {
  // -------------------------------------------------------------
  // HERO & PROMOTIONAL SECTIONS
  // -------------------------------------------------------------
  hero_full_width: {
    type: "hero_full_width",
    category: "hero",
    name: "Full-Width Hero",
    description: "Expansive hero with high-impact background imagery and overlaid headline.",
    icon: "Maximize",
    defaultLayout: "centered",
    availableLayouts: [
      { id: "centered", label: "Centered Text", previewHint: "Balanced middle-aligned typography" },
      { id: "left_aligned", label: "Left Aligned", previewHint: "Left-aligned content with focal space" },
      { id: "bottom_anchor", label: "Bottom Anchored", previewHint: "Content positioned at lower boundary" },
    ],
    defaultSettings: {
      headline: "Curated Living & Architectural Essentials",
      subheadline: "Crafted for timeless spaces and mindful everyday living.",
      ctaText: "Explore Collection",
      ctaUrl: "/collections",
      secondaryCtaText: "Our Story",
      secondaryCtaUrl: "#story",
      backgroundImageUrl: "",
      overlayOpacity: 40,
      minHeight: "large", // small, medium, large, full
    },
    recommendedIndustries: ["Fashion & Apparel", "Home & Living", "Luxury Goods", "Sports & Outdoors"],
    fields: [
      { key: "headline", label: "Headline", type: "text", defaultValue: "Curated Living & Architectural Essentials" },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "Crafted for timeless spaces and mindful everyday living." },
      { key: "ctaText", label: "Primary Button Text", type: "text", defaultValue: "Explore Collection" },
      { key: "ctaUrl", label: "Primary Button URL", type: "url", defaultValue: "/collections" },
      { key: "secondaryCtaText", label: "Secondary Button Text", type: "text", defaultValue: "Our Story" },
      { key: "secondaryCtaUrl", label: "Secondary Button URL", type: "url", defaultValue: "#story" },
      { key: "backgroundImageUrl", label: "Hero Background Image", type: "image" },
      {
        key: "minHeight",
        label: "Height",
        type: "select",
        options: [
          { label: "Medium (500px)", value: "medium" },
          { label: "Large (650px)", value: "large" },
          { label: "Full Viewport (100vh)", value: "full" },
        ],
        defaultValue: "large",
      },
    ],
  },

  hero_split: {
    type: "hero_split",
    category: "hero",
    name: "Split-Screen Hero",
    description: "Side-by-side arrangement pairing editorial typography with visual showcase imagery.",
    icon: "Columns",
    defaultLayout: "image_right",
    availableLayouts: [
      { id: "image_right", label: "Image Right, Text Left", previewHint: "Classic balanced showcase" },
      { id: "image_left", label: "Image Left, Text Right", previewHint: "Reversed modern editorial" },
    ],
    defaultSettings: {
      badge: "Featured Collection",
      headline: "Purposeful Design for Exceptional Spaces",
      subheadline: "Engineered with precision materials and durable craftsmanship.",
      ctaText: "Shop the Release",
      ctaUrl: "/collections",
      imageUrl: "",
      bulletPoints: ["Curated catalog selections", "Detailed product specifications", "Direct merchant ordering"],
    },
    recommendedIndustries: ["Electronics & Gadgets", "Fashion & Apparel", "Beauty & Cosmetics", "Home & Living"],
    fields: [
      { key: "badge", label: "Top Badge / Label", type: "text", defaultValue: "Featured Collection" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "Purposeful Design for Exceptional Spaces" },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "Engineered with precision materials." },
      { key: "ctaText", label: "CTA Button Text", type: "text", defaultValue: "Shop the Release" },
      { key: "ctaUrl", label: "CTA Destination URL", type: "url", defaultValue: "/collections" },
      { key: "imageUrl", label: "Featured Image", type: "image" },
    ],
  },

  hero_product_showcase: {
    type: "hero_product_showcase",
    category: "hero",
    name: "Product Showcase Hero",
    description: "Spotlight a flagship hero product alongside specifications and instant purchase actions.",
    icon: "Sparkles",
    defaultLayout: "floating_card",
    availableLayouts: [
      { id: "floating_card", label: "Floating Spec Card", previewHint: "Interactive specs alongside hero visual" },
      { id: "minimal_pill", label: "Minimal Tagged Visual", previewHint: "Clean backdrop with product callout" },
    ],
    defaultSettings: {
      headline: "The Signature Flagship Release",
      subheadline: "Refined performance meets timeless understated design.",
      priceDisplay: "$180.00",
      productName: "Signature Edition Masterpiece",
      imageUrl: "",
      specHighlights: ["Precision construction", "Verified product dimensions", "Standard manufacturer guidelines"],
    },
    recommendedIndustries: ["Electronics & Gadgets", "Luxury Goods", "Sports & Outdoors"],
    fields: [
      { key: "headline", label: "Showcase Headline", type: "text", defaultValue: "The Signature Flagship Release" },
      { key: "productName", label: "Flagship Product Name", type: "text", defaultValue: "Signature Edition Masterpiece" },
      { key: "priceDisplay", label: "Price Callout", type: "text", defaultValue: "$180.00" },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "Refined performance meets timeless understated design." },
      { key: "imageUrl", label: "Product Showcase Image", type: "image" },
    ],
  },

  hero_minimal: {
    type: "hero_minimal",
    category: "hero",
    name: "Minimal Editorial Hero",
    description: "Typography-forward, quiet luxury statement with subtle brand cues and minimal clutter.",
    icon: "Minus",
    defaultLayout: "centered",
    availableLayouts: [
      { id: "centered", label: "Centered Minimal", previewHint: "Airy, centered headline with subtle prompt" },
      { id: "left_heavy", label: "Left Heavy", previewHint: "Architectural large typography on the left" },
    ],
    defaultSettings: {
      eyebrow: "Selected Catalog",
      headline: "Form Follows Calm",
      body: "Discover an understated collection of designed objects, made in dialogue with functional materials and architectural forms.",
      linkText: "View the Index",
      linkUrl: "/collections",
    },
    recommendedIndustries: ["Luxury Goods", "Fashion & Apparel", "Home & Living"],
    fields: [
      { key: "eyebrow", label: "Eyebrow Label", type: "text", defaultValue: "Selected Catalog" },
      { key: "headline", label: "Headline", type: "text", defaultValue: "Form Follows Calm" },
      { key: "body", label: "Description", type: "textarea", defaultValue: "Discover an understated collection." },
      { key: "linkText", label: "Text Link Label", type: "text", defaultValue: "View the Index" },
      { key: "linkUrl", label: "Text Link Destination", type: "url", defaultValue: "/collections" },
    ],
  },

  hero_cinematic: {
    type: "hero_cinematic",
    category: "hero",
    name: "Cinematic Framed Hero",
    description: "Framed widescreen presentation with gallery-style matting and fine typographic details.",
    icon: "Film",
    defaultLayout: "framed_widescreen",
    availableLayouts: [
      { id: "framed_widescreen", label: "Framed 21:9", previewHint: "Letterbox aspect ratio with inset border" },
      { id: "inset_card", label: "Inset Gallery Card", previewHint: "Surrounded by generous surface margins" },
    ],
    defaultSettings: {
      headline: "A Vision of Considered Luxury",
      subheadline: "Capturing the serene intersection of contemporary geometry and organic tactility.",
      imageUrl: "",
      ctaText: "Discover the Story",
      ctaUrl: "/collections",
    },
    recommendedIndustries: ["Luxury Goods", "Fashion & Apparel", "Food & Gourmet"],
    fields: [
      { key: "headline", label: "Headline", type: "text", defaultValue: "A Vision of Considered Luxury" },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "Capturing the serene intersection." },
      { key: "imageUrl", label: "Cinematic Image", type: "image" },
      { key: "ctaText", label: "Button Label", type: "text", defaultValue: "Discover the Story" },
      { key: "ctaUrl", label: "Button Destination", type: "url", defaultValue: "/collections" },
    ],
  },

  promotional_banner: {
    type: "promotional_banner",
    category: "hero",
    name: "Promotional Banner",
    description: "High-visibility promotional strip with discount announcement, voucher codes, or countdown callout.",
    icon: "Tag",
    defaultLayout: "split_strip",
    availableLayouts: [
      { id: "split_strip", label: "Split Banner", previewHint: "Bold message left, CTA right" },
      { id: "pill_card", label: "Contained Card", previewHint: "Rounded promo module with coupon pill" },
    ],
    defaultSettings: {
      badge: "Store Notice",
      headline: "View Store Updates and Order Guidelines",
      subheadline: "Explore featured catalog items and current merchant information.",
      ctaText: "Explore Catalog",
      ctaUrl: "/collections",
      promoCode: "",
    },
    recommendedIndustries: ["Fashion & Apparel", "Beauty & Cosmetics", "Food & Gourmet", "Sports & Outdoors"],
    fields: [
      { key: "badge", label: "Badge Label", type: "text", defaultValue: "Store Notice" },
      { key: "headline", label: "Offer Headline", type: "text", defaultValue: "View Store Updates and Order Guidelines" },
      { key: "promoCode", label: "Promo / Discount Code", type: "text", defaultValue: "" },
      { key: "ctaText", label: "CTA Button Text", type: "text", defaultValue: "Explore Catalog" },
      { key: "ctaUrl", label: "CTA Destination URL", type: "url", defaultValue: "/collections" },
    ],
  },

  multi_slide_carousel: {
    type: "multi_slide_carousel",
    category: "hero",
    name: "Hero Slide Showcase",
    description: "Interactive multi-frame hero with accessible previous/next navigation and slide dots.",
    icon: "Sliders",
    defaultLayout: "standard_carousel",
    availableLayouts: [
      { id: "standard_carousel", label: "Full Slide Carousel", previewHint: "Accessible slide transitions" },
    ],
    defaultSettings: {
      slides: [
        {
          title: "Winter Architectural Edit",
          subtitle: "Tactile knitwear and architectural outerwear.",
          ctaText: "Shop Winter Edit",
          ctaUrl: "/collections",
          imageUrl: "",
        },
        {
          title: "Minimal Interior Objects",
          subtitle: "Sculptural stoneware designed for contemplative living.",
          ctaText: "Explore Objects",
          ctaUrl: "/collections",
          imageUrl: "",
        },
      ],
    },
    recommendedIndustries: ["Fashion & Apparel", "Home & Living", "Luxury Goods"],
    fields: [
      {
        key: "slides",
        label: "Slides",
        type: "items_list",
        itemSchema: {
          title: { label: "Slide Title", type: "text" },
          subtitle: { label: "Slide Subtitle", type: "text" },
          ctaText: { label: "Button Label", type: "text" },
          ctaUrl: { label: "Button Destination", type: "url" },
          imageUrl: { label: "Slide Image", type: "image" },
        },
      },
    ],
  },

  // -------------------------------------------------------------
  // PRODUCT & COLLECTION SECTIONS
  // -------------------------------------------------------------
  featured_products: {
    type: "featured_products",
    category: "products",
    name: "Featured Products Grid",
    description: "Grid showcase of store products with category tabs, prices, and quick add.",
    icon: "Grid",
    defaultLayout: "grid_4_cols",
    availableLayouts: [
      { id: "grid_4_cols", label: "4-Column Standard Grid", previewHint: "Classic responsive catalog layout" },
      { id: "grid_3_cols", label: "3-Column Large Cards", previewHint: "Editorial focus with generous cards" },
      { id: "horizontal_scroll", label: "Horizontal Product Rail", previewHint: "Scrollable product row with controls" },
    ],
    defaultSettings: {
      title: "Featured Catalog",
      subtitle: "Explore our latest curated selection of premium pieces.",
      showCategoryFilter: true,
      productLimit: 8,
      showQuickAdd: true,
      showCompareAtPrice: true,
    },
    recommendedIndustries: ["Fashion & Apparel", "Electronics & Gadgets", "Home & Living", "Beauty & Cosmetics", "Food & Gourmet", "Health & Wellness", "Luxury Goods", "Sports & Outdoors"],
    fields: [
      { key: "title", label: "Section Title", type: "text", defaultValue: "Featured Catalog" },
      { key: "subtitle", label: "Section Subtitle", type: "textarea", defaultValue: "Explore our latest curated selection." },
      { key: "showCategoryFilter", label: "Show Category Tabs", type: "boolean", defaultValue: true },
      { key: "showQuickAdd", label: "Enable Quick Add to Bag", type: "boolean", defaultValue: true },
      { key: "productLimit", label: "Number of Products to Display", type: "number", defaultValue: 8 },
    ],
  },

  bestsellers_grid: {
    type: "bestsellers_grid",
    category: "products",
    name: "Bestsellers Spotlight",
    description: "Curated display highlighting top-selling client favorites with popularity badges.",
    icon: "TrendingUp",
    defaultLayout: "spotlight_grid",
    availableLayouts: [
      { id: "spotlight_grid", label: "Spotlight Grid", previewHint: "Featured hero card + 3 bestseller items" },
      { id: "rank_list", label: "Numbered Rank List", previewHint: "Rank badges #1, #2, #3, #4" },
    ],
    defaultSettings: {
      badge: "Client Favorites",
      title: "Most Coveted Pieces",
      subtitle: "The most requested, rigorously tested designs across our collection.",
      productLimit: 4,
    },
    recommendedIndustries: ["Fashion & Apparel", "Beauty & Cosmetics", "Electronics & Gadgets", "Sports & Outdoors"],
    fields: [
      { key: "badge", label: "Top Badge", type: "text", defaultValue: "Client Favorites" },
      { key: "title", label: "Section Title", type: "text", defaultValue: "Most Coveted Pieces" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "The most requested designs." },
      { key: "productLimit", label: "Product Count", type: "number", defaultValue: 4 },
    ],
  },

  new_arrivals: {
    type: "new_arrivals",
    category: "products",
    name: "New Arrivals Rail",
    description: "Showcases recently added catalog pieces sorted by latest arrival timestamp.",
    icon: "Clock",
    defaultLayout: "carousel_rail",
    availableLayouts: [
      { id: "carousel_rail", label: "Horizontal Scroll Rail", previewHint: "Side-scrolling cards with peek preview" },
      { id: "grid_clean", label: "Clean 3-Card Grid", previewHint: "Focused fresh arrival grid" },
    ],
    defaultSettings: {
      badge: "Fresh In Studio",
      title: "Latest Arrivals",
      subtitle: "Recent additions tailored for current wardrobe and living spaces.",
      productLimit: 6,
    },
    recommendedIndustries: ["Fashion & Apparel", "Home & Living", "Electronics & Gadgets"],
    fields: [
      { key: "badge", label: "Badge", type: "text", defaultValue: "Fresh In Studio" },
      { key: "title", label: "Title", type: "text", defaultValue: "Latest Arrivals" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "Recent additions tailored for current catalog." },
      { key: "productLimit", label: "Product Limit", type: "number", defaultValue: 6 },
    ],
  },

  collection_showcase: {
    type: "collection_showcase",
    category: "products",
    name: "Collection & Category Tiles",
    description: "Visual banner tiles allowing shoppers to browse store categories and editorial capsules.",
    icon: "LayoutGrid",
    defaultLayout: "asymmetric_bento",
    availableLayouts: [
      { id: "asymmetric_bento", label: "Bento Box Grid", previewHint: "1 large hero category + 2 smaller categories" },
      { id: "equal_cards", label: "Equal Category Cards", previewHint: "Even grid of category tiles" },
    ],
    defaultSettings: {
      title: "Explore by Collection",
      subtitle: "Discover items tailored by category and curated design intent.",
    },
    recommendedIndustries: ["Fashion & Apparel", "Home & Living", "Food & Gourmet", "Sports & Outdoors"],
    fields: [
      { key: "title", label: "Section Title", type: "text", defaultValue: "Explore by Collection" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "Discover items tailored by category." },
    ],
  },

  product_comparison: {
    type: "product_comparison",
    category: "products",
    name: "Product Comparison Matrix",
    description: "Side-by-side specification table comparing key attributes across product lines.",
    icon: "SlidersHorizontal",
    defaultLayout: "side_by_side",
    availableLayouts: [
      { id: "side_by_side", label: "2-Column Direct Comparison", previewHint: "Direct spec-by-spec comparison" },
    ],
    defaultSettings: {
      title: "Compare Specifications",
      subtitle: "Select the model engineered precisely for your functional requirements.",
      featureLabels: ["Primary Material", "Dimensions / Weight", "Product Category", "Care Guidelines", "Item Specifications"],
    },
    recommendedIndustries: ["Electronics & Gadgets", "Sports & Outdoors", "Health & Wellness"],
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Compare Specifications" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "Select the model engineered precisely." },
    ],
  },

  product_discovery_cta: {
    type: "product_discovery_cta",
    category: "products",
    name: "Product Discovery Callout",
    description: "Single-item visual invitation to explore a specific category or collection landing page.",
    icon: "ArrowRightCircle",
    defaultLayout: "banner_boxed",
    availableLayouts: [
      { id: "banner_boxed", label: "Boxed Visual Banner", previewHint: "Contained banner with image and CTA" },
    ],
    defaultSettings: {
      headline: "Looking for Bespoke Commissions?",
      subheadline: "Our master artisans craft custom editions for residential and hospitality projects.",
      ctaText: "Inquire About Custom Orders",
      ctaUrl: "#contact",
      imageUrl: "",
    },
    recommendedIndustries: ["Home & Living", "Luxury Goods", "Food & Gourmet"],
    fields: [
      { key: "headline", label: "Headline", type: "text", defaultValue: "Looking for Bespoke Commissions?" },
      { key: "subheadline", label: "Subheadline", type: "textarea", defaultValue: "Our master artisans craft custom editions." },
      { key: "ctaText", label: "CTA Button Text", type: "text", defaultValue: "Inquire About Custom Orders" },
      { key: "ctaUrl", label: "Destination URL", type: "url", defaultValue: "#contact" },
      { key: "imageUrl", label: "Background / Side Image", type: "image" },
    ],
  },

  // -------------------------------------------------------------
  // BRAND & EDITORIAL SECTIONS
  // -------------------------------------------------------------
  brand_story: {
    type: "brand_story",
    category: "editorial",
    name: "Brand Story & Heritage",
    description: "Rich narrative section exploring founding principles, design philosophy, and client provenance.",
    icon: "BookOpen",
    defaultLayout: "split_image_right",
    availableLayouts: [
      { id: "split_image_right", label: "Story Left, Image Right", previewHint: "Editorial layout with portrait visual" },
      { id: "split_image_left", label: "Image Left, Story Right", previewHint: "Visual-first narrative block" },
      { id: "centered_editorial", label: "Centered Manifest", previewHint: "Typography-focused statement with pull quote" },
    ],
    defaultSettings: {
      badge: "The Atelier",
      headline: "Rooted in Quiet Craft and Timeless Utility",
      bodyParagraph1: "Founded with the conviction that objects of daily utility should inspire calm and endure for generations. We pair sustainable raw materials with master artisans.",
      bodyParagraph2: "Every piece passes through a rigorous process of prototyping, balance assessment, and hand-finishing in our studio before reaching your hands.",
      quote: "To design simply is not to strip away, but to find the precise moment where nothing more can be removed.",
      quoteAuthor: "Creative Director",
      imageUrl: "",
    },
    recommendedIndustries: ["Luxury Goods", "Home & Living", "Fashion & Apparel", "Beauty & Cosmetics", "Food & Gourmet"],
    fields: [
      { key: "badge", label: "Eyebrow / Badge", type: "text", defaultValue: "The Atelier" },
      { key: "headline", label: "Story Headline", type: "text", defaultValue: "Rooted in Quiet Craft" },
      { key: "bodyParagraph1", label: "Primary Paragraph", type: "textarea", defaultValue: "Founded with the conviction..." },
      { key: "bodyParagraph2", label: "Secondary Paragraph", type: "textarea", defaultValue: "Every piece passes through..." },
      { key: "quote", label: "Pull Quote", type: "textarea", defaultValue: "To design simply is not to strip away..." },
      { key: "quoteAuthor", label: "Quote Attribution", type: "text", defaultValue: "Creative Director" },
      { key: "imageUrl", label: "Story Image", type: "image" },
    ],
  },

  craftsmanship_process: {
    type: "craftsmanship_process",
    category: "editorial",
    name: "Craftsmanship & Process",
    description: "Step-by-step breakdown of material selection, ethical fabrication, and hand-finishing.",
    icon: "Hammer",
    defaultLayout: "step_cards",
    availableLayouts: [
      { id: "step_cards", label: "3-Step Numbered Cards", previewHint: "Clean progression: 01, 02, 03" },
      { id: "horizontal_timeline", label: "Horizontal Process Line", previewHint: "Continuous connecting path" },
    ],
    defaultSettings: {
      badge: "Our Methodology",
      title: "From Raw Material to Final Form",
      subtitle: "A transparent look at the meticulous stages behind every finished creation.",
      steps: [
        { number: "01", title: "Material Selection", description: "Carefully chosen materials suited to purposeful everyday use." },
        { number: "02", title: "Master Machining", description: "Precision CNC tooling paired with decades of artisanal joinery and hand-honed tolerances." },
        { number: "03", title: "Individual Inspection", description: "Every unit is serialized, hand-waxed, and tested under real-world residential conditions." },
      ],
    },
    recommendedIndustries: ["Home & Living", "Luxury Goods", "Sports & Outdoors", "Electronics & Gadgets"],
    fields: [
      { key: "badge", label: "Badge", type: "text", defaultValue: "Our Methodology" },
      { key: "title", label: "Section Title", type: "text", defaultValue: "From Raw Material to Final Form" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "A transparent look at the stages." },
      {
        key: "steps",
        label: "Process Steps",
        type: "items_list",
        itemSchema: {
          number: { label: "Step Number (e.g. 01)", type: "text" },
          title: { label: "Step Title", type: "text" },
          description: { label: "Description", type: "textarea" },
        },
      },
    ],
  },

  lifestyle_editorial_grid: {
    type: "lifestyle_editorial_grid",
    category: "editorial",
    name: "Lifestyle Editorial Grid",
    description: "Atmospheric multi-image mosaic capturing products in real residential, dining, or studio settings.",
    icon: "Image",
    defaultLayout: "mosaic_3",
    availableLayouts: [
      { id: "mosaic_3", label: "3-Frame Mosaic", previewHint: "1 tall portrait + 2 stacked landscape visuals" },
      { id: "equal_triad", label: "Equal 3-Column Grid", previewHint: "Three balanced editorial photographs" },
    ],
    defaultSettings: {
      title: "Living in Context",
      subtitle: "Objects curated to harmonize with daylight, natural texture, and architectural silence.",
      image1Url: "",
      image1Caption: "Morning Light & Stoneware",
      image2Url: "",
      image2Caption: "Raw Linen & Oak Joinery",
      image3Url: "",
      image3Caption: "Studio Archive Study",
    },
    recommendedIndustries: ["Home & Living", "Fashion & Apparel", "Beauty & Cosmetics"],
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Living in Context" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "Objects curated to harmonize." },
      { key: "image1Url", label: "Primary Photo", type: "image" },
      { key: "image1Caption", label: "Primary Caption", type: "text", defaultValue: "Morning Light & Stoneware" },
      { key: "image2Url", label: "Secondary Photo", type: "image" },
      { key: "image2Caption", label: "Secondary Caption", type: "text", defaultValue: "Raw Linen & Oak Joinery" },
      { key: "image3Url", label: "Tertiary Photo", type: "image" },
      { key: "image3Caption", label: "Tertiary Caption", type: "text", defaultValue: "Studio Archive Study" },
    ],
  },

  lookbook_gallery: {
    type: "lookbook_gallery",
    category: "editorial",
    name: "Lookbook Gallery",
    description: "Curated fashion or product visual lookbook with expandable photo cards and style credits.",
    icon: "Camera",
    defaultLayout: "lookbook_slider",
    availableLayouts: [
      { id: "lookbook_slider", label: "Lookbook Slider", previewHint: "Editorial slides with styled look details" },
    ],
    defaultSettings: {
      title: "Capsule Lookbook",
      subtitle: "Styling inspirations from our recent collection presentation.",
      looks: [
        { label: "Look 01 — Monastic Neutral", details: "Double-faced cashmere overcoat with raw wool trouser.", imageUrl: "" },
        { label: "Look 02 — Studio Utilitarian", details: "Structured poplin tunic with brushed horn buttons.", imageUrl: "" },
      ],
    },
    recommendedIndustries: ["Fashion & Apparel", "Luxury Goods"],
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Capsule Lookbook" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "Styling inspirations from our collection presentation." },
    ],
  },

  brand_values: {
    type: "brand_values",
    category: "editorial",
    name: "Brand Values & Ethos",
    description: "Grid highlighting core brand commitments (e.g. Design Integrity, Craft Heritage, Direct Communication).",
    icon: "Shield",
    defaultLayout: "values_3_col",
    availableLayouts: [
      { id: "values_3_col", label: "3-Column Value Cards", previewHint: "Three clean value modules with icons" },
      { id: "values_4_col", label: "4-Column Value Strip", previewHint: "Four compact commitment indicators" },
    ],
    defaultSettings: {
      badge: "Our Philosophy",
      title: "Commitments That Guide Every Release",
      values: [
        { title: "Thoughtful Construction", description: "Structured design focused on everyday utility and functional clarity." },
        { title: "Direct Collaboration", description: "Direct communication and clear specifications for every product in the catalog." },
        { title: "Durable Design", description: "Reliable builds suited for ongoing everyday use and practical maintenance." },
      ],
    },
    recommendedIndustries: ["Fashion & Apparel", "Home & Living", "Health & Wellness", "Beauty & Cosmetics"],
    fields: [
      { key: "badge", label: "Badge", type: "text", defaultValue: "Our Philosophy" },
      { key: "title", label: "Title", type: "text", defaultValue: "Commitments That Guide Every Release" },
      {
        key: "values",
        label: "Values List",
        type: "items_list",
        itemSchema: {
          title: { label: "Value Title", type: "text" },
          description: { label: "Description", type: "textarea" },
        },
      },
    ],
  },

  timeline_milestones: {
    type: "timeline_milestones",
    category: "editorial",
    name: "Timeline & Milestones",
    description: "Historical or seasonal progression showing brand evolution and key breakthrough releases.",
    icon: "GitCommit",
    defaultLayout: "vertical_timeline",
    availableLayouts: [
      { id: "vertical_timeline", label: "Vertical Centered Timeline", previewHint: "Alternating year markers and descriptions" },
    ],
    defaultSettings: {
      title: "Our Heritage & Progression",
      subtitle: "A decade of relentless iteration and quiet growth.",
      milestones: [
        { year: "2018", title: "The Studio Established", description: "First workshop opened with three artisans focusing on bespoke commissions." },
        { year: "2021", title: "Circular Material Standard", description: "Eliminated all virgin plastics and launched our take-back circular repair initiative." },
        { year: "2024", title: "Global Flagship Exhibition", description: "Unveiled the modular living collection across Milan, Tokyo, and Copenhagen." },
      ],
    },
    recommendedIndustries: ["Luxury Goods", "Home & Living", "Food & Gourmet"],
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Our Heritage & Progression" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "A decade of relentless iteration." },
    ],
  },

  // -------------------------------------------------------------
  // INFORMATIONAL & CONVERSION-SUPPORT SECTIONS
  // -------------------------------------------------------------
  benefits_grid: {
    type: "benefits_grid",
    category: "info",
    name: "Benefits & Value Pillars",
    description: "Iconic benefit cards establishing reassurance (Complimentary Shipping, Lifetime Support, Sustainable Packaging).",
    icon: "CheckCircle",
    defaultLayout: "cards_4_col",
    availableLayouts: [
      { id: "cards_4_col", label: "4-Column Icon Grid", previewHint: "Four balanced reassurance pillars" },
      { id: "cards_3_col", label: "3-Column Detailed Cards", previewHint: "Three in-depth value propositions" },
    ],
    defaultSettings: {
      badge: "The GridRetail Standard",
      title: "Why Discerning Clients Choose Us",
      benefits: [],
    },
    recommendedIndustries: ["Electronics & Gadgets", "Fashion & Apparel", "Home & Living", "Sports & Outdoors", "Beauty & Cosmetics"],
    fields: [
      { key: "badge", label: "Badge", type: "text", defaultValue: "The GridRetail Standard" },
      { key: "title", label: "Title", type: "text", defaultValue: "Why Discerning Clients Choose Us" },
      {
        key: "benefits",
        label: "Benefits List",
        type: "items_list",
        itemSchema: {
          title: { label: "Benefit Title", type: "text" },
          description: { label: "Description", type: "textarea" },
        },
      },
    ],
  },

  how_it_works: {
    type: "how_it_works",
    category: "info",
    name: "How It Works",
    description: "Explains custom ordering, bespoke fitting, or direct-to-consumer delivery workflows.",
    icon: "HelpCircle",
    defaultLayout: "steps_horizontal",
    availableLayouts: [
      { id: "steps_horizontal", label: "Horizontal Steps Flow", previewHint: "Connected numbered checkpoints" },
    ],
    defaultSettings: {
      badge: "Simple & Seamless",
      title: "How to Commission Your Storefront Piece",
      steps: [
        { step: "01", title: "Select Configuration", description: "Choose finish, scale, and textile swatch tailored to your floor plan." },
        { step: "02", title: "Studio Fabrication", description: "Artisans build your commission to order with weekly photo updates." },
        { step: "03", title: "White-Glove Placement", description: "Unpacked, assembled, and positioned in your residence by our courier specialists." },
      ],
    },
    recommendedIndustries: ["Home & Living", "Luxury Goods", "Food & Gourmet"],
    fields: [
      { key: "badge", label: "Badge", type: "text", defaultValue: "Simple & Seamless" },
      { key: "title", label: "Title", type: "text", defaultValue: "How to Commission Your Storefront Piece" },
    ],
  },

  faq_accordion: {
    type: "faq_accordion",
    category: "info",
    name: "FAQ Accordion",
    description: "Interactive collapsible accordion answering common customer queries and purchase policies.",
    icon: "HelpCircle",
    defaultLayout: "stacked_accordion",
    availableLayouts: [
      { id: "stacked_accordion", label: "Stacked Accordion", previewHint: "Smooth expand/collapse items" },
      { id: "split_two_column", label: "Two Column Grid", previewHint: "Side-by-side categorized questions" },
    ],
    defaultSettings: {
      badge: "Frequently Asked",
      title: "Questions & Customer Policies",
      subtitle: "Everything you need to know about bespoke orders, lead times, and international logistics.",
      faqs: [
        { question: "What are your standard studio production lead times?", answer: "In-stock catalog pieces dispatch within 2 business days. Bespoke commissioned woodwork or custom pieces require 3–4 weeks for careful production and inspection." },
        { question: "How are customer returns handled?", answer: "If an item does not suit your space, please contact customer support within 30 days to review return guidelines and initiate support." },
        { question: "What are your order fulfillment terms?", answer: "Fulfillment timeframes, regional availability, and order terms are set directly by the merchant. Please review published store policies or contact customer support for specific details." },
        { question: "How do I care for and maintain natural oiled finishes?", answer: "We recommend regular maintenance according to included product care guidelines. Apply lightly once every six months with a clean cloth to preserve finish." },
      ],
    },
    recommendedIndustries: ["Fashion & Apparel", "Home & Living", "Electronics & Gadgets", "Beauty & Cosmetics", "Sports & Outdoors"],
    fields: [
      { key: "badge", label: "Badge", type: "text", defaultValue: "Frequently Asked" },
      { key: "title", label: "Title", type: "text", defaultValue: "Questions & Customer Policies" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "Everything you need to know." },
      {
        key: "faqs",
        label: "FAQ Questions & Answers",
        type: "items_list",
        itemSchema: {
          question: { label: "Question", type: "text" },
          answer: { label: "Answer", type: "textarea" },
        },
      },
    ],
  },

  shipping_returns: {
    type: "shipping_returns",
    category: "info",
    name: "Shipping & Returns Policy",
    description: "Clear delivery timeline breakdown, return conditions, and package tracking guarantees.",
    icon: "Truck",
    defaultLayout: "split_reassurance",
    availableLayouts: [
      { id: "split_reassurance", label: "Split Cards", previewHint: "Delivery on left, Returns on right" },
    ],
    defaultSettings: {
      badge: "Store Logistics",
      title: "Order Fulfillment & Support Policy",
      deliveryTitle: "Order Dispatch & Handling",
      deliveryText: "Orders are processed directly by our studio team in accordance with regional fulfillment guidelines.",
      returnTitle: "Exchange & Assistance",
      returnText: "Please contact our support team with your order reference for order modifications or assistance.",
    },
    recommendedIndustries: ["Fashion & Apparel", "Electronics & Gadgets", "Beauty & Cosmetics", "Home & Living"],
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Order Fulfillment & Support Policy" },
      { key: "deliveryTitle", label: "Delivery Block Title", type: "text", defaultValue: "Order Processing" },
      { key: "deliveryText", label: "Delivery Details", type: "textarea", defaultValue: "Orders are handled and fulfilled in accordance with published merchant policies." },
      { key: "returnTitle", label: "Return Block Title", type: "text", defaultValue: "Customer Inquiries & Returns" },
      { key: "returnText", label: "Return Details", type: "textarea", defaultValue: "Customer policies and returns are defined directly by the merchant." },
    ],
  },

  contact_info: {
    type: "contact_info",
    category: "info",
    name: "Contact & Concierge",
    description: "Client concierge contact card with showroom hours, email address, and direct telephone booking.",
    icon: "Mail",
    defaultLayout: "card_centered",
    availableLayouts: [
      { id: "card_centered", label: "Centered Concierge Card", previewHint: "Clear contact details card" },
      { id: "split_form_info", label: "Info with Quick Message", previewHint: "Contact details alongside inquiry form" },
    ],
    defaultSettings: {
      badge: "Client Concierge",
      headline: "We are Here to Assist Your Project",
      email: "concierge@gridretail.internal",
      phone: "+1 (800) 474-3738",
      hours: "Monday – Friday, 09:00 – 18:00 EST",
      address: "Studio 4B, 108 Mercer Street, New York, NY 10012",
    },
    recommendedIndustries: ["Luxury Goods", "Home & Living", "Health & Wellness"],
    fields: [
      { key: "headline", label: "Headline", type: "text", defaultValue: "We are Here to Assist Your Project" },
      { key: "email", label: "Email Address", type: "text", defaultValue: "concierge@gridretail.internal" },
      { key: "phone", label: "Telephone Number", type: "text", defaultValue: "+1 (800) 474-3738" },
      { key: "hours", label: "Operating Hours", type: "text", defaultValue: "Monday – Friday, 09:00 – 18:00 EST" },
      { key: "address", label: "Showroom Address", type: "text", defaultValue: "Studio 4B, 108 Mercer Street, New York" },
    ],
  },

  newsletter_signup: {
    type: "newsletter_signup",
    category: "info",
    name: "Newsletter Subscription",
    description: "Audience capture module for private showroom releases, discount codes, and seasonal updates.",
    icon: "Send",
    defaultLayout: "centered_minimal",
    availableLayouts: [
      { id: "centered_minimal", label: "Centered Minimal", previewHint: "Clean subscription field with title" },
      { id: "card_boxed", label: "Contained Card with Perks", previewHint: "Rounded card highlighting member perks" },
    ],
    defaultSettings: {
      title: "Stay in Touch with the Atelier",
      subtitle: "Subscribe to receive private showroom previews, archival releases, and seasonal dispatches.",
      buttonText: "Subscribe",
      placeholder: "Enter client email address...",
      successMessage: "Thank you for joining our private dispatch list.",
    },
    recommendedIndustries: ["Fashion & Apparel", "Home & Living", "Luxury Goods", "Beauty & Cosmetics", "Food & Gourmet"],
    fields: [
      { key: "title", label: "Title", type: "text", defaultValue: "Stay in Touch with the Atelier" },
      { key: "subtitle", label: "Subtitle", type: "textarea", defaultValue: "Subscribe to receive private showroom previews." },
      { key: "buttonText", label: "Button Label", type: "text", defaultValue: "Subscribe" },
      { key: "placeholder", label: "Input Placeholder", type: "text", defaultValue: "Enter client email address..." },
    ],
  },

  announcement_strip: {
    type: "announcement_strip",
    category: "info",
    name: "Announcement Banner",
    description: "Compact notice banner for showroom open days, holiday delivery deadlines, or pop-up events.",
    icon: "Megaphone",
    defaultLayout: "compact_strip",
    availableLayouts: [
      { id: "compact_strip", label: "Compact Horizontal Strip", previewHint: "Single-line high visibility banner" },
    ],
    defaultSettings: {
      message: "Studio Winter Hours: New showroom commissions open through December 15.",
      actionText: "Book Appointment",
      actionUrl: "#contact",
      dismissible: true,
    },
    recommendedIndustries: ["Fashion & Apparel", "Luxury Goods", "Food & Gourmet"],
    fields: [
      { key: "message", label: "Announcement Message", type: "text", defaultValue: "Studio Winter Hours: Commissions open." },
      { key: "actionText", label: "Action Link Text", type: "text", defaultValue: "Book Appointment" },
      { key: "actionUrl", label: "Action Link Destination", type: "url", defaultValue: "#contact" },
    ],
  },

  trust_badges: {
    type: "trust_badges",
    category: "info",
    name: "Trust & Commitments",
    description: "Standard service commitments and published store indicators.",
    icon: "Award",
    defaultLayout: "horizontal_row",
    availableLayouts: [
      { id: "horizontal_row", label: "Horizontal Trust Row", previewHint: "Clean badges in a horizontal row" },
      { id: "cards_grid", label: "Trust Cards Grid", previewHint: "Prominent badges in structured cards" },
    ],
    defaultSettings: {
      badge: "Store Commitments",
      title: "Store Standards & Values",
      badges: [
        { label: "Direct Support", sublabel: "Responsive merchant communication" },
        { label: "Detailed Specifications", sublabel: "Accurate product dimensions and attributes" },
        { label: "Clear Store Policies", sublabel: "Transparent order and customer terms" },
        { label: "Secure Processing", sublabel: "Standard verified checkout mechanisms" },
      ],
    },
    recommendedIndustries: ["Home & Living", "Health & Wellness", "Beauty & Cosmetics", "Food & Gourmet"],
    fields: [
      { key: "badge", label: "Top Badge / Label", type: "text", defaultValue: "Store Commitments" },
      { key: "title", label: "Section Title", type: "text", defaultValue: "Store Standards & Values" },
      {
        key: "badges",
        label: "Trust Badges & Certifications",
        type: "items_list",
        itemSchema: {
          label: { label: "Badge Label", type: "text" },
          sublabel: { label: "Sublabel / Description", type: "text" },
        },
      },
    ],
  },

  verified_statistics_bar: {
    type: "verified_statistics_bar",
    category: "info",
    name: "Verified Statistics Bar",
    description: "Displays objective, verifiable metrics and business performance figures without misleading claims.",
    icon: "BarChart3",
    defaultLayout: "horizontal_counters",
    availableLayouts: [
      { id: "horizontal_counters", label: "Horizontal Metric Counters", previewHint: "Clean metrics side by side" },
      { id: "boxed_cards", label: "Boxed Metric Cards", previewHint: "Structured cards with clear borders" },
    ],
    defaultSettings: {
      badge: "Operational Metrics",
      title: "Key Performance Indicators",
      items: [
        { value: "--", label: "Metric Label", sublabel: "Add verified metric description" },
      ],
    },
    recommendedIndustries: ["Professional Services", "Technology", "Health & Wellness", "Corporate"],
    fields: [
      { key: "badge", label: "Badge / Eyebrow", type: "text", defaultValue: "Operational Metrics" },
      { key: "title", label: "Section Title", type: "text", defaultValue: "Key Performance Indicators" },
      {
        key: "items",
        label: "Statistical Metrics",
        type: "items_list",
        itemSchema: {
          value: { label: "Metric Value", type: "text" },
          label: { label: "Metric Label", type: "text" },
          sublabel: { label: "Context / Sublabel", type: "text" },
        },
      },
    ],
  },

  custom_rich_text: {
    type: "custom_rich_text",
    category: "info",
    name: "Custom Rich Text",
    description: "Versatile editorial block for custom announcements, founder letters, or collaborative dispatches.",
    icon: "FileText",
    defaultLayout: "editorial_prose",
    availableLayouts: [
      { id: "editorial_prose", label: "Centered Prose", previewHint: "Clean typography container" },
      { id: "left_accented", label: "Left Border Accent", previewHint: "Editorial block with brand color line" },
    ],
    defaultSettings: {
      title: "A Letter from Our Founder",
      content: "When we started GridRetail in 2026, our dream was simple: build digital storefronts that celebrate material truth and calm spaces over fleeting noise. Thank you for walking this path with us.",
      signatureName: "Alex Mercer",
      signatureTitle: "Founder & Master Craftsman",
    },
    recommendedIndustries: ["Luxury Goods", "Home & Living", "Food & Gourmet", "Health & Wellness"],
    fields: [
      { key: "title", label: "Section Title", type: "text", defaultValue: "A Letter from Our Founder" },
      { key: "content", label: "Body Text", type: "textarea", defaultValue: "When we started GridRetail in 2026..." },
      { key: "signatureName", label: "Sign-off Name", type: "text", defaultValue: "Alex Mercer" },
      { key: "signatureTitle", label: "Sign-off Title", type: "text", defaultValue: "Founder & Master Craftsman" },
    ],
  },

  footer_custom: {
    type: "footer_custom",
    category: "footer",
    name: "Storefront Footer",
    description: "Configurable footer with brand bio, navigation links, copyright, and engine badge.",
    icon: "PanelBottom",

    defaultLayout: "multi_column",
    availableLayouts: [
      { id: "multi_column", label: "4-Column Navigation", previewHint: "Bio, Shop, Studio, and Legal columns" },
      { id: "minimal_inline", label: "Minimal Single Row", previewHint: "Clean horizontal footer" },
    ],
    defaultSettings: {
      brandBio: "Curated demonstration storefront engineered on the GridRetail platform.",
      copyrightNotice: "All rights reserved. Designed for presentation & demonstration.",
      showEngineBadge: true,
    },
    recommendedIndustries: ["Fashion & Apparel", "Electronics & Gadgets", "Home & Living", "Beauty & Cosmetics", "Food & Gourmet", "Health & Wellness", "Luxury Goods", "Sports & Outdoors"],
    fields: [
      { key: "brandBio", label: "Brand Short Bio", type: "textarea", defaultValue: "Curated demonstration storefront." },
      { key: "copyrightNotice", label: "Copyright Notice", type: "text", defaultValue: "All rights reserved." },
      { key: "showEngineBadge", label: "Display 'Powered by GridRetail' Badge", type: "boolean", defaultValue: true },
    ],
  },
};

export const ALL_SECTION_DEFINITIONS: SectionDefinition[] = Object.values(SECTION_DEFINITIONS);

export function getSectionDefinition(type: SectionType): SectionDefinition | undefined {
  return SECTION_DEFINITIONS[type];
}

export function getDefaultSectionInstance(
  type: SectionType,
  order: number = 0,
  websiteType?: "ecommerce" | "appointments" | "lead_gen"
): SectionInstance {
  const def = SECTION_DEFINITIONS[type];
  if (!def) {
    return {
      id: generateSectionId(type),
      type,
      visible: true,
      order,
      settings: {},
    };
  }

  const settings = deepCloneSectionSettings(def.defaultSettings);

  if (websiteType === "appointments") {
    if (type === "hero_split") {
      settings.badge = "Practice Overview";
      settings.headline = "Professional Advisory & Strategic Consultation";
      settings.subheadline = "Schedule a focused, confidential appointment with our experienced practitioners.";
      settings.ctaText = "Book Consultation";
      settings.ctaUrl = "#booking-section";
      settings.bulletPoints = [
        "Confidential consultation enquiries",
        "Explore practice areas",
        "Connect with the practice team",
      ];
    } else if (type === "hero_minimal") {
      settings.eyebrow = "Practice Overview";
      settings.headline = "Professional Advisory & Strategic Consultation";
      settings.body = "Schedule a focused, confidential appointment with our experienced practitioners.";
      settings.linkText = "Book Consultation";
      settings.linkUrl = "#booking-section";
    } else if (type === "hero_full_width" || type === "hero_cinematic") {
      settings.headline = "Professional Advisory & Strategic Consultation";
      settings.subheadline = "Schedule a focused, confidential appointment with our experienced practitioners.";
      settings.ctaText = "Book Consultation";
      settings.ctaUrl = "#booking-section";
    } else if (type === "benefits_grid") {
      settings.badge = "Client Commitments";
      settings.title = "Confidential, Accredited Consultations";
      settings.subtitle = "Direct calendar access to verified senior practitioners.";
    }
  } else if (websiteType === "lead_gen") {
    if (type === "hero_split") {
      settings.badge = "Growth Advisory";
      settings.headline = "Strategic Solutions & Dedicated Advisory";
      settings.subheadline = "Submit your inquiry to receive a tailored proposal and strategic consultation from our team.";
      settings.ctaText = "Request Consultation";
      settings.ctaUrl = "#inquiry-form";
      settings.bulletPoints = [
        "Discuss your business goals",
        "Explore advisory services",
        "Request an initial assessment",
      ];
    } else if (type === "hero_minimal") {
      settings.eyebrow = "Growth Advisory";
      settings.headline = "Strategic Solutions & Dedicated Advisory";
      settings.body = "Submit your inquiry to receive a tailored proposal and strategic consultation from our team.";
      settings.linkText = "Request Consultation";
      settings.linkUrl = "#inquiry-form";
    } else if (type === "hero_full_width" || type === "hero_cinematic") {
      settings.headline = "Strategic Solutions & Dedicated Advisory";
      settings.subheadline = "Submit your inquiry to receive a tailored proposal and strategic consultation from our team.";
      settings.ctaText = "Request Consultation";
      settings.ctaUrl = "#inquiry-form";
    } else if (type === "benefits_grid") {
      settings.badge = "Value Proposition";
      settings.title = "Why Industry Leaders Partner With Us";
      settings.subtitle = "Delivering measurable business outcomes through dedicated expertise and disciplined execution.";
    }
  }

  return {
    id: generateSectionId(type),
    type,
    layoutVariant: def.defaultLayout,
    visible: true,
    order,
    settings,
    customTitle: def.name,
  };
}

export function getRecommendedSectionsForIndustry(industry: string): SectionType[] {
  return ALL_SECTION_DEFINITIONS
    .filter((def) => !def.recommendedIndustries || def.recommendedIndustries.includes(industry))
    .map((def) => def.type);
}
