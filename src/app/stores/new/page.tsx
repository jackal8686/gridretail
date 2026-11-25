"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Palette,
  Sparkles,
  Package,
  Layers,
  AlertCircle,
  Plus,
  Copy,
  ExternalLink,
  Tag,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Upload,
  Loader2,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  Phone,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Modal } from "@/components/ui/Modal";
import { normalizeSlug, validateSlug } from "@/lib/validation/slug";
import { getStoreLocalSubdomainUrl, getStorePathUrl } from "@/lib/urls";
import { Client, IndustryType, Store, StoreCategory } from "@/types";
import { WebsiteType, AppointmentIndustry, DayOperatingHours } from "@/types/appointment";
import { DEFAULT_WEEKLY_HOURS } from "@/lib/scheduling/availability";
import { cn } from "@/utils/cn";
import { DESIGN_TEMPLATES, getDesignTemplateById } from "@/constants/design-templates";
import { COLOR_THEMES, getThemeById } from "@/constants/themes";
import { LEAD_STARTER_TEMPLATES } from "@/constants/lead-templates";
import { formatINR } from "@/utils/currency";
import {
  BusinessProfile,
  VisualStylePreference,
  BrandPersonality,
  TypographyPreference,
  GeneratedWebsitePlan,
} from "@/types/business-profile";
import { MockGenerationProvider } from "@/lib/generation/mock-provider";
import { ContentGenerator } from "@/lib/generation/content-generator";
import { SectionType } from "@/types/section";

const APPOINTMENT_INDUSTRY_OPTIONS: AppointmentIndustry[] = [
  "Legal Practice & Advisory",
  "Consulting & Strategy",
  "Healthcare & Medical Clinic",
  "Salon, Spa & Wellness",
  "Education & Private Tutoring",
  "Coaching & Personal Training",
  "Creative & Design Services",
  "Other Professional Services",
];

const APPOINTMENT_SERVICE_PRESETS: Record<
  AppointmentIndustry,
  { name: string; description: string; durationMinutes: number; price: number; isFreeConsultation?: boolean; meetingType: "video_call" | "in_person" | "phone_call" }[]
> = {
  "Legal Practice & Advisory": [
    { name: "Initial Legal Consultation", description: "Focused discussion to assess your legal matter, evaluate options, and map out strategy.", durationMinutes: 60, price: 3500, meetingType: "video_call" },
    { name: "Contract & Document Review", description: "Detailed review of legal agreements, terms, risk exposure, and recommendations.", durationMinutes: 45, price: 2500, meetingType: "video_call" },
    { name: "Corporate Advisory Session", description: "Comprehensive corporate advisory on governance, compliance, and commercial transactions.", durationMinutes: 90, price: 5000, meetingType: "in_person" },
  ],
  "Consulting & Strategy": [
    { name: "Discovery Strategy Call", description: "Introductory session to understand your operational goals and identify key opportunities.", durationMinutes: 30, price: 0, isFreeConsultation: true, meetingType: "video_call" },
    { name: "Business Growth Audit", description: "In-depth review of business model, funnel metrics, and strategic roadmap recommendations.", durationMinutes: 60, price: 4500, meetingType: "video_call" },
    { name: "Executive Strategy Deep-Dive", description: "Structured workshop covering executive decision-making, organizational structure, and execution.", durationMinutes: 120, price: 9000, meetingType: "in_person" },
  ],
  "Healthcare & Medical Clinic": [
    { name: "General Medical Consultation", description: "Routine health assessment, symptom diagnosis, and personalized medical guidance.", durationMinutes: 30, price: 800, meetingType: "in_person" },
    { name: "Comprehensive Health Review", description: "Detailed clinical history review, diagnostic interpretation, and preventative lifestyle plan.", durationMinutes: 60, price: 1500, meetingType: "in_person" },
    { name: "Telehealth Follow-up Call", description: "Remote review of lab reports, treatment progress, and prescription renewals.", durationMinutes: 20, price: 500, meetingType: "video_call" },
  ],
  "Salon, Spa & Wellness": [
    { name: "Signature Haircut & Styling", description: "Custom consultation, precision cut, wash, and artisanal blow-dry styling.", durationMinutes: 45, price: 1200, meetingType: "in_person" },
    { name: "Deep Tissue Wellness Therapy", description: "Therapeutic massage targeting muscular tension, circulation, and holistic relaxation.", durationMinutes: 60, price: 2500, meetingType: "in_person" },
    { name: "Express Glow Facial", description: "Hydrating botanical facial treatment designed for immediate skin brightness and texture.", durationMinutes: 30, price: 1000, meetingType: "in_person" },
  ],
  "Education & Private Tutoring": [
    { name: "Diagnostic Academic Assessment", description: "Skill gap evaluation, curriculum review, and personalized learning roadmap.", durationMinutes: 45, price: 0, isFreeConsultation: true, meetingType: "video_call" },
    { name: "One-on-One Subject Tutoring", description: "Targeted concept mastery, problem-solving, and exam preparation.", durationMinutes: 60, price: 1500, meetingType: "video_call" },
  ],
  "Coaching & Personal Training": [
    { name: "Fitness & Goal Evaluation", description: "Physical assessment, nutrition discussion, and tailored fitness programming.", durationMinutes: 45, price: 1000, meetingType: "in_person" },
    { name: "Executive Leadership Coaching", description: "Confidential coaching session focused on leadership presence and performance.", durationMinutes: 60, price: 3500, meetingType: "video_call" },
  ],
  "Creative & Design Services": [
    { name: "Creative Discovery & Briefing", description: "Brand aesthetic discussion, project scoping, and moodboard direction.", durationMinutes: 45, price: 0, isFreeConsultation: true, meetingType: "video_call" },
    { name: "Design Review & Critique", description: "Actionable design audit of UI/UX, brand identity, or creative assets.", durationMinutes: 60, price: 3000, meetingType: "video_call" },
  ],
  "Other Professional Services": [
    { name: "Professional Consultation", description: "Structured advisory session tailored to your specific project needs.", durationMinutes: 60, price: 2000, meetingType: "video_call" },
  ],
};

interface CustomAppointmentServiceItem {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isFreeConsultation: boolean;
  meetingType: "video_call" | "in_person" | "phone_call";
}


const INDUSTRY_OPTIONS: IndustryType[] = [
  "Fashion & Apparel",
  "Electronics & Gadgets",
  "Home & Living",
  "Beauty & Cosmetics",
  "Food & Gourmet",
  "Health & Wellness",
  "Luxury Goods",
  "Sports & Outdoors",
];

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter (Modern Sans)" },
  { value: "Plus Jakarta Sans, sans-serif", label: "Plus Jakarta Sans (Tech Clean)" },
  { value: "Playfair Display, serif", label: "Playfair Display (Editorial Serif)" },
  { value: "Space Grotesk, sans-serif", label: "Space Grotesk (Neo-Brutalist)" },
  { value: "DM Sans, sans-serif", label: "DM Sans (Minimalist Geometric)" },
];

const INDUSTRY_CATEGORY_PRESETS: Record<IndustryType, { name: string; description: string }[]> = {
  "Fashion & Apparel": [
    { name: "Tops & Shirts", description: "Bespoke shirts, elevated tees, and knitwear." },
    { name: "Pants & Trousers", description: "Tailored chinos, raw denim, and relaxed trousers." },
    { name: "Outerwear & Jackets", description: "Structured overcoats, trench coats, and jackets." },
    { name: "Footwear & Accessories", description: "Handcrafted shoes, belts, and leather accessories." },
  ],
  "Electronics & Gadgets": [
    { name: "Audio & Acoustics", description: "Noise-cancelling headphones and wireless hi-fi speakers." },
    { name: "Smart Devices", description: "Smart displays, assistants, and environmental sensors." },
    { name: "Wearable Tech", description: "Fitness smartwatches and health monitoring bands." },
    { name: "Power & Cables", description: "Fast GaN chargers, wireless pads, and braided cables." },
  ],
  "Home & Living": [
    { name: "Living Room Furniture", description: "Artisan sofas, oak coffee tables, and accent armchairs." },
    { name: "Lighting & Lamps", description: "Sculptural pendant lights, brass sconces, and desk lamps." },
    { name: "Kitchen & Dining", description: "Handmade ceramic dinnerware, linens, and cookware." },
    { name: "Decor & Scents", description: "Textured vases, wool throws, and botanical soy candles." },
  ],
  "Beauty & Cosmetics": [
    { name: "Skincare Essentials", description: "Hydrating hyaluronic serums, botanical cleansers, and creams." },
    { name: "Complexion & Makeup", description: "Weightless mineral foundations, concealers, and cheek tints." },
    { name: "Artisan Fragrances", description: "Small-batch eau de parfum, room mists, and solid scents." },
    { name: "Hair & Body Care", description: "Nourishing botanical oils, scalp scrubs, and rich body butters." },
  ],
  "Food & Gourmet": [
    { name: "Artisanal Coffee & Tea", description: "Single-origin roast beans, loose leaf teas, and brewers." },
    { name: "Pantry & Condiments", description: "Cold-pressed extra virgin olive oils, balsamic glazes, and spices." },
    { name: "Confections & Sweets", description: "Single-origin dark chocolates, honeycombs, and shortbreads." },
    { name: "Bakery & Breads", description: "Wild-ferment sourdough loaves, brioche, and morning pastries." },
  ],
  "Health & Wellness": [
    { name: "Supplements & Tonics", description: "Organic adaptogen powders, clean vitamins, and botanical elixirs." },
    { name: "Recovery & Sleep", description: "Magnesium bath soaks, silk eye masks, and herbal sleep drops." },
    { name: "Yoga & Mindfulness", description: "Non-slip cork yoga mats, meditation cushions, and blocks." },
    { name: "Hydration & Nutrition", description: "Insulated stainless bottles, hydration electrolytes, and protein." },
  ],
  "Luxury Goods": [
    { name: "Timepieces & Horology", description: "Automatic chronographs, minimal dress watches, and straps." },
    { name: "Fine Leatherwork", description: "Full-grain leather totes, weekend duffels, and card cases." },
    { name: "Fine Jewelry", description: "Recycled 18k solid gold rings, diamond pendants, and cuff bracelets." },
    { name: "Writing Instruments", description: "Precision fountain pens, archival stationery, and inks." },
  ],
  "Sports & Outdoors": [
    { name: "Trail & Hiking", description: "Technical weather-resistant daypacks, trekking poles, and boots." },
    { name: "Apparel & Performance", description: "Moisture-wicking base layers, windbreakers, and compression tights." },
    { name: "Camp & Shelter", description: "Ultralight two-person tents, down sleeping quilts, and camp stoves." },
    { name: "Water Sports & Gear", description: "Inflatable paddleboards, dry bags, and quick-dry surf towels." },
  ],
  "Legal & Advisory": [
    { name: "Corporate & M&A", description: "Mergers, acquisitions, corporate structuring, and due diligence." },
    { name: "IP & Patents", description: "Trademark registration, patent portfolios, and IP enforcement." },
    { name: "Regulatory Compliance", description: "Cross-border governance, data protection, and risk assessment." },
    { name: "Executive Consultation", description: "Board advisory, dispute resolution, and contract drafting." },
  ],
  "Professional Services": [
    { name: "Strategy & Transformation", description: "Enterprise scaling, revenue optimization, and market entry." },
    { name: "Operational Architecture", description: "Workflow automation, supply chain, and organizational design." },
    { name: "Financial Advisory", description: "Capital allocation, pipeline acceleration, and valuation models." },
    { name: "Executive Coaching", description: "Leadership alignment, executive advisory, and change management." },
  ],
};

interface CustomCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
}

interface CustomProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  sku: string;
  description: string;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  status: "active" | "draft";
  imageUrl?: string;
  compareAtPrice?: number;
  variants?: string[];
  specifications?: Record<string, string>;
  thumbnailColor?: string;
}

export default function NewStoreWizardPage() {
  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Data Collections
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);


  // Form State - Step 1: Basics
  const [websiteType, setWebsiteType] = useState<WebsiteType>("ecommerce");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>("Home & Living");
  const [selectedAppointmentIndustry, setSelectedAppointmentIndustry] = useState<AppointmentIndustry>("Legal Practice & Advisory");
  const [description, setDescription] = useState("");

  // Form State - Step 2: Business Profile & Audience
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [primaryAudience, setPrimaryAudience] = useState("");
  const [customerNeeds, setCustomerNeeds] = useState("");
  const [differentiators, setDifferentiators] = useState("");

  // Form State - Step 3: Brand Direction & Personality
  const [visualStyle, setVisualStyle] = useState<VisualStylePreference>("modern_minimal");
  const [brandPersonality, setBrandPersonality] = useState<BrandPersonality>("professional");
  const [typographyPreference, setTypographyPreference] = useState<TypographyPreference>("clean_sans");

  // Form State - Step 4: AI Context-Aware Generation Plan
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedWebsitePlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [enabledPlanSections, setEnabledPlanSections] = useState<Record<string, boolean>>({});

  // Appointment Configuration State
  const [appointmentServices, setAppointmentServices] = useState<CustomAppointmentServiceItem[]>(() => {
    return (APPOINTMENT_SERVICE_PRESETS["Legal Practice & Advisory"] || []).map((s, idx) => ({
      id: `srv_${idx}_${normalizeSlug(s.name)}`,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: s.price,
      isFreeConsultation: !!s.isFreeConsultation,
      meetingType: s.meetingType,
    }));
  });

  const [practitionerName, setPractitionerName] = useState("Adv. Rajesh Iyer");
  const [practitionerRole, setPractitionerRole] = useState("Senior Managing Counsel");
  const [practitionerEmail, setPractitionerEmail] = useState("rajesh.iyer@example.in");
  const [appointmentTimezone, setAppointmentTimezone] = useState("Asia/Kolkata");
  const [appointmentWeeklyHours, setAppointmentWeeklyHours] = useState<DayOperatingHours[]>(DEFAULT_WEEKLY_HOURS);
  const [appointmentBufferMinutes, setAppointmentBufferMinutes] = useState(15);
  const [appointmentMinNoticeHours, setAppointmentMinNoticeHours] = useState(2);
  const [appointmentMaxAdvanceDays, setAppointmentMaxAdvanceDays] = useState(30);
  const [appointmentNoticeHours, setAppointmentNoticeHours] = useState(24);
  const [appointmentRequireApproval, setAppointmentRequireApproval] = useState(false);
  const [appointmentMeetingLocation, setAppointmentMeetingLocation] = useState("Nariman Point Executive Chambers, Mumbai & Secure Video Link");

  // Lead Generation Starter state
  const [selectedLeadTemplateId, setSelectedLeadTemplateId] = useState(LEAD_STARTER_TEMPLATES[0].id);
  const [leadFormCustomTitle, setLeadFormCustomTitle] = useState(LEAD_STARTER_TEMPLATES[0].name);

  // Service Modal state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceFormName, setServiceFormName] = useState("");
  const [serviceFormDesc, setServiceFormDesc] = useState("");
  const [serviceFormDuration, setServiceFormDuration] = useState("45");
  const [serviceFormPrice, setServiceFormPrice] = useState("2500");
  const [serviceFormMeetingType, setServiceFormMeetingType] = useState<"video_call" | "in_person" | "phone_call">("video_call");

  const handleAppointmentIndustryChange = (newInd: AppointmentIndustry) => {
    setSelectedAppointmentIndustry(newInd);
    const presets = APPOINTMENT_SERVICE_PRESETS[newInd] || [];
    setAppointmentServices(
      presets.map((s, idx) => ({
        id: `srv_${idx}_${normalizeSlug(s.name)}`,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        isFreeConsultation: !!s.isFreeConsultation,
        meetingType: s.meetingType,
      }))
    );

    // Update practitioner role default
    switch (newInd) {
      case "Legal Practice & Advisory":
        setPractitionerRole("Senior Managing Counsel");
        setPractitionerName("Adv. Rajesh Iyer");
        break;
      case "Consulting & Strategy":
        setPractitionerRole("Principal Strategy Consultant");
        setPractitionerName("Ananya Deshmukh");
        break;
      case "Healthcare & Medical Clinic":
        setPractitionerRole("Attending Clinical Specialist");
        setPractitionerName("Dr. Vikram Malhotra");
        break;
      case "Salon, Spa & Wellness":
        setPractitionerRole("Master Stylist & Aesthetician");
        setPractitionerName("Meera Kapoor");
        break;
      default:
        setPractitionerRole("Lead Professional");
        setPractitionerName("Consultant");
    }
  };

  // Form State - Step 2: Website Design Template (Structural Architecture)
  const [selectedTemplateId, setSelectedTemplateId] = useState(DESIGN_TEMPLATES[0].id);
  const [templateFilter, setTemplateFilter] = useState("ALL");
  const [templateSearch, setTemplateSearch] = useState("");

  // Form State - Step 3: Colour Theme & Brand Identity (Visual Tokens)
  const [selectedThemeId, setSelectedThemeId] = useState(COLOR_THEMES[0].id);
  const [primaryColor, setPrimaryColor] = useState(COLOR_THEMES[0].tokens.primary);
  const [secondaryColor, setSecondaryColor] = useState(COLOR_THEMES[0].tokens.secondary);
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubheadline, setHeroSubheadline] = useState("");
  const [enabledSections, setEnabledSections] = useState<string[]>([
    "hero",
    "featured_products",
    "about",
    "newsletter",
    "footer",
  ]);
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const selectedDesignTemplate = useMemo(
    () => getDesignTemplateById(selectedTemplateId),
    [selectedTemplateId]
  );
  const selectedTheme = useMemo(
    () => getThemeById(selectedThemeId),
    [selectedThemeId]
  );

  // Form State - Step 4: Categories & Products
  const [categories, setCategories] = useState<CustomCategoryItem[]>(() => {
    return (INDUSTRY_CATEGORY_PRESETS["Home & Living"] || []).map((c, idx) => ({
      id: `cat_${idx}_${normalizeSlug(c.name)}`,
      name: c.name,
      slug: normalizeSlug(c.name),
      description: c.description,
      order: idx,
    }));
  });
  const [customProducts, setCustomProducts] = useState<CustomProductItem[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");
  const [productSearch, setProductSearch] = useState("");

  // Modals state for Category Management
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormName, setCategoryFormName] = useState("");
  const [categoryFormDescription, setCategoryFormDescription] = useState("");

  // Modals state for Product Creation/Editing
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodFormName, setProdFormName] = useState("");
  const [prodFormCategory, setProdFormCategory] = useState("");
  const [prodFormPrice, setProdFormPrice] = useState("");
  const [prodFormCompareAtPrice, setProdFormCompareAtPrice] = useState("");
  const [prodFormSku, setProdFormSku] = useState("");
  const [prodFormDescription, setProdFormDescription] = useState("");
  const [prodFormStockStatus, setProdFormStockStatus] = useState<"In Stock" | "Low Stock" | "Out of Stock">("In Stock");
  const [prodFormStatus, setProdFormStatus] = useState<"active" | "draft">("active");
  const [prodFormImageUrl, setProdFormImageUrl] = useState("");
  const [prodFormVariants, setProdFormVariants] = useState("");
  const [prodFormSpecs, setProdFormSpecs] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission, Creation Success & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdStore, setCreatedStore] = useState<Store | null>(null);
  const [copiedLocalUrl, setCopiedLocalUrl] = useState(false);
  const [copiedPathUrl, setCopiedPathUrl] = useState(false);

  // Quick Client Creation Modal
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientLead, setNewClientLead] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // "Other" Client selection state
  const [isOtherClientSelected, setIsOtherClientSelected] = useState(false);
  const [otherClientName, setOtherClientName] = useState("");
  const [otherClientLead, setOtherClientLead] = useState("");
  const [isSavingOtherClient, setIsSavingOtherClient] = useState(false);
  const [otherClientError, setOtherClientError] = useState<string | null>(null);
  const [otherClientSuccess, setOtherClientSuccess] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/templates"),
        ]);

        if (cRes.ok) {
          const cData = await cRes.json();
          setClients(cData.clients || []);
          if (cData.clients?.length > 0) {
            setSelectedClientId(cData.clients[0].id);
          }
        }

        if (tRes.ok) {
          const tData = await tRes.json();
          if (tData.designTemplates?.length > 0) {
            setSelectedTemplateId(tData.designTemplates[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading wizard resources:", err);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, []);

  // Sync categories when industry changes if user hasn't populated products
  const handleIndustryChange = (newIndustry: IndustryType) => {
    setSelectedIndustry(newIndustry);
    if (customProducts.length === 0) {
      const presets = INDUSTRY_CATEGORY_PRESETS[newIndustry] || [];
      setCategories(
        presets.map((c, idx) => ({
          id: `cat_${idx}_${normalizeSlug(c.name)}`,
          name: c.name,
          slug: normalizeSlug(c.name),
          description: c.description,
          order: idx,
        }))
      );
    }
  };

  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    if (!isSlugCustomized) {
      setSlug(normalizeSlug(val));
    }
    if (!heroHeadline) {
      setHeroHeadline(`Welcome to ${val}`);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    // Crucially: Independent customization systems. Template selection does NOT alter or reset colour theme!
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedThemeId(themeId);
    const th = getThemeById(themeId);
    setPrimaryColor(th.tokens.primary);
    setSecondaryColor(th.tokens.secondary);
    // Crucially: Independent customization systems. Colour theme selection does NOT alter or reset design template!
  };

  const toggleSection = (section: string) => {
    if (enabledSections.includes(section)) {
      setEnabledSections(enabledSections.filter((s) => s !== section));
    } else {
      setEnabledSections([...enabledSections, section]);
    }
  };

  const handleUploadBrandMedia = async (file: File, purpose: "logo" | "banner") => {
    setMediaUploadError(null);
    if (purpose === "logo") setIsUploadingLogo(true);
    else setIsUploadingBanner(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storeId", slug || "draft");
      formData.append("purpose", purpose);

      const res = await fetch("/api/products/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to upload ${purpose}.`);
      }

      const data = await res.json();
      if (purpose === "logo") {
        setLogoUrl(data.url);
      } else {
        setBannerUrl(data.url);
      }
    } catch (err) {
      setMediaUploadError(err instanceof Error ? err.message : `Failed to upload ${purpose}.`);
    } finally {
      if (purpose === "logo") setIsUploadingLogo(false);
      else setIsUploadingBanner(false);
    }
  };

  // --- Category Actions ---
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryFormName("");
    setCategoryFormDescription("");
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CustomCategoryItem) => {
    setEditingCategoryId(cat.id);
    setCategoryFormName(cat.name);
    setCategoryFormDescription(cat.description);
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryFormName.trim();
    if (!trimmed) return;

    if (editingCategoryId) {
      const oldCat = categories.find((c) => c.id === editingCategoryId);
      const oldName = oldCat?.name;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategoryId
            ? { ...c, name: trimmed, slug: normalizeSlug(trimmed), description: categoryFormDescription.trim() }
            : c
        )
      );
      // Update any products under this category
      if (oldName && oldName !== trimmed) {
        setCustomProducts((prev) =>
          prev.map((p) => (p.category === oldName ? { ...p, category: trimmed } : p))
        );
      }
    } else {
      const newCat: CustomCategoryItem = {
        id: `cat_${Date.now()}_${normalizeSlug(trimmed)}`,
        name: trimmed,
        slug: normalizeSlug(trimmed),
        description: categoryFormDescription.trim(),
        order: categories.length,
      };
      setCategories((prev) => [...prev, newCat]);
    }

    setCategoryModalOpen(false);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      if (activeCategoryFilter === catName) {
        setActiveCategoryFilter("ALL");
      }
    }
  };

  const handleResetToPresets = () => {
    if (confirm(`Reset categories to standard presets for ${selectedIndustry}?`)) {
      const presets = INDUSTRY_CATEGORY_PRESETS[selectedIndustry] || [];
      setCategories(
        presets.map((c, idx) => ({
          id: `cat_${idx}_${normalizeSlug(c.name)}`,
          name: c.name,
          slug: normalizeSlug(c.name),
          description: c.description,
          order: idx,
        }))
      );
    }
  };

  // --- Appointment Service Actions ---
  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceFormName("");
    setServiceFormDesc("");
    setServiceFormDuration("45");
    setServiceFormPrice("2500");
    setServiceFormMeetingType("video_call");
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (svc: CustomAppointmentServiceItem) => {
    setEditingServiceId(svc.id);
    setServiceFormName(svc.name);
    setServiceFormDesc(svc.description);
    setServiceFormDuration(String(svc.durationMinutes));
    setServiceFormPrice(String(svc.price));
    setServiceFormMeetingType(svc.meetingType);
    setServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormName.trim()) return;

    const dur = Math.max(5, Number(serviceFormDuration) || 30);
    const prc = Math.max(0, Number(serviceFormPrice) || 0);

    if (editingServiceId) {
      setAppointmentServices((prev) =>
        prev.map((s) =>
          s.id === editingServiceId
            ? {
                ...s,
                name: serviceFormName.trim(),
                description: serviceFormDesc.trim(),
                durationMinutes: dur,
                price: prc,
                isFreeConsultation: prc === 0,
                meetingType: serviceFormMeetingType,
              }
            : s
        )
      );
    } else {
      const newSvc: CustomAppointmentServiceItem = {
        id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: serviceFormName.trim(),
        description: serviceFormDesc.trim(),
        durationMinutes: dur,
        price: prc,
        isFreeConsultation: prc === 0,
        meetingType: serviceFormMeetingType,
      };
      setAppointmentServices((prev) => [...prev, newSvc]);
    }
    setServiceModalOpen(false);
  };

  const handleDeleteService = (svcId: string) => {
    setAppointmentServices((prev) => prev.filter((s) => s.id !== svcId));
  };

  const handleToggleDay = (dayIndex: number) => {
    setAppointmentWeeklyHours((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, isOpen: !day.isOpen } : day
      )
    );
  };

  const handleUpdateDayTime = (dayIndex: number, field: "openTime" | "closeTime", val: string) => {
    setAppointmentWeeklyHours((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, [field]: val } : day
      )
    );
  };

  // --- Product Actions ---
  const handleOpenAddProduct = (preferredCategory?: string) => {
    setEditingProductId(null);
    setProdFormName("");
    setProdFormCategory(
      preferredCategory && preferredCategory !== "ALL"
        ? preferredCategory
        : categories[0]?.name || selectedIndustry
    );
    setProdFormPrice("");
    setProdFormCompareAtPrice("");
    setProdFormSku("");
    setProdFormDescription("");
    setProdFormStockStatus("In Stock");
    setProdFormStatus("active");
    setProdFormImageUrl("");
    setProdFormVariants("");
    setProdFormSpecs("");
    setImageUploadError(null);
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: CustomProductItem) => {
    setEditingProductId(prod.id);
    setProdFormName(prod.name);
    setProdFormCategory(prod.category);
    setProdFormPrice(String(prod.price));
    setProdFormCompareAtPrice(prod.compareAtPrice ? String(prod.compareAtPrice) : "");
    setProdFormSku(prod.sku);
    setProdFormDescription(prod.description);
    setProdFormStockStatus(prod.stockStatus);
    setProdFormStatus(prod.status);
    setProdFormImageUrl(prod.imageUrl || "");
    setProdFormVariants(prod.variants ? prod.variants.join(", ") : "");
    setProdFormSpecs(
      prod.specifications
        ? Object.entries(prod.specifications)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
        : ""
    );
    setImageUploadError(null);
    setProductModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setImageUploadError("Unsupported image format. Allowed formats: JPG, PNG, WEBP, SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError("File size exceeds 5MB limit.");
      return;
    }

    setImageUploadError(null);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storeId", slug || "draft");
      formData.append("purpose", "product");

      const res = await fetch("/api/products/media", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProdFormImageUrl(data.url);
      } else {
        const err = await res.json();
        setImageUploadError(err.error || "Failed to upload image.");
      }
    } catch {
      // Local fallback preview using data url
      const reader = new FileReader();
      reader.onload = () => {
        setProdFormImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGenerateSku = () => {
    const prefix = normalizeSlug(slug || storeName || "STORE").substring(0, 4).toUpperCase();
    const catCode = normalizeSlug(prodFormCategory || "GEN").substring(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setProdFormSku(`${prefix}-${catCode}-${rand}`);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const name = prodFormName.trim();
    if (!name) return;

    const price = parseFloat(prodFormPrice);
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid positive product price.");
      return;
    }

    const compareAt = prodFormCompareAtPrice ? parseFloat(prodFormCompareAtPrice) : undefined;
    const variantsList = prodFormVariants
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const specsObj: Record<string, string> = {};
    if (prodFormSpecs.trim()) {
      prodFormSpecs.split("\n").forEach((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          specsObj[parts[0].trim()] = parts.slice(1).join(":").trim();
        }
      });
    }

    const finalSku =
      prodFormSku.trim() ||
      `${normalizeSlug(slug || "STR").substring(0, 4).toUpperCase()}-${normalizeSlug(
        prodFormCategory || "CAT"
      ).substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const colors = [
      "bg-emerald-100 text-emerald-800",
      "bg-amber-100 text-amber-800",
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-rose-100 text-rose-800",
      "bg-stone-100 text-stone-800",
    ];

    if (editingProductId) {
      setCustomProducts((prev) =>
        prev.map((p) =>
          p.id === editingProductId
            ? {
                ...p,
                name,
                category: prodFormCategory || categories[0]?.name || selectedIndustry,
                price,
                compareAtPrice: compareAt,
                sku: finalSku,
                description: prodFormDescription.trim() || `Curated piece from our collection.`,
                stockStatus: prodFormStockStatus,
                status: prodFormStatus,
                imageUrl: prodFormImageUrl.trim() || undefined,
                variants: variantsList.length > 0 ? variantsList : undefined,
                specifications: Object.keys(specsObj).length > 0 ? specsObj : undefined,
              }
            : p
        )
      );
    } else {
      const newProd: CustomProductItem = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        category: prodFormCategory || categories[0]?.name || selectedIndustry,
        price,
        compareAtPrice: compareAt,
        currency: "INR",
        sku: finalSku,
        description: prodFormDescription.trim() || `Curated piece from our collection.`,
        stockStatus: prodFormStockStatus,
        status: prodFormStatus,
        imageUrl: prodFormImageUrl.trim() || undefined,
        variants: variantsList.length > 0 ? variantsList : undefined,
        specifications: Object.keys(specsObj).length > 0 ? specsObj : undefined,
        thumbnailColor: colors[customProducts.length % colors.length],
      };
      setCustomProducts((prev) => [...prev, newProd]);
    }

    setProductModalOpen(false);
  };

  const handleDeleteProduct = (prodId: string) => {
    if (confirm("Remove this product from the demo catalog?")) {
      setCustomProducts((prev) => prev.filter((p) => p.id !== prodId));
    }
  };

  // Quick Starter Sample Catalog Generator
  const handleGenerateStarterProducts = () => {
    const colors = [
      "bg-emerald-100 text-emerald-800",
      "bg-amber-100 text-amber-800",
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-rose-100 text-rose-800",
      "bg-stone-100 text-stone-800",
    ];

    const starterItems: CustomProductItem[] = [];
    categories.forEach((cat, idx) => {
      starterItems.push({
        id: `prod_start_${idx}_1_${Date.now()}`,
        name: `Heritage ${cat.name} Piece I`,
        category: cat.name,
        price: 1499 + idx * 500,
        compareAtPrice: 1999 + idx * 500,
        currency: "INR",
        sku: `${normalizeSlug(slug || "STR").substring(0, 4).toUpperCase()}-${normalizeSlug(cat.name).substring(0, 3).toUpperCase()}-101`,
        description: `Signature design tailored for ${cat.name.toLowerCase()} connoisseurs with premium materials.`,
        stockStatus: "In Stock",
        status: "active",
        variants: ["Standard", "Refined Edition"],
        specifications: { Origin: "Artisanal Crafted", Warranty: "2-Year Guarantee" },
        thumbnailColor: colors[idx % colors.length],
      });
      starterItems.push({
        id: `prod_start_${idx}_2_${Date.now()}`,
        name: `Modern ${cat.name} Essential II`,
        category: cat.name,
        price: 2499 + idx * 400,
        currency: "INR",
        sku: `${normalizeSlug(slug || "STR").substring(0, 4).toUpperCase()}-${normalizeSlug(cat.name).substring(0, 3).toUpperCase()}-102`,
        description: `Contemporary minimalist aesthetic with precision engineering and sustainable materials.`,
        stockStatus: idx % 2 === 0 ? "In Stock" : "Low Stock",
        status: "active",
        variants: ["Small", "Large"],
        specifications: { Material: "Sustainable Composite", Grade: "Grade A" },
        thumbnailColor: colors[(idx + 2) % colors.length],
      });
    });

    setCustomProducts((prev) => [...prev, ...starterItems]);
  };

  // Filtered products in Step 4
  const filteredStep4Products = useMemo(() => {
    return customProducts.filter((p) => {
      const matchesCat =
        activeCategoryFilter === "ALL" ||
        p.category.toLowerCase() === activeCategoryFilter.toLowerCase();
      const matchesSearch =
        !productSearch ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [customProducts, activeCategoryFilter, productSearch]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Validation
  const validateStep1 = () => {
    if (!storeName || storeName.trim().length < 2) {
      setFormError("Store name must be at least 2 characters.");
      return false;
    }
    const slugVal = validateSlug(slug);
    if (!slugVal.valid) {
      setFormError(slugVal.error || "Invalid slug.");
      return false;
    }
    if (!selectedClientId) {
      setFormError("Please select a client account.");
      return false;
    }
    setFormError(null);
    return true;
  };

  const validateStep2 = () => {
    if (websiteType === "appointments" && !selectedAppointmentIndustry) {
      setFormError("Please select a professional practice category.");
      return false;
    }
    if (websiteType !== "appointments" && !selectedIndustry) {
      setFormError("Please select an industry sector.");
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setFormError(null);
    try {
      const activeIndustry = websiteType === "appointments" ? selectedAppointmentIndustry : selectedIndustry;
      const profile: BusinessProfile = {
        businessName: storeName.trim(),
        industry: activeIndustry,
        businessCategory: businessCategory.trim() || activeIndustry,
        description: description.trim(),
        location: businessLocation.trim() || undefined,
        primaryAudience: primaryAudience.trim() || undefined,
        customerNeeds: customerNeeds ? customerNeeds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        differentiators: differentiators ? differentiators.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        websiteType,
        appointmentIndustry: websiteType === "appointments" ? selectedAppointmentIndustry : undefined,
        visualStyle,
        brandPersonality,
        typographyPreference,
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
      };

      const res = await fetch("/api/generation/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPlan(data.plan);
        if (data.plan.designSystem) {
          const ds = data.plan.designSystem;
          setSelectedTemplateId(ds.templateId);
          setSelectedThemeId(ds.themeId);
          setHeroHeadline(ds.heroHeadline);
          setHeroSubheadline(ds.heroSubheadline);
        }
        const initialEnabled: Record<string, boolean> = {};
        for (const rec of data.plan.recommendedSections) {
          initialEnabled[rec.type] = rec.enabledByDefault;
        }
        setEnabledPlanSections(initialEnabled);
      } else {
        const mock = new MockGenerationProvider();
        const plan = await mock.generatePlan(profile);
        setGeneratedPlan({
          businessProfile: profile,
          recommendedTemplateId: plan.designSystem.templateId,
          recommendedThemeId: plan.designSystem.themeId,
          recommendedStyling: plan.designSystem.styling as Record<string, unknown>,
          recommendedSections: plan.recommendedSections,
          contentPlan: {
            heroHeadline: plan.designSystem.heroHeadline,
            heroSubheadline: plan.designSystem.heroSubheadline,
            primaryCtaText: plan.designSystem.ctaText,
            primaryCtaUrl: plan.designSystem.ctaUrl,
            aboutHeadline: `About ${profile.businessName}`,
            aboutBody: plan.designSystem.aboutText,
            keyBenefits: [
              { title: "Online Inquiries", description: "Direct inquiry submission through the website." },
              { title: "Service Information", description: "Structured details of available services." },
              { title: "Catalog Access", description: "Browse offerings and schedule consultations online." },
            ],
            faqs: [
              { question: "How do we get started?", answer: "Submit an inquiry or book an initial consultation." },
            ],
          },
        });
        setSelectedTemplateId(plan.designSystem.templateId);
        setSelectedThemeId(plan.designSystem.themeId);
        setHeroHeadline(plan.designSystem.heroHeadline);
        setHeroSubheadline(plan.designSystem.heroSubheadline);
        const initialEnabled: Record<string, boolean> = {};
        for (const rec of plan.recommendedSections) {
          initialEnabled[rec.type] = rec.enabledByDefault;
        }
        setEnabledPlanSections(initialEnabled);
      }
    } catch {
      const activeIndustry = websiteType === "appointments" ? selectedAppointmentIndustry : selectedIndustry;
      const profile: BusinessProfile = {
        businessName: storeName.trim(),
        industry: activeIndustry,
        businessCategory: businessCategory.trim() || activeIndustry,
        description: description.trim(),
        websiteType,
      };
      const mock = new MockGenerationProvider();
      const plan = await mock.generatePlan(profile);
      setGeneratedPlan({
        businessProfile: profile,
        recommendedTemplateId: plan.designSystem.templateId,
        recommendedThemeId: plan.designSystem.themeId,
        recommendedStyling: plan.designSystem.styling as Record<string, unknown>,
        recommendedSections: plan.recommendedSections,
        contentPlan: {
          heroHeadline: plan.designSystem.heroHeadline,
          heroSubheadline: plan.designSystem.heroSubheadline,
          primaryCtaText: plan.designSystem.ctaText,
          primaryCtaUrl: plan.designSystem.ctaUrl,
          aboutHeadline: `About ${profile.businessName}`,
          aboutBody: plan.designSystem.aboutText,
          keyBenefits: [
            { title: "Online Inquiries", description: "Direct inquiry submission through the website." },
            { title: "Service Information", description: "Structured details of available services." },
            { title: "Catalog Access", description: "Browse offerings and schedule consultations online." },
          ],
          faqs: [
            { question: "How do we get started?", answer: "Submit an inquiry or book an initial consultation." },
          ],
        },
      });
      setSelectedTemplateId(plan.designSystem.templateId);
      setSelectedThemeId(plan.designSystem.themeId);
      setHeroHeadline(plan.designSystem.heroHeadline);
      setHeroSubheadline(plan.designSystem.heroSubheadline);
      const initialEnabled: Record<string, boolean> = {};
      for (const rec of plan.recommendedSections) {
        initialEnabled[rec.type] = rec.enabledByDefault;
      }
      setEnabledPlanSections(initialEnabled);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (isOtherClientSelected) {
        if (!otherClientName.trim()) {
          setFormError("Please enter a new client account name or select an existing client.");
          return;
        }
        const saved = await handleSaveOtherClient();
        if (!saved) return;
      }
      if (!validateStep1()) return;
    }
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3) {
      await handleGeneratePlan();
    }
    setFormError(null);
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleBack = () => {
    setFormError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  // Final submission
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const activeIndustry = websiteType === "appointments" ? selectedAppointmentIndustry : selectedIndustry;
      const profile: BusinessProfile = {
        businessName: storeName.trim(),
        industry: activeIndustry,
        businessCategory: businessCategory.trim() || activeIndustry,
        description: description.trim(),
        location: businessLocation.trim() || undefined,
        primaryAudience: primaryAudience.trim() || undefined,
        customerNeeds: customerNeeds ? customerNeeds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        differentiators: differentiators ? differentiators.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        websiteType,
        appointmentIndustry: websiteType === "appointments" ? selectedAppointmentIndustry : undefined,
        visualStyle,
        brandPersonality,
        typographyPreference,
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        aboutStory: description.trim(),
        generationMetadata: {
          generatedAt: new Date().toISOString(),
          engineVersion: "16.0.0",
          provider: "mock_deterministic_v1",
          isRegenerated: false,
        },
      };

      // Generate context-aware sections from active recommendations
      const contentGen = new ContentGenerator();
      const recsToUse = (generatedPlan?.recommendedSections || []).filter(
        (r) => enabledPlanSections[r.type] !== false
      );
      const finalSections = recsToUse.map((rec, idx) =>
        contentGen.generateSectionContent(
          profile,
          rec.type as SectionType,
          idx
        )
      );

      // Map categories to StoreCategory type
      const storeCats: StoreCategory[] = categories.map((c, idx) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        order: idx,
      }));

      const payload = {
        name: storeName.trim(),
        slug: normalizeSlug(slug),
        clientId: selectedClientId,
        industry: websiteType === "appointments" ? "Health & Wellness" : selectedIndustry,
        websiteType,
        appointmentIndustry: websiteType === "appointments" ? selectedAppointmentIndustry : undefined,
        leadTemplateId: websiteType === "lead_gen" ? selectedLeadTemplateId : undefined,
        leadFormTitle: websiteType === "lead_gen" ? leadFormCustomTitle : undefined,
        templateId: selectedTemplateId,
        themeId: selectedThemeId,
        themeName: selectedTheme.name,
        description: description.trim(),
        sections: finalSections.length > 0 ? finalSections : undefined,
        businessProfile: profile,
        version: 1,
        branding: {
          primaryColor,
          secondaryColor,
          fontFamily,
          heroHeadline:
            heroHeadline ||
            (websiteType === "appointments"
              ? "Professional Advisory & Strategic Consultation"
              : websiteType === "lead_gen"
              ? "Strategic Solutions & Dedicated Advisory"
              : `Welcome to ${storeName}`),
          heroSubheadline:
            heroSubheadline ||
            (websiteType === "appointments"
              ? `Professional ${selectedAppointmentIndustry} consultations & advisory.`
              : websiteType === "lead_gen"
              ? "Submit your inquiry to receive a tailored proposal and strategic consultation from our team."
              : `Curated ${selectedIndustry} collection.`),
          ctaText:
            websiteType === "appointments"
              ? "Book Consultation"
              : websiteType === "lead_gen"
              ? "Request Consultation"
              : "Explore Catalog",
          logoUrl: logoUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
        },
        enabledSections:
          enabledSections.length > 0
            ? enabledSections
            : websiteType === "appointments"
            ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
            : websiteType === "lead_gen"
            ? ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
            : ["hero", "featured_products", "about", "newsletter", "footer"],
        orderedSections:
          websiteType === "appointments"
            ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
            : websiteType === "lead_gen"
            ? ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
            : ["hero", "featured_products", "about", "newsletter", "footer"],
        categories: websiteType === "ecommerce" ? storeCats : [],
        products: websiteType === "ecommerce" ? customProducts : [],
        appointmentConfig:
          websiteType === "appointments"
            ? {
                timezone: appointmentTimezone,
                slotIntervalMinutes: 15,
                bufferMinutes: appointmentBufferMinutes,
                minNoticeHours: appointmentMinNoticeHours,
                maxAdvanceDays: appointmentMaxAdvanceDays,
                weeklyHours: appointmentWeeklyHours,
                cancellationPolicy: {
                  allowed: true,
                  noticeHours: appointmentNoticeHours,
                  policyText: `Appointments may be cancelled online up to ${appointmentNoticeHours} hours before scheduled start.`,
                },
                requireApproval: appointmentRequireApproval,
                meetingLocation: appointmentMeetingLocation.trim() || undefined,
              }
            : undefined,
        initialServices:
          websiteType === "appointments"
            ? appointmentServices.map((s, idx) => ({
                name: s.name,
                description: s.description,
                durationMinutes: s.durationMinutes,
                price: s.price,
                currency: "INR",
                category: selectedAppointmentIndustry,
                meetingType: s.meetingType,
                isActive: true,
                order: idx,
              }))
            : undefined,
        initialProviders:
          websiteType === "appointments" && practitionerName.trim()
            ? [
                {
                  name: practitionerName.trim(),
                  role: practitionerRole.trim() || "Lead Professional",
                  bio: `Experienced specialist offering client advisory and consultations.`,
                  email: practitionerEmail.trim() || undefined,
                  isActive: true,
                },
              ]
            : undefined,
      };

      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedStore(data.store);
        setIsSubmitting(false);
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to generate storefront.");
        setIsSubmitting(false);
      }
    } catch {
      setFormError("Network error while creating store.");
      setIsSubmitting(false);
    }
  };

  // Quick Client creation handler
  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientCompany) return;
    setIsCreatingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: newClientCompany,
          name: newClientLead || "Primary Contact",
          industry: selectedIndustry,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setClients([data.client, ...clients]);
        setSelectedClientId(data.client.id);
        setQuickClientModalOpen(false);
        setNewClientCompany("");
        setNewClientLead("");
      }
    } catch (err) {
      console.error("Failed to create client:", err);
    } finally {
      setIsCreatingClient(false);
    }
  };

  // "Other" Client save and selection handler
  const handleSaveOtherClient = async (): Promise<boolean> => {
    const trimmed = otherClientName.trim();
    if (trimmed.length < 2) {
      setOtherClientError("Client account name must be at least 2 characters.");
      return false;
    }
    if (trimmed.length > 100) {
      setOtherClientError("Client account name must not exceed 100 characters.");
      return false;
    }

    // Pre-check duplicate in loaded clients list
    const existingLocal = clients.find(
      (c) => c.company.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existingLocal) {
      setSelectedClientId(existingLocal.id);
      setIsOtherClientSelected(false);
      setOtherClientName("");
      setOtherClientLead("");
      setOtherClientError(null);
      setOtherClientSuccess(`Found existing account "${existingLocal.company}" and selected it.`);
      return true;
    }

    setIsSavingOtherClient(true);
    setOtherClientError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: trimmed,
          name: otherClientLead.trim() || "Account Lead",
          industry: websiteType === "appointments" ? selectedAppointmentIndustry : selectedIndustry,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.client) {
          if (!clients.some((c) => c.id === data.client.id)) {
            setClients([data.client, ...clients]);
          }
          setSelectedClientId(data.client.id);
          setIsOtherClientSelected(false);
          setOtherClientName("");
          setOtherClientLead("");
          setOtherClientSuccess(`Selected existing account "${data.client.company}".`);
          return true;
        }
        throw new Error(data.error || "Failed to create client account.");
      }

      setClients([data.client, ...clients]);
      setSelectedClientId(data.client.id);
      setIsOtherClientSelected(false);
      setOtherClientName("");
      setOtherClientLead("");
      setOtherClientSuccess(`Account "${data.client.company}" created and selected.`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtherClientError(msg);
      return false;
    } finally {
      setIsSavingOtherClient(false);
    }
  };

  // CREATION SUCCESS SCREEN
  if (createdStore) {
    const localUrl = createdStore.localUrl || getStoreLocalSubdomainUrl(createdStore.slug);
    const pathUrl = getStorePathUrl(createdStore.slug);

    const handleCopyLocalUrl = async () => {
      try {
        await navigator.clipboard.writeText(localUrl);
        setCopiedLocalUrl(true);
        setTimeout(() => setCopiedLocalUrl(false), 2000);
      } catch {
        // Fallback
      }
    };

    const handleCopyPathUrl = async () => {
      try {
        await navigator.clipboard.writeText(pathUrl);
        setCopiedPathUrl(true);
        setTimeout(() => setCopiedPathUrl(false), 2000);
      } catch {
        // Fallback
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto py-4">
        <div className="flex items-center gap-3">
          <Link href="/stores">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              All Stores
            </Button>
          </Link>
        </div>

        <Card className="border-[#C8E8D5] shadow-md overflow-hidden">
          <div className="bg-[#E2F5E9] border-b border-[#C8E8D5] p-6 text-center">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-[#176B4D] items-center justify-center text-white mb-3 shadow-xs">
              <Sparkles className="h-6 w-6 text-emerald-200" />
            </div>
            <h2 className="text-xl font-bold text-[#18231E]">Storefront Generated Successfully!</h2>
            <p className="text-xs text-[#4F5D56] mt-1 max-w-md mx-auto">
              Your demonstration store with organized category catalog has been persisted and assigned a dedicated local hostname.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E9E5]">
              <div>
                <span className="text-[11px] font-semibold text-[#66736C] uppercase tracking-wider block mb-1">
                  Store Name
                </span>
                <span className="text-sm font-bold text-[#18231E]">{createdStore.name}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#66736C] uppercase tracking-wider block mb-1">
                  Store Slug
                </span>
                <span className="text-xs font-mono font-medium text-[#176B4D] bg-[#E2F5E9] px-2 py-0.5 rounded border border-[#C8E8D5]">
                  {createdStore.slug}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#66736C] uppercase tracking-wider block mb-1">
                  Catalog Size
                </span>
                <span className="text-xs font-semibold text-[#18231E]">
                  {createdStore.productCount || customProducts.length} Items across {categories.length} Categories
                </span>
              </div>
            </div>

            {/* Local Hostname Subdomain Card */}
            <div className="p-4 rounded-xl border border-[#C8E8D5] bg-[#E2F5E9]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#176B4D] flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="h-2 w-2 rounded-full bg-[#176B4D] animate-pulse" />
                  Local Subdomain Hostname (RFC 6761)
                </span>
                <span className="text-[10px] font-mono text-[#66736C] bg-white px-2 py-0.5 rounded border border-[#C8E8D5]">
                  Recommended
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-white border border-[#C8E8D5] rounded-lg px-3.5 py-2.5 font-mono text-sm text-[#18231E] select-all break-all shadow-2xs">
                  {localUrl}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLocalUrl}
                    leftIcon={copiedLocalUrl ? <Check className="h-3.5 w-3.5 text-[#176B4D]" /> : <Copy className="h-3.5 w-3.5" />}
                  >
                    {copiedLocalUrl ? "Copied!" : "Copy Link"}
                  </Button>
                  <a href={localUrl} target="_blank" rel="noopener noreferrer">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                    >
                      Open Store
                    </Button>
                  </a>
                </div>
              </div>

              <p className="text-[11px] text-[#66736C]">
                Resolves the storefront directly through its local subdomain hostname.
              </p>
            </div>

            {/* Path-based Alternative Card */}
            <div className="p-4 rounded-xl border border-[#E4E9E5] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#66736C]">
                  Path-based Alternative (Main Origin)
                </span>
                <span className="text-[10px] font-mono text-[#909D96]">Fallback URL</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-[#FAF9F6] border border-[#E4E9E5] rounded-lg px-3 py-1.5 font-mono text-xs text-[#4F5D56] select-all break-all">
                  {pathUrl}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPathUrl}
                  leftIcon={copiedPathUrl ? <Check className="h-3.5 w-3.5 text-[#176B4D]" /> : <Copy className="h-3.5 w-3.5" />}
                >
                  {copiedPathUrl ? "Copied!" : "Copy"}
                </Button>
                <a href={pathUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                  >
                    Open
                  </Button>
                </a>
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E4E9E5]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreatedStore(null);
                  setCurrentStep(1);
                  setStoreName("");
                  setSlug("");
                  setIsSlugCustomized(false);
                  setCustomProducts([]);
                }}
              >
                Create Another Store
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link href="/stores" className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" className="w-full">
                    Stores Directory
                  </Button>
                </Link>
                <Link href={`/stores/${createdStore.id}/preview`} className="flex-1 sm:flex-none">
                  <Button variant="primary" size="sm" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Open Visual Customizer
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <Link href="/stores">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Stores
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Store Generation Wizard"
        description="Configure client requirements, brand styling, categories, and inventory to generate a demonstration storefront."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            Step {currentStep} of 5
          </span>
        }
      />

      {/* Wizard Step Progression Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E4E9E5] overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] gap-2">
          {[
            { step: 1, title: "Objective & Details", icon: Building2 },
            { step: 2, title: "Business Profile", icon: Layers },
            { step: 3, title: "Brand Direction", icon: Palette },
            { step: 4, title: "AI Plan & Structure", icon: Sparkles },
            { step: 5, title: "Review & Launch", icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div
                key={item.step}
                className={cn(
                  "flex items-center gap-2.5 flex-1 select-none",
                  item.step < 5 && "border-r border-[#F0F4F1] pr-3"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                    isDone
                      ? "bg-[#16804A] text-white"
                      : isCurrent
                      ? "bg-[#176B4D] text-white ring-2 ring-[#E2F5E9]"
                      : "bg-[#F0F4F1] text-[#66736C]"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-semibold truncate",
                      isCurrent ? "text-[#176B4D]" : "text-[#4F5D56]"
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="text-[10px] text-[#909D96]">
                    {isDone ? "Completed" : isCurrent ? "Active" : "Upcoming"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isLoadingData && (
        <div className="p-3 bg-[#E2F5E9] border border-[#C8E8D5] rounded-lg text-xs text-[#176B4D] flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-spin shrink-0" />
          <span>Loading client directory, templates, and catalog presets...</span>
        </div>
      )}

      {formError && (
        <div className="p-3.5 rounded-lg bg-[#FDEAEA] border border-[#F7BCBC] text-xs text-[#C43D3D] flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Step Views */}
      <div className="space-y-6">
        {/* STEP 1: CLIENT & DETAILS */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Step 1: Client Account & Store Details</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Link the new demo storefront to a client portfolio and set the primary URL slug.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Website Type Selection */}
              <div className="space-y-2 max-w-2xl">
                <label className="text-xs font-semibold text-[#18231E]">
                  Website Generation Category <span className="text-[#C43D3D]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setWebsiteType("ecommerce")}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      websiteType === "ecommerce"
                        ? "border-[#176B4D] bg-[#E2F5E9]/40 shadow-xs"
                        : "border-[#E4E9E5] hover:border-stone-400 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#18231E]">E-Commerce</span>
                      <Package className="h-4 w-4 text-[#176B4D]" />
                    </div>
                    <p className="text-[11px] text-[#66736C]">
                      Product catalogs, categories, multi-variant shopping bag, and checkout.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWebsiteType("appointments")}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      websiteType === "appointments"
                        ? "border-[#176B4D] bg-[#E2F5E9]/40 shadow-xs"
                        : "border-[#E4E9E5] hover:border-stone-400 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#18231E]">Appointments</span>
                      <CalendarIcon className="h-4 w-4 text-[#176B4D]" />
                    </div>
                    <p className="text-[11px] text-[#66736C]">
                      Services, practitioners, operating hours, and live booking calendar.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWebsiteType("lead_gen")}
                    className={cn(
                      "p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                      websiteType === "lead_gen"
                        ? "border-[#176B4D] bg-[#E2F5E9]/40 shadow-xs"
                        : "border-[#E4E9E5] hover:border-stone-400 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#18231E]">Lead Generation</span>
                      <Sparkles className="h-4 w-4 text-[#176B4D]" />
                    </div>
                    <p className="text-[11px] text-[#66736C]">
                      Custom form builder, multi-step capture funnels, and integrated CRM pipeline.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Client Account <span className="text-[#C43D3D]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickClientModalOpen(true)}
                    className="text-[11px] text-[#176B4D] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Quick Add Client</span>
                  </button>
                </div>
                <select
                  value={isOtherClientSelected ? "__other__" : selectedClientId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__other__") {
                      setIsOtherClientSelected(true);
                      setOtherClientError(null);
                      setOtherClientSuccess(null);
                    } else {
                      setIsOtherClientSelected(false);
                      setSelectedClientId(val);
                      setOtherClientError(null);
                    }
                  }}
                  className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} ({c.name} — {c.industry})
                    </option>
                  ))}
                  <option value="__other__">+ Other (Create new client account...)</option>
                </select>

                {isOtherClientSelected && (
                  <div className="mt-2.5 max-w-lg rounded-xl border border-[#176B4D]/30 bg-[#F4F9F6] p-3.5 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#176B4D] flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#176B4D]" />
                        <span>Add New Client Account</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtherClientSelected(false);
                          setOtherClientError(null);
                          if (clients.length > 0 && (!selectedClientId || selectedClientId === "__other__")) {
                            setSelectedClientId(clients[0].id);
                          }
                        }}
                        className="text-[11px] text-[#66736C] hover:text-[#18231E] underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#18231E] block">
                        Account / Company Name <span className="text-[#C43D3D]">*</span>
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={otherClientName}
                        onChange={(e) => {
                          setOtherClientName(e.target.value);
                          setOtherClientError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveOtherClient();
                          }
                        }}
                        placeholder="e.g. Apex Strategic Partners"
                        maxLength={100}
                        className="w-full rounded-lg border border-[#E4E9E5] bg-white px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                      />
                      <div className="flex justify-between text-[10px] text-[#66736C]">
                        <span>Must be between 2 and 100 characters.</span>
                        <span>{otherClientName.trim().length}/100</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#18231E] block">
                        Primary Contact / Account Lead <span className="text-[#66736C] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={otherClientLead}
                        onChange={(e) => setOtherClientLead(e.target.value)}
                        placeholder="e.g. Jordan Hayes (Managing Partner)"
                        maxLength={80}
                        className="w-full rounded-lg border border-[#E4E9E5] bg-white px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                      />
                    </div>

                    {otherClientError && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                        <span className="flex-1">{otherClientError}</span>
                      </div>
                    )}

                    <div className="pt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        isLoading={isSavingOtherClient}
                        onClick={handleSaveOtherClient}
                        className="text-xs bg-[#176B4D] hover:bg-[#12533B]"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Save & Select Account
                      </Button>
                    </div>
                  </div>
                )}

                {otherClientSuccess && (
                  <div className="max-w-lg p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{otherClientSuccess}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#18231E]">
                  Storefront Name <span className="text-[#C43D3D]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  placeholder="e.g. Lumina Atelier Living"
                  className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#18231E]">
                  Store Subdomain & URL Slug <span className="text-[#C43D3D]">*</span>
                </label>
                <div className="flex items-center max-w-lg">
                  <span className="px-3 py-2 bg-[#F0F4F1] border border-r-0 border-[#E4E9E5] rounded-l-lg text-xs text-[#66736C] font-mono select-none">
                    http://
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => {
                      setSlug(normalizeSlug(e.target.value));
                      setIsSlugCustomized(true);
                    }}
                    placeholder="lumina-atelier-living"
                    className="w-full border-y border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] font-mono focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                  <span className="px-3 py-2 bg-[#F0F4F1] border border-l-0 border-[#E4E9E5] rounded-r-lg text-xs text-[#66736C] font-mono select-none">
                    .localhost:3000
                  </span>
                </div>
                <div className="flex items-center justify-between max-w-lg text-[11px] text-[#66736C]">
                  <span>Local Subdomain: <strong className="font-mono text-[#176B4D]">http://{slug || "store-slug"}.localhost:3000</strong></span>
                  <span>Path: <span className="font-mono text-[#4F5D56]">/store/{slug || "slug"}</span></span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: BUSINESS PROFILE & CONTEXT */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Step 2: Business Profile &amp; Audience Context</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Define your business category, target customer profile, and key differentiators to guide context-aware generation.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {websiteType === "appointments" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Professional Practice Category <span className="text-[#C43D3D]">*</span>
                  </label>
                  <select
                    value={selectedAppointmentIndustry}
                    onChange={(e) => handleAppointmentIndustryChange(e.target.value as AppointmentIndustry)}
                    className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  >
                    {APPOINTMENT_INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#66736C]">
                    Configures tailored consultation services, practitioner presets, and booking workflows.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Industry Sector <span className="text-[#C43D3D]">*</span>
                  </label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => handleIndustryChange(e.target.value as IndustryType)}
                    className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  >
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#66736C]">
                    Choosing an industry auto-configures tailored category suggestions.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#18231E]">
                  Specific Business Specialization / Category
                </label>
                <input
                  type="text"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  placeholder="e.g. Corporate Governance &amp; Commercial Litigation, Artisanal Sourdough Bakery, High-Performance Strength Studio"
                  className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
                <p className="text-[11px] text-[#66736C]">
                  Specifying your niche allows the engine to tailor headlines, value propositions, and FAQs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Target Audience / Client Group
                  </label>
                  <input
                    type="text"
                    value={primaryAudience}
                    onChange={(e) => setPrimaryAudience(e.target.value)}
                    placeholder="e.g. In-house legal counsel &amp; founders"
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Business Location <span className="text-[#66736C] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                    placeholder="e.g. Mumbai, India"
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-w-lg">
                <label className="text-xs font-semibold text-[#18231E]">
                  Customer Needs &amp; Problems Solved
                </label>
                <input
                  type="text"
                  value={customerNeeds}
                  onChange={(e) => setCustomerNeeds(e.target.value)}
                  placeholder="e.g. Fast contract review, proactive risk mitigation, transparent fees"
                  className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
                <p className="text-[11px] text-[#66736C]">Comma-separated key problems your clients face.</p>
              </div>

              <div className="space-y-1.5 max-w-lg">
                <label className="text-xs font-semibold text-[#18231E]">
                  Key Differentiators &amp; Value Commitments
                </label>
                <input
                  type="text"
                  value={differentiators}
                  onChange={(e) => setDifferentiators(e.target.value)}
                  placeholder="e.g. Direct senior partner involvement, zero hidden retainers"
                  className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
                <p className="text-[11px] text-[#66736C]">What sets your business apart from competitors.</p>
              </div>

              <div className="space-y-1.5 max-w-lg">
                <label htmlFor="store-pitch-description" className="block text-xs font-semibold text-[#18231E]">
                  Business Description / Mission Statement
                </label>
                <textarea
                  id="store-pitch-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize your business background, core services, and operating philosophy..."
                  className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: BRAND DIRECTION & DESIGN ARCHITECTURE */}
        {currentStep === 3 && (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Step 3: Brand Direction &amp; Visual Identity</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Select your aesthetic archetype, brand personality, color theme, and media assets.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#176B4D] bg-[#E2F5E9] px-2.5 py-1 rounded-full border border-[#C8E8D5]">
                  8 Architectural Styles &amp; 12 Themes
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual Style Archetype Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#18231E]">
                  Visual Style Archetype
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "modern_minimal", label: "Modern Minimal", desc: "Airy whitespace & clean geometry" },
                    { id: "luxury_refined", label: "Luxury Refined", desc: "Serif typography & hairline dividers" },
                    { id: "bold_assertive", label: "Bold & Assertive", desc: "High-contrast blocks & energy" },
                    { id: "organic_warm", label: "Organic Warm", desc: "Soft surfaces & natural textures" },
                    { id: "tech_futuristic", label: "Tech & Futuristic", desc: "Telemetry HUD & precision grids" },
                    { id: "classic_corporate", label: "Classic Corporate", desc: "Structured clarity & trust" },
                    { id: "editorial_story", label: "Editorial Story", desc: "Narrative cover & magazine style" },
                    { id: "playful_vibrant", label: "Playful & Vibrant", desc: "Neo-brutalist charm & stickers" },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setVisualStyle(style.id as VisualStylePreference)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                        visualStyle === style.id
                          ? "border-[#176B4D] bg-[#E2F5E9]/40 shadow-xs"
                          : "border-[#E4E9E5] bg-white hover:border-[#CCD5CE]"
                      )}
                    >
                      <span className="text-xs font-bold text-[#18231E] block">{style.label}</span>
                      <span className="text-[10px] text-[#66736C] block mt-0.5">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Personality Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#18231E]">
                  Brand Personality
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "professional",
                    "innovative",
                    "artisanal",
                    "authoritative",
                    "compassionate",
                    "playful",
                    "minimalist",
                  ].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setBrandPersonality(p as BrandPersonality)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium capitalize cursor-pointer transition-colors border",
                        brandPersonality === p
                          ? "bg-[#176B4D] text-white border-[#176B4D]"
                          : "bg-white text-[#4F5D56] border-[#E4E9E5] hover:border-[#CCD5CE]"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Design Template Architectural Style Selection */}
              <div className="pt-2 border-t border-[#F0F4F1] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                      Website Design Template Architecture
                    </h4>
                    <p className="text-xs text-[#66736C] mt-0.5">
                      Choose from 8 distinct visual storefront architectures.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#176B4D] bg-[#E2F5E9] px-2.5 py-1 rounded-full border border-[#C8E8D5]">
                    8 Architectural Styles
                  </span>
                </div>
              </div>

              {/* Category / Industry Filter for Templates */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF9F6] p-3 rounded-xl border border-[#E4E9E5]">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                  {["ALL", "Home & Living", "Luxury Goods", "Sports & Outdoors", "Food & Gourmet", "Fashion & Apparel", "Beauty & Cosmetics", "Electronics & Gadgets"].map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => setTemplateFilter(ind)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors border",
                        templateFilter === ind
                          ? "bg-[#176B4D] text-white border-[#176B4D]"
                          : "bg-white text-[#4F5D56] border-[#E4E9E5] hover:border-[#CCD5CE]"
                      )}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Filter designs by name..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full sm:w-56 text-xs px-3 py-1.5 rounded-lg border border-[#E4E9E5] bg-white text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
              </div>

              {/* Design Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {DESIGN_TEMPLATES.filter((tpl) => {
                  const matchInd =
                    templateFilter === "ALL" ||
                    tpl.compatibleIndustries.includes(templateFilter as IndustryType);
                  const matchSearch =
                    !templateSearch ||
                    tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                    tpl.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
                    tpl.layoutFamily.toLowerCase().includes(templateSearch.toLowerCase());
                  return matchInd && matchSearch;
                }).map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleTemplateSelect(tpl.id)}
                      className={cn(
                        "rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between group",
                        isSelected
                          ? "border-[#176B4D] bg-[#E2F5E9]/30 ring-2 ring-[#176B4D]"
                          : "border-[#E4E9E5] bg-white hover:border-[#CCD5CE] hover:shadow-xs"
                      )}
                    >
                      <div>
                        {/* Miniature Wireframe Gradient Thumbnail */}
                        <div
                          className={cn(
                            "h-28 rounded-lg bg-gradient-to-br mb-3 p-3 flex flex-col justify-between relative overflow-hidden",
                            tpl.thumbnailGradient
                          )}
                        >
                          <div className="flex items-center justify-between z-10">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/95 text-[#18231E] shadow-2xs">
                              {tpl.layoutFamily}
                            </span>
                            {tpl.featured && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#176B4D] text-white shadow-2xs">
                                Popular
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-[#18231E] group-hover:text-[#176B4D]">
                              {tpl.name}
                            </h4>
                            {isSelected && (
                              <span className="h-5 w-5 rounded-full bg-[#176B4D] text-white flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-[#176B4D]">
                            {tpl.tagline}
                          </p>
                          <p className="text-xs text-[#66736C] line-clamp-2 mt-1">
                            {tpl.description}
                          </p>

                          {/* Architectural Features Pills */}
                          <div className="pt-2 flex flex-wrap gap-1">
                            {tpl.designCharacteristics.slice(0, 2).map((feat, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F4F1] text-[#4F5D56] font-medium truncate max-w-full"
                              >
                                {feat}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#F0F4F1] flex items-center justify-between text-[11px] text-[#66736C]">
                        <span>Layout Family:</span>
                        <strong className="text-[#18231E]">{tpl.layoutFamily}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Color Themes & Palettes Header */}
              <div className="pt-4 border-t border-[#F0F4F1] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                      Curated Accessible Color Themes
                    </h4>
                    <p className="text-xs text-[#66736C] mt-0.5">
                      Choose from 12 curated accessible palettes or customize primary &amp; secondary hex values below.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#176B4D] bg-[#E2F5E9] px-2.5 py-1 rounded-full border border-[#C8E8D5]">
                    12 Color Themes
                  </span>
                </div>
              </div>
              {/* LIVE PAIRING PREVIEW CARD */}
              <div
                className="p-5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
                style={{
                  backgroundColor: selectedTheme.tokens.surface,
                  borderColor: selectedTheme.tokens.border,
                }}
              >
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: selectedTheme.tokens.badgeBg,
                        color: selectedTheme.tokens.badgeText,
                      }}
                    >
                      Active Pairing Preview
                    </span>
                    <span className="text-xs text-[#66736C]">
                      {selectedTheme.isDark ? "Dark Palette" : "Light Palette"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: selectedTheme.tokens.text }}>
                    {selectedDesignTemplate.name} <span className="opacity-50">×</span> {selectedTheme.name}
                  </h3>
                  <p className="text-xs max-w-lg" style={{ color: selectedTheme.tokens.textMuted }}>
                    {selectedTheme.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Button Preview
                  </button>
                  <div
                    className="p-2 rounded-lg border text-xs font-mono"
                    style={{
                      backgroundColor: selectedTheme.tokens.cardBg,
                      borderColor: selectedTheme.tokens.border,
                      color: selectedTheme.tokens.text,
                    }}
                  >
                    {primaryColor}
                  </div>
                </div>
              </div>

              {/* 12 CURATED COLOUR THEMES GRID */}
              <div>
                <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider mb-3">
                  Select From 12 Curated Colour Themes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {COLOR_THEMES.map((th) => {
                    const isSelected = selectedThemeId === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() => handleThemeSelect(th.id)}
                        className={cn(
                          "rounded-xl border p-3.5 cursor-pointer transition-all flex flex-col justify-between group",
                          isSelected
                            ? "border-[#176B4D] bg-[#E2F5E9]/30 ring-2 ring-[#176B4D]"
                            : "border-[#E4E9E5] bg-white hover:border-[#CCD5CE] hover:shadow-xs"
                        )}
                      >
                        <div>
                          {/* 4-Color Swatch Bar */}
                          <div className="flex items-center rounded-lg overflow-hidden h-7 border border-black/10 mb-2.5">
                            {th.previewSwatches.map((color, idx) => (
                              <div
                                key={idx}
                                className="flex-1 h-full"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#18231E] group-hover:text-[#176B4D]">
                              {th.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                                  th.isDark ? "bg-stone-800 text-stone-200" : "bg-stone-100 text-stone-700"
                                )}
                              >
                                {th.isDark ? "Dark" : "Light"}
                              </span>
                              {isSelected && (
                                <span className="h-4 w-4 rounded-full bg-[#176B4D] text-white flex items-center justify-center shrink-0">
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#66736C] line-clamp-2 mt-1">
                            {th.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOM COLOR FINE-TUNING & TYPOGRAPHY */}
              <div className="pt-4 border-t border-[#F0F4F1] space-y-5">
                <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                  Fine-Tune Palette & Typography
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#18231E]">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-12 rounded border border-[#E4E9E5] cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm font-mono text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#18231E]">
                      Secondary / Surface Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-10 w-12 rounded border border-[#E4E9E5] cursor-pointer p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm font-mono text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Storefront Typography
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => {
                      setFontFamily(e.target.value);
                      if (e.target.value.includes("serif")) {
                        setTypographyPreference("editorial_serif");
                      } else if (e.target.value.includes("Mono")) {
                        setTypographyPreference("technical_mono");
                      } else {
                        setTypographyPreference("clean_sans");
                      }
                    }}
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 max-w-2xl pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#18231E]">
                      Hero Banner Headline
                    </label>
                    <input
                      type="text"
                      value={heroHeadline}
                      onChange={(e) => setHeroHeadline(e.target.value)}
                      placeholder={`Welcome to ${storeName || "the Store"}`}
                      className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#18231E]">
                      Hero Subheadline
                    </label>
                    <input
                      type="text"
                      value={heroSubheadline}
                      onChange={(e) => setHeroSubheadline(e.target.value)}
                      placeholder="Crafted for modern retail excellence."
                      className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>
                </div>

                {/* Brand Assets: Shop Logo & Hero Banner */}
                <div className="pt-4 border-t border-[#F0F4F1] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                        Shop Logo & Hero Banner Media
                      </h4>
                      <p className="text-[11px] text-[#66736C] mt-0.5">
                        Upload or provide direct image links for your storefront header and hero section.
                      </p>
                    </div>
                    {mediaUploadError && (
                      <span className="text-xs text-red-600 font-medium">{mediaUploadError}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                    {/* Shop Logo */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#18231E] block">
                        Shop Brand Logo
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF9F6] border border-[#CCD5CE] rounded-lg cursor-pointer hover:bg-[#F0F4F1] transition-colors text-xs font-semibold text-[#18231E]">
                          {isUploadingLogo ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#176B4D]" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 text-[#176B4D]" />
                          )}
                          <span>{isUploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            disabled={isUploadingLogo}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadBrandMedia(file, "logo");
                            }}
                          />
                        </label>
                        <input
                          type="url"
                          placeholder="or paste logo URL..."
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs"
                        />
                      </div>
                      {logoUrl && (
                        <div className="p-2.5 bg-[#FAF9F6] border border-[#E4E9E5] rounded-lg flex items-center justify-between">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logoUrl} alt="Logo preview" className="h-8 max-w-[140px] object-contain" />
                          <button
                            type="button"
                            onClick={() => setLogoUrl("")}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-[#66736C]">
                        Supported: PNG, SVG, JPG, WEBP (Max 5MB).
                      </p>
                    </div>

                    {/* Hero Banner */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#18231E] block">
                        Hero Banner Image
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF9F6] border border-[#CCD5CE] rounded-lg cursor-pointer hover:bg-[#F0F4F1] transition-colors text-xs font-semibold text-[#18231E]">
                          {isUploadingBanner ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#176B4D]" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 text-[#176B4D]" />
                          )}
                          <span>{isUploadingBanner ? "Uploading..." : "Upload Banner"}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            disabled={isUploadingBanner}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadBrandMedia(file, "banner");
                            }}
                          />
                        </label>
                        <input
                          type="url"
                          placeholder="or paste banner URL..."
                          value={bannerUrl}
                          onChange={(e) => setBannerUrl(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs"
                        />
                      </div>
                      {bannerUrl && (
                        <div className="p-2.5 bg-[#FAF9F6] border border-[#E4E9E5] rounded-lg flex items-center justify-between">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={bannerUrl} alt="Banner preview" className="h-12 max-w-[200px] object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => setBannerUrl("")}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-[#66736C]">
                        Recommended: 16:9 or 21:9 ratio (Max 5MB).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enabled Sections */}
                <div className="pt-2 border-t border-[#F0F4F1]">
                  <label className="text-xs font-semibold text-[#18231E] block mb-2">
                    Active Storefront Layout Modules
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
                    {[
                      { id: "hero", label: "Hero Banner" },
                      { id: "featured_products", label: "Featured Product Grid" },
                      { id: "about", label: "Brand Story & Heritage" },
                      { id: "newsletter", label: "Email Newsletter Form" },
                      { id: "footer", label: "Storefront Footer" },
                    ].map((sec) => {
                      const isChecked = enabledSections.includes(sec.id);
                      return (
                        <label
                          key={sec.id}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors select-none",
                            isChecked
                              ? "border-[#176B4D] bg-[#E2F5E9]/40 text-[#176B4D] font-semibold"
                              : "border-[#E4E9E5] bg-white text-[#4F5D56]"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSection(sec.id)}
                            className="rounded border-[#CCD5CE] text-[#176B4D] focus:ring-[#176B4D]"
                          />
                          <span>{sec.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: AI CONTEXT-AWARE PLAN & STRUCTURAL REVIEW */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {isGeneratingPlan ? (
              <div className="p-8 bg-[#E2F5E9] border border-[#C8E8D5] rounded-xl flex items-center justify-center gap-3 text-sm text-[#176B4D]">
                <Loader2 className="h-6 w-6 animate-spin shrink-0" />
                <div>
                  <span className="font-bold block">Synthesizing Business Context...</span>
                  <span className="text-xs text-[#4F5D56]">Assembling architectural layout, section hierarchy, and context-tailored copy.</span>
                </div>
              </div>
            ) : (
              <>
                {/* AI Plan Strategy Summary */}
                <Card className="border-[#176B4D]/30 bg-gradient-to-br from-white to-[#F4F9F6]">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>Step 4: Context Strategy &amp; Section Architecture</CardTitle>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E2F5E9] text-[#176B4D] border border-[#C8E8D5]">
                          Deterministic Rules Engine (Local)
                        </span>
                      </div>
                      <p className="text-xs text-[#66736C] mt-0.5">
                        Synthesized via platform rule algorithms for <strong className="text-[#18231E]">{businessCategory || selectedIndustry}</strong> and target audience: <span className="text-[#176B4D]">{primaryAudience || "Valued Clients"}</span>.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeneratePlan}
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    >
                      Regenerate Plan
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-[#E4E9E5]">
                        <span className="text-[11px] font-bold text-[#176B4D] uppercase tracking-wider block mb-1">
                          Audience Focus
                        </span>
                        <p className="text-xs text-[#4F5D56]">
                          {generatedPlan?.summary?.targetAudienceSummary || "Engineered for prospective clients seeking dependable, high-caliber solutions."}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-[#E4E9E5]">
                        <span className="text-[11px] font-bold text-[#176B4D] uppercase tracking-wider block mb-1">
                          Design Architecture
                        </span>
                        <p className="text-xs text-[#4F5D56]">
                          {generatedPlan?.summary?.designPhilosophy || `Using '${selectedDesignTemplate.name}' aesthetics with '${selectedTheme.name}' harmony.`}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-[#E4E9E5]">
                        <span className="text-[11px] font-bold text-[#176B4D] uppercase tracking-wider block mb-1">
                          Conversion Path
                        </span>
                        <p className="text-xs text-[#4F5D56]">
                          {generatedPlan?.summary?.conversionStrategy || "Anchored around prominent value propositions and straightforward engagement pathways."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommended Structure & Interactive Section Checklist */}
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Recommended Section Hierarchy</CardTitle>
                      <p className="text-xs text-[#66736C] mt-0.5">
                        The engine selected these modules based on your business type. Toggle any optional section on or off. You can reorder, duplicate, and edit them in the Visual Editor.
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2.5">
                      {(generatedPlan?.recommendedSections || []).map((rec, idx) => {
                        const isEnabled = enabledPlanSections[rec.type] !== false;
                        return (
                          <div
                            key={rec.type}
                            className={cn(
                              "p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                              isEnabled ? "bg-white border-[#C8E8D5]" : "bg-stone-50 border-stone-200 opacity-60"
                            )}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="h-6 w-6 rounded-md bg-[#E2F5E9] text-[#176B4D] font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-[#18231E]">{rec.name}</span>
                                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700">
                                    {rec.category}
                                  </span>
                                  {rec.isRequired && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                      Required
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#4F5D56] mt-0.5">
                                  {rec.rationale}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <label className="flex items-center gap-1.5 text-xs font-medium text-[#18231E] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  disabled={rec.isRequired}
                                  checked={isEnabled}
                                  onChange={(e) => {
                                    if (rec.isRequired) return;
                                    setEnabledPlanSections((prev) => ({
                                      ...prev,
                                      [rec.type]: e.target.checked,
                                    }));
                                  }}
                                  className="h-4 w-4 rounded border-stone-300 text-[#176B4D] focus:ring-[#176B4D] cursor-pointer"
                                />
                                <span>{isEnabled ? "Included" : "Excluded"}</span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Content & Messaging Preview */}
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Context-Aware Content &amp; Copy Preview</CardTitle>
                      <p className="text-xs text-[#66736C] mt-0.5">
                        Generated copy is tailored to your business profile. All text is 100% editable in the Visual Editor.
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#E4E9E5] space-y-2">
                      <span className="text-[10px] font-bold text-[#176B4D] uppercase tracking-wider block">
                        Hero Messaging Preview
                      </span>
                      <h3 className="text-base font-bold text-[#18231E]">
                        {generatedPlan?.contentPlan?.heroHeadline || heroHeadline || `Welcome to ${storeName}`}
                      </h3>
                      <p className="text-xs text-[#4F5D56]">
                        {generatedPlan?.contentPlan?.heroSubheadline || heroSubheadline || "Tailored solutions and dedicated service."}
                      </p>
                      <div className="pt-1">
                        <span className="inline-block px-3 py-1 rounded-md bg-[#176B4D] text-white text-xs font-semibold">
                          {generatedPlan?.contentPlan?.primaryCtaText || "Explore Catalog"} &rarr;
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-[#E4E9E5] space-y-1">
                        <span className="text-[10px] font-bold text-stone-700 uppercase block mb-1">
                          Core Benefits Preview
                        </span>
                        <ul className="text-xs text-[#4F5D56] space-y-1.5">
                          {(generatedPlan?.contentPlan?.keyBenefits || []).map((b, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Check className="h-3.5 w-3.5 text-[#176B4D] shrink-0 mt-0.5" />
                              <span><strong>{b.title}:</strong> {b.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-[#E4E9E5] space-y-1">
                        <span className="text-[10px] font-bold text-stone-700 uppercase block mb-1">
                          Contextual FAQs Preview
                        </span>
                        <ul className="text-xs text-[#4F5D56] space-y-1.5">
                          {(generatedPlan?.contentPlan?.faqs || []).slice(0, 2).map((faq, i) => (
                            <li key={i} className="space-y-0.5">
                              <span className="font-semibold text-[#18231E] block text-[11px]">&bull; {faq.question}</span>
                              <span className="text-[11px] text-[#66736C] block pl-2">{faq.answer}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* STEP 4: CATEGORY & PRODUCT MANAGEMENT (E-COMMERCE) */}
        {currentStep === 4 && websiteType === "ecommerce" && (
          <div className="space-y-6">
            {/* Top Toolbar / Category Header */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Step 4: Categories & Product Catalog</CardTitle>
                  <p className="text-xs text-[#66736C] mt-0.5">
                    Organize your store by category and add unlimited products with custom photography and pricing.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetToPresets}
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    Reset Presets
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleOpenAddCategory}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Pills & Controls */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryFilter("ALL")}
                    className={cn(
                      "px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer border",
                      activeCategoryFilter === "ALL"
                        ? "bg-[#176B4D] text-white border-[#176B4D]"
                        : "bg-white text-[#4F5D56] border-[#E4E9E5] hover:border-[#CCD5CE]"
                    )}
                  >
                    <span>All Categories</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px]",
                        activeCategoryFilter === "ALL" ? "bg-white/20" : "bg-[#F0F4F1]"
                      )}
                    >
                      {customProducts.length}
                    </span>
                  </button>

                  {categories.map((cat) => {
                    const isSelected = activeCategoryFilter === cat.name;
                    const count = customProducts.filter(
                      (p) => p.category.toLowerCase() === cat.name.toLowerCase()
                    ).length;

                    return (
                      <div
                        key={cat.id}
                        className={cn(
                          "flex items-center rounded-lg border text-xs transition-colors shrink-0",
                          isSelected
                            ? "bg-[#E2F5E9] border-[#176B4D] text-[#176B4D] font-semibold"
                            : "bg-white border-[#E4E9E5] text-[#4F5D56]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveCategoryFilter(cat.name)}
                          className="px-3 py-2 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Tag className="h-3 w-3" />
                          <span>{cat.name}</span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                              isSelected ? "bg-[#176B4D] text-white" : "bg-[#F0F4F1]"
                            )}
                          >
                            {count}
                          </span>
                        </button>
                        <div className="flex items-center pr-1.5 border-l border-current/10 gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCategory(cat)}
                            title="Edit Category"
                            className="p-1 hover:text-[#18231E] rounded cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            title="Delete Category"
                            className="p-1 hover:text-[#C43D3D] rounded cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-bar: Search, Add Product, and Starter Generator */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#F0F4F1]">
                  <SearchInput
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onClear={() => setProductSearch("")}
                    placeholder="Filter products by title, SKU, or category..."
                    wrapperClassName="max-w-md w-full"
                  />
                  <div className="flex items-center gap-2">
                    {customProducts.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateStarterProducts}
                        leftIcon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                      >
                        Populate Demo Items
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenAddProduct(activeCategoryFilter)}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Add Product
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products List / Grid */}
            {filteredStep4Products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStep4Products.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl border border-[#E4E9E5] bg-white flex flex-col justify-between hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="h-16 w-16 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-[#E4E9E5] flex items-center justify-center">
                          {prod.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className={cn(
                                "w-full h-full flex items-center justify-center font-bold text-xs",
                                prod.thumbnailColor || "bg-emerald-100 text-emerald-800"
                              )}
                            >
                              {prod.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Title and Category */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-[#176B4D] bg-[#E2F5E9] px-2 py-0.5 rounded">
                              {prod.category}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded",
                                prod.stockStatus === "In Stock"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : prod.stockStatus === "Low Stock"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-stone-100 text-stone-600"
                              )}
                            >
                              {prod.stockStatus}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#18231E] truncate mt-1">
                            {prod.name}
                          </h4>
                          <p className="text-[10px] font-mono text-[#66736C]">{prod.sku}</p>
                        </div>
                      </div>

                      <p className="text-xs text-[#66736C] line-clamp-2 mt-2 leading-relaxed">
                        {prod.description}
                      </p>

                      {/* Variants tags */}
                      {prod.variants && prod.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {prod.variants.map((v, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-[#F0F4F1] text-[#4F5D56] px-1.5 py-0.5 rounded"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price and actions bar */}
                    <div className="mt-4 pt-3 border-t border-[#F0F4F1] flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-[#18231E]">
                          {formatINR(prod.price)}
                        </span>
                        {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                          <span className="text-xs line-through text-[#909D96]">
                            {formatINR(prod.compareAtPrice)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(prod)}
                          className="p-1.5 text-[#66736C] hover:text-[#18231E] rounded-md hover:bg-[#F0F4F1] transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 text-[#66736C] hover:text-[#C43D3D] rounded-md hover:bg-[#FDEAEA] transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-xl border border-[#E4E9E5] space-y-3">
                <Package className="h-10 w-10 mx-auto text-[#909D96]" />
                <h3 className="text-sm font-bold text-[#18231E]">No Products Added Yet</h3>
                <p className="text-xs text-[#66736C] max-w-sm mx-auto">
                  Add products to {activeCategoryFilter === "ALL" ? "your store" : `"${activeCategoryFilter}"`} or populate quick starter demonstration items.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateStarterProducts}
                    leftIcon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                  >
                    Populate Demo Items
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenAddProduct(activeCategoryFilter)}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add Product
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 (APPOINTMENTS): SERVICES, SCHEDULE, PRACTITIONER & POLICIES */}
        {currentStep === 4 && websiteType === "appointments" && (
          <div className="space-y-6">
            {/* Services Header & List */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Step 4: Practice Services & Consultation Offerings</CardTitle>
                  <p className="text-xs text-[#66736C] mt-0.5">
                    Configure your professional services, consultation durations, INR fees, and consultation formats.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleOpenAddService}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {appointmentServices.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#E4E9E5] rounded-xl bg-[#FAF9F6]">
                    <Clock className="h-8 w-8 text-[#909D96] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#18231E]">No services configured</p>
                    <p className="text-xs text-[#66736C] mt-1 mb-3">Add at least one consultation or appointment service.</p>
                    <Button variant="primary" size="sm" onClick={handleOpenAddService} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                      Add Service
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {appointmentServices.map((svc) => (
                      <div
                        key={svc.id}
                        className="p-4 rounded-xl border border-[#E4E9E5] bg-white hover:border-[#176B4D] transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-[#18231E]">{svc.name}</h4>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-bold text-[#176B4D] px-2 py-0.5 rounded-full bg-[#E2F5E9]">
                                {svc.price > 0 ? formatINR(svc.price) : "Free"}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-[#66736C] mt-1 line-clamp-2">{svc.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#F0F4F1] text-[11px] text-[#4F5D56]">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#176B4D]" />
                              {svc.durationMinutes} mins
                            </span>
                            <span className="inline-flex items-center gap-1">
                              {svc.meetingType === "video_call" ? (
                                <>
                                  <Video className="h-3 w-3 text-[#176B4D]" />
                                  Video Call
                                </>
                              ) : svc.meetingType === "in_person" ? (
                                <>
                                  <MapPin className="h-3 w-3 text-[#176B4D]" />
                                  In-Person
                                </>
                              ) : (
                                <>
                                  <Phone className="h-3 w-3 text-[#176B4D]" />
                                  Phone
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-3 pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditService(svc)}
                            leftIcon={<Edit2 className="h-3 w-3" />}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteService(svc.id)}
                            leftIcon={<Trash2 className="h-3 w-3 text-[#C43D3D]" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Practitioner Card */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Practitioner / Professional</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  The primary host or specialist conducting consultations.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Practitioner Name <span className="text-[#C43D3D]">*</span>
                  </label>
                  <input
                    type="text"
                    value={practitionerName}
                    onChange={(e) => setPractitionerName(e.target.value)}
                    placeholder="e.g. Adv. Rajesh Iyer"
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Professional Title / Designation
                  </label>
                  <input
                    type="text"
                    value={practitionerRole}
                    onChange={(e) => setPractitionerRole(e.target.value)}
                    placeholder="e.g. Senior Managing Counsel"
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={practitionerEmail}
                    onChange={(e) => setPractitionerEmail(e.target.value)}
                    placeholder="e.g. rajesh@example.com"
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Operating Hours & Days */}
            <Card>
              <CardHeader>
                <CardTitle>Operating Hours & Weekly Availability</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Set available days and consultation business hours. Slots are automatically generated within these windows.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="divide-y divide-[#F0F4F1] border border-[#E4E9E5] rounded-xl overflow-hidden">
                  {appointmentWeeklyHours.map((day) => {
                    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    return (
                      <div
                        key={day.dayOfWeek}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 text-xs transition-colors",
                          day.isOpen ? "bg-white" : "bg-[#FAF9F6] text-[#909D96]"
                        )}
                      >
                        <div className="flex items-center gap-3 w-36">
                          <input
                            type="checkbox"
                            id={`day-${day.dayOfWeek}`}
                            checked={day.isOpen}
                            onChange={() => handleToggleDay(day.dayOfWeek)}
                            className="h-4 w-4 rounded border-[#D5DDD8] text-[#176B4D] focus:ring-[#176B4D]"
                          />
                          <label htmlFor={`day-${day.dayOfWeek}`} className="font-semibold text-xs text-[#18231E] cursor-pointer">
                            {dayNames[day.dayOfWeek]}
                          </label>
                        </div>
                        {day.isOpen ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[#66736C]">From</span>
                            <input
                              type="time"
                              value={day.openTime}
                              onChange={(e) => handleUpdateDayTime(day.dayOfWeek, "openTime", e.target.value)}
                              className="rounded border border-[#E4E9E5] px-2 py-1 text-xs text-[#18231E]"
                            />
                            <span className="text-[#66736C]">to</span>
                            <input
                              type="time"
                              value={day.closeTime}
                              onChange={(e) => handleUpdateDayTime(day.dayOfWeek, "closeTime", e.target.value)}
                              className="rounded border border-[#E4E9E5] px-2 py-1 text-xs text-[#18231E]"
                            />
                          </div>
                        ) : (
                          <span className="text-[#909D96] font-medium text-xs">Closed / Off</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Booking Policies & Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Rules & Policies</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Control advance windows, buffers, lead times, and client cancellation notice.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">Timezone</label>
                  <select
                    value={appointmentTimezone}
                    onChange={(e) => setAppointmentTimezone(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-xs text-[#18231E] focus:outline-hidden"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="UTC">UTC (+0:00)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">Minimum Lead Time</label>
                  <select
                    value={appointmentMinNoticeHours}
                    onChange={(e) => setAppointmentMinNoticeHours(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-xs text-[#18231E] focus:outline-hidden"
                  >
                    <option value={1}>1 hour notice</option>
                    <option value={2}>2 hours notice</option>
                    <option value={4}>4 hours notice</option>
                    <option value={12}>12 hours notice</option>
                    <option value={24}>24 hours notice</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">Buffer Between Appointments</label>
                  <select
                    value={appointmentBufferMinutes}
                    onChange={(e) => setAppointmentBufferMinutes(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-xs text-[#18231E] focus:outline-hidden"
                  >
                    <option value={0}>No buffer</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">Advance Booking Window</label>
                  <select
                    value={appointmentMaxAdvanceDays}
                    onChange={(e) => setAppointmentMaxAdvanceDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-xs text-[#18231E] focus:outline-hidden"
                  >
                    <option value={7}>Up to 7 days ahead</option>
                    <option value={14}>Up to 14 days ahead</option>
                    <option value={30}>Up to 30 days ahead</option>
                    <option value={60}>Up to 60 days ahead</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">Cancellation Notice</label>
                  <select
                    value={appointmentNoticeHours}
                    onChange={(e) => setAppointmentNoticeHours(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-xs text-[#18231E] focus:outline-hidden"
                  >
                    <option value={12}>Up to 12 hours before</option>
                    <option value={24}>Up to 24 hours before</option>
                    <option value={48}>Up to 48 hours before</option>
                  </select>
                </div>

                <div className="col-span-full space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">Meeting Location / Office Address</label>
                  <input
                    type="text"
                    value={appointmentMeetingLocation}
                    onChange={(e) => setAppointmentMeetingLocation(e.target.value)}
                    placeholder="e.g. Nariman Point Executive Chambers, Mumbai & Secure Video Link"
                    className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>

                <div className="col-span-full flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="requireApproval"
                    checked={appointmentRequireApproval}
                    onChange={(e) => setAppointmentRequireApproval(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D5DDD8] text-[#176B4D] focus:ring-[#176B4D]"
                  />
                  <label htmlFor="requireApproval" className="text-xs font-semibold text-[#18231E] cursor-pointer">
                    Require staff approval before confirming appointments
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 4 (LEAD GENERATION): STARTER TEMPLATES & FORM PREVIEW */}
        {currentStep === 4 && websiteType === "lead_gen" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Step 4: Starter Form & Lead Capture Template</CardTitle>
                  <p className="text-xs text-[#66736C] mt-0.5">
                    Select a high-converting starter form template. You can customize fields, rules, steps, and presentation in the visual editor afterwards.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LEAD_STARTER_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedLeadTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => {
                          setSelectedLeadTemplateId(tmpl.id);
                          setLeadFormCustomTitle(tmpl.name);
                        }}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3",
                          isSelected
                            ? "border-[#176B4D] bg-[#E2F5E9]/40 shadow-sm ring-1 ring-[#176B4D]"
                            : "border-[#E4E9E5] bg-white hover:border-[#CCD5CE]"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-[#176B4D] bg-[#E2F5E9] px-2 py-0.5 rounded">
                              {tmpl.category}
                            </span>
                            {isSelected && (
                              <div className="h-5 w-5 rounded-full bg-[#176B4D] flex items-center justify-center text-white">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-[#18231E]">{tmpl.name}</h4>
                          <p className="text-xs text-[#66736C] mt-1 line-clamp-2">{tmpl.description}</p>
                        </div>

                        <div className="pt-2 border-t border-[#F0F4F1] flex items-center justify-between text-[11px] text-[#4F5D56]">
                          <span>{tmpl.steps[0]?.fields.length || 0} Default Fields</span>
                          <span className="capitalize">{tmpl.defaultSettings.layout.replace("_", " ")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E9E5] space-y-3 max-w-xl">
                  <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                    Form Display Headline
                  </h4>
                  <div>
                    <label className="text-xs font-semibold text-[#18231E] block mb-1">
                      Lead Form Heading
                    </label>
                    <input
                      type="text"
                      value={leadFormCustomTitle}
                      onChange={(e) => setLeadFormCustomTitle(e.target.value)}
                      placeholder="e.g. Schedule a Free Consultation"
                      className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D] bg-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 5: REVIEW & DEPLOY */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Step 5: Review Store Configuration</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Confirm parameters before generating the persisted storefront demonstration.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Store Basics Summary */}
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E9E5] space-y-3">
                  <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                    Store Identity & Client
                  </h4>
                  <div className="text-xs space-y-1.5 text-[#4F5D56]">
                    <p>
                      <strong>Store Name:</strong> {storeName}
                    </p>
                    <p>
                      <strong>Client Account:</strong> {selectedClient?.company} ({selectedClient?.name})
                    </p>
                    <p>
                      <strong>Local Subdomain:</strong>{" "}
                      <span className="font-mono text-[#176B4D]">http://{slug}.localhost:3000</span>
                    </p>
                    <p>
                      <strong>Preview Path:</strong>{" "}
                      <span className="font-mono text-[#4F5D56]">/store/{slug}</span>
                    </p>
                    <p>
                      <strong>Industry / Practice:</strong>{" "}
                      {websiteType === "appointments" ? selectedAppointmentIndustry : selectedIndustry}
                    </p>
                    <p>
                      <strong>Website Type:</strong>{" "}
                      <span className="capitalize">{websiteType}</span>
                    </p>
                  </div>
                </div>

                {/* Architecture & Theme Summary */}
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E9E5] space-y-3">
                  <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                    Design Architecture & Colour Theme
                  </h4>
                  <div className="text-xs space-y-1.5 text-[#4F5D56]">
                    <p>
                      <strong>Website Design Template:</strong> {selectedDesignTemplate.name} ({selectedDesignTemplate.layoutFamily})
                    </p>
                    <p>
                      <strong>Colour Theme:</strong> {selectedTheme.name} ({selectedTheme.isDark ? "Dark Palette" : "Light Palette"})
                    </p>
                    <div className="flex items-center gap-2">
                      <strong>Theme Tokens:</strong>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: primaryColor }}
                        title={`Primary: ${primaryColor}`}
                      />
                      <span className="font-mono text-[11px]">{primaryColor}</span>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 inline-block ml-1"
                        style={{ backgroundColor: secondaryColor }}
                        title={`Secondary: ${secondaryColor}`}
                      />
                      <span className="font-mono text-[11px]">{secondaryColor}</span>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 inline-block ml-1"
                        style={{ backgroundColor: selectedTheme.tokens.accent }}
                        title={`Accent: ${selectedTheme.tokens.accent}`}
                      />
                    </div>
                    <p>
                      <strong>Typography:</strong> {fontFamily.split(",")[0]}
                    </p>
                    <div className="flex items-center gap-4 text-xs pt-0.5">
                      <div>
                        <strong>Logo:</strong>{" "}
                        {logoUrl ? (
                          <span className="text-[#176B4D] font-medium">Configured</span>
                        ) : (
                          <span className="text-[#66736C]">None</span>
                        )}
                      </div>
                      <div>
                        <strong>Hero Banner:</strong>{" "}
                        {bannerUrl ? (
                          <span className="text-[#176B4D] font-medium">Configured</span>
                        ) : (
                          <span className="text-[#66736C]">None</span>
                        )}
                      </div>
                    </div>
                    {websiteType === "appointments" ? (
                      <p>
                        <strong>Services Offered:</strong> {appointmentServices.length} Consultation Services
                      </p>
                    ) : (
                      <p>
                        <strong>Catalog:</strong> {customProducts.length} Custom Products across {categories.length} Categories
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Categories & Catalog Breakdown OR Appointment Services Breakdown */}
              {websiteType === "appointments" ? (
                <div className="p-4 rounded-xl border border-[#E4E9E5] bg-white space-y-3">
                  <span className="font-semibold text-xs text-[#18231E] block">
                    Configured Practice Services ({appointmentServices.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {appointmentServices.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-lg border border-[#F0F4F1] bg-[#FAF9F6] flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-[#18231E]">{s.name} ({s.durationMinutes}m)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E2F5E9] text-[#176B4D] font-bold">
                          {s.price > 0 ? formatINR(s.price) : "Free"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[#F0F4F1] text-xs text-[#4F5D56] flex flex-wrap items-center gap-4">
                    <span><strong>Host:</strong> {practitionerName} ({practitionerRole})</span>
                    <span><strong>Timezone:</strong> {appointmentTimezone}</span>
                    <span><strong>Notice Window:</strong> {appointmentNoticeHours}h</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-[#E4E9E5] bg-white space-y-3">
                  <span className="font-semibold text-xs text-[#18231E] block">
                    Configured Catalog Categories ({categories.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {categories.map((c) => {
                      const count = customProducts.filter(
                        (p) => p.category.toLowerCase() === c.name.toLowerCase()
                      ).length;
                      return (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-lg border border-[#F0F4F1] bg-[#FAF9F6] flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-[#18231E]">{c.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E2F5E9] text-[#176B4D] font-bold">
                            {count} {count === 1 ? "item" : "items"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sections Checklist */}
              <div className="text-xs p-4 rounded-xl border border-[#E4E9E5] bg-white">
                <span className="font-semibold text-[#18231E] block mb-2">
                  Enabled Store Modules:
                </span>
                <div className="flex flex-wrap gap-2">
                  {enabledSections.map((sec) => (
                    <span
                      key={sec}
                      className="px-2.5 py-1 rounded bg-[#E2F5E9] text-[#176B4D] font-medium text-[11px]"
                    >
                      {sec.replace("_", " ").toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E4E9E5]">
        <Button
          variant="outline"
          size="md"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Previous Step
        </Button>

        {currentStep < 5 ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleNext}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={handleFinalSubmit}
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="h-4 w-4" />}
            className="bg-[#176B4D] hover:bg-[#12533B]"
          >
            Generate Website &amp; Launch in Visual Editor
          </Button>
        )}
      </div>

      {/* CATEGORY MODAL (Create / Edit) */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategoryId ? "Edit Product Category" : "Add Product Category"}
        description="Define a category section for your catalog display."
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Category Name <span className="text-[#C43D3D]">*</span>
            </label>
            <input
              type="text"
              required
              value={categoryFormName}
              onChange={(e) => setCategoryFormName(e.target.value)}
              placeholder="e.g. Ceramic Dinnerware"
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Category Description (Optional)
            </label>
            <textarea
              rows={3}
              value={categoryFormDescription}
              onChange={(e) => setCategoryFormDescription(e.target.value)}
              placeholder="e.g. Stoneware plates, bowls, and serving platters handcrafted by local potters."
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E9E5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingCategoryId ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PRODUCT MODAL (Create / Edit) */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProductId ? "Edit Product" : "Add Product to Catalog"}
        description="Configure product attributes, photography, pricing, and variants."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Product Title <span className="text-[#C43D3D]">*</span>
            </label>
            <input
              type="text"
              required
              value={prodFormName}
              onChange={(e) => setProdFormName(e.target.value)}
              placeholder="e.g. Artisan Ceramic Salad Bowl"
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          {/* Category Assignment & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18231E]">
                Category <span className="text-[#C43D3D]">*</span>
              </label>
              <select
                value={prodFormCategory}
                onChange={(e) => setProdFormCategory(e.target.value)}
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#18231E]">SKU</label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[10px] text-[#176B4D] hover:underline cursor-pointer"
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                value={prodFormSku}
                onChange={(e) => setProdFormSku(e.target.value)}
                placeholder="e.g. STR-CER-4092"
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm font-mono text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              />
            </div>
          </div>

          {/* Image Upload Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Product Photography <span className="text-[#C43D3D]">*</span>
            </label>
            <div className="flex items-start gap-3">
              {/* Preview Thumbnail */}
              <div className="h-20 w-20 rounded-lg border border-[#E4E9E5] bg-stone-100 overflow-hidden shrink-0 flex items-center justify-center">
                {prodFormImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prodFormImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-[#909D96]" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploadingImage}
                    leftIcon={<Upload className="h-3.5 w-3.5" />}
                  >
                    Upload Image
                  </Button>
                  {prodFormImageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setProdFormImageUrl("")}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <input
                  type="text"
                  value={prodFormImageUrl}
                  onChange={(e) => setProdFormImageUrl(e.target.value)}
                  placeholder="Or enter image URL (e.g. /uploads/... or https://...)"
                  className="w-full rounded-lg border border-[#E4E9E5] px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden"
                />
                <p className="text-[10px] text-[#66736C]">
                  PNG, JPG, WEBP, or SVG under 5MB. Persisted securely via local storage provider.
                </p>
                {imageUploadError && (
                  <p className="text-[10px] text-[#C43D3D] font-medium">{imageUploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing: Price & Compare-At Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18231E]">
                Retail Price (₹) <span className="text-[#C43D3D]">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={prodFormPrice}
                onChange={(e) => setProdFormPrice(e.target.value)}
                placeholder="1499"
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18231E]">
                Original / Compare-At Price (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={prodFormCompareAtPrice}
                onChange={(e) => setProdFormCompareAtPrice(e.target.value)}
                placeholder="1999"
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              />
            </div>
          </div>

          {/* Stock Status & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18231E]">Inventory Stock Status</label>
              <select
                value={prodFormStockStatus}
                onChange={(e) =>
                  setProdFormStockStatus(e.target.value as "In Stock" | "Low Stock" | "Out of Stock")
                }
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden"
              >
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18231E]">Listing Status</label>
              <select
                value={prodFormStatus}
                onChange={(e) => setProdFormStatus(e.target.value as "active" | "draft")}
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden"
              >
                <option value="active">Active (Visible)</option>
                <option value="draft">Draft (Hidden)</option>
              </select>
            </div>
          </div>

          {/* Product Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Description <span className="text-[#C43D3D]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={prodFormDescription}
              onChange={(e) => setProdFormDescription(e.target.value)}
              placeholder="Detailed description of features, materials, and artisan techniques."
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          {/* Variants */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Product Variants (Comma-separated)
            </label>
            <input
              type="text"
              value={prodFormVariants}
              onChange={(e) => setProdFormVariants(e.target.value)}
              placeholder="e.g. Small, Medium, Large or Charcoal, Sand, Olive"
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden"
            />
          </div>

          {/* Specifications */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Specifications (One &quot;Key: Value&quot; per line)
            </label>
            <textarea
              rows={2}
              value={prodFormSpecs}
              onChange={(e) => setProdFormSpecs(e.target.value)}
              placeholder="Material: 100% Stoneware&#10;Care: Dishwasher Safe&#10;Dimensions: 28cm Diameter"
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm font-mono text-[#18231E] focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E9E5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingProductId ? "Update Product" : "Save Product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Client Modal */}
      <Modal
        isOpen={quickClientModalOpen}
        onClose={() => setQuickClientModalOpen(false)}
        title="Add Client Account"
        description="Quickly onboard a client enterprise to attach this storefront."
      >
        <form onSubmit={handleCreateQuickClient} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1">
              Company Name <span className="text-[#C43D3D]">*</span>
            </label>
            <input
              type="text"
              required
              value={newClientCompany}
              onChange={(e) => setNewClientCompany(e.target.value)}
              placeholder="e.g. Acme Retailers Inc."
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1">
              Contact / Lead Name
            </label>
            <input
              type="text"
              value={newClientLead}
              onChange={(e) => setNewClientLead(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E9E5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickClientModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isCreatingClient}>
              Save Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* SERVICE MODAL (Create / Edit for Appointments) */}
      <Modal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title={editingServiceId ? "Edit Practice Service" : "Add Practice Service"}
        description="Configure consultation service parameters, duration, and fee."
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Service Title <span className="text-[#C43D3D]">*</span>
            </label>
            <input
              type="text"
              required
              value={serviceFormName}
              onChange={(e) => setServiceFormName(e.target.value)}
              placeholder="e.g. Comprehensive Legal Advisory Session"
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={serviceFormDesc}
              onChange={(e) => setServiceFormDesc(e.target.value)}
              placeholder="Detailed explanation of what is reviewed, counsel offered, or deliverable."
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18231E]">
                Duration (Minutes) <span className="text-[#C43D3D]">*</span>
              </label>
              <select
                value={serviceFormDuration}
                onChange={(e) => setServiceFormDuration(e.target.value)}
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18231E]">
                Fee (₹ INR) <span className="text-[#C43D3D]">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={serviceFormPrice}
                onChange={(e) => setServiceFormPrice(e.target.value)}
                placeholder="0 for complimentary"
                className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              />
              <span className="text-[10px] text-[#66736C]">Set to 0 for free initial consultation</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#18231E]">
              Consultation Format <span className="text-[#C43D3D]">*</span>
            </label>
            <select
              value={serviceFormMeetingType}
              onChange={(e) =>
                setServiceFormMeetingType(
                  e.target.value as "video_call" | "in_person" | "phone_call"
                )
              }
              className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden"
            >
              <option value="video_call">Video Call (Secure Conference Link)</option>
              <option value="in_person">In-Person Consultation (Office)</option>
              <option value="phone_call">Phone Consultation</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E9E5]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setServiceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingServiceId ? "Save Changes" : "Add Service"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
