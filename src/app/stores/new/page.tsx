"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { normalizeSlug, validateSlug } from "@/lib/validation/slug";
import { Client, Template, Product, IndustryType } from "@/types";
import { cn } from "@/utils/cn";

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

export default function NewStoreWizardPage() {
  const router = useRouter();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Data Collections
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form State
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>("Home & Living");
  const [description, setDescription] = useState("");

  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [primaryColor, setPrimaryColor] = useState("#176B4D");
  const [secondaryColor, setSecondaryColor] = useState("#FAF9F6");
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

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("ALL");

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Client Creation Modal
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientLead, setNewClientLead] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const [cRes, tRes, pRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/templates"),
          fetch("/api/products"),
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
          setTemplates(tData.templates || []);
          if (tData.templates?.length > 0) {
            setSelectedTemplateId(tData.templates[0].id);
            setPrimaryColor(tData.templates[0].colorPalette.primary);
          }
        }

        if (pRes.ok) {
          const pData = await pRes.json();
          setProducts(pData.products || []);
          // Pre-select first 3 products as a helpful starting default
          if (pData.products?.length > 0) {
            setSelectedProductIds(pData.products.slice(0, 3).map((p: Product) => p.id));
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

  // Auto-generate slug from store name unless user manually edited slug
  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    if (!isSlugCustomized) {
      setSlug(normalizeSlug(val));
    }
    if (!heroHeadline) {
      setHeroHeadline(`Welcome to ${val}`);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplateId(template.id);
    setPrimaryColor(template.colorPalette.primary);
    setSecondaryColor(template.colorPalette.secondary);
  };

  const toggleSection = (section: string) => {
    if (enabledSections.includes(section)) {
      setEnabledSections(enabledSections.filter((s) => s !== section));
    } else {
      setEnabledSections([...enabledSections, section]);
    }
  };

  const toggleProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  // Step 1 validation
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

  // Step 2 validation
  const validateStep2 = () => {
    if (!selectedTemplateId) {
      setFormError("Please choose a storefront template.");
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
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

  // Submit complete store configuration
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: storeName.trim(),
        slug: normalizeSlug(slug),
        clientId: selectedClientId,
        industry: selectedIndustry,
        templateId: selectedTemplateId,
        description: description.trim(),
        branding: {
          primaryColor,
          secondaryColor,
          fontFamily,
          heroHeadline: heroHeadline || `Welcome to ${storeName}`,
          heroSubheadline: heroSubheadline || `Curated ${selectedIndustry} collection.`,
        },
        enabledSections,
        selectedProductIds,
      };

      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect directly to the newly created store's interactive preview
        router.push(`/stores/${data.store.id}/preview`);
        router.refresh();
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        productCategoryFilter === "ALL" || p.category === productCategoryFilter;
      const matchesSearch =
        !productSearch ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, productCategoryFilter, productSearch]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

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
        description="Configure client requirements, brand styling, catalog items, and architecture to generate a demo storefront."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            Step {currentStep} of 5
          </span>
        }
      />

      {/* Wizard Step Progression Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E4E9E5] overflow-x-auto">
        <div className="flex items-center justify-between min-w-[600px] gap-2">
          {[
            { step: 1, title: "Client & Details", icon: Building2 },
            { step: 2, title: "Template", icon: Layers },
            { step: 3, title: "Branding", icon: Palette },
            { step: 4, title: "Products", icon: Package },
            { step: 5, title: "Review & Deploy", icon: Sparkles },
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
          <span>Loading client directory, templates, and catalog products...</span>
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
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company} ({c.name} — {c.industry})
                    </option>
                  ))}
                </select>
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
                  URL Slug (Preview Path) <span className="text-[#C43D3D]">*</span>
                </label>
                <div className="flex items-center max-w-lg">
                  <span className="px-3 py-2 bg-[#F0F4F1] border border-r-0 border-[#E4E9E5] rounded-l-lg text-xs text-[#66736C] font-mono select-none">
                    /store/
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
                    className="w-full rounded-r-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] font-mono focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
                <p className="text-[11px] text-[#66736C]">
                  Unique address used for the sandboxed storefront preview.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#18231E]">
                  Industry Sector <span className="text-[#C43D3D]">*</span>
                </label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value as IndustryType)}
                  className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                >
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#18231E]">
                  Pitch Description / Goal
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes regarding client pitch requirements, hero messaging focus..."
                  className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: TEMPLATE SELECTION */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Step 2: Choose Storefront Template</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Select from our 8 high-converting e-commerce design architectures.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleTemplateSelect(tpl)}
                      className={cn(
                        "rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between group",
                        isSelected
                          ? "border-[#176B4D] bg-[#E2F5E9]/30 ring-2 ring-[#176B4D]"
                          : "border-[#E4E9E5] bg-white hover:border-[#CCD5CE] hover:shadow-xs"
                      )}
                    >
                      {/* Gradient composition preview */}
                      <div
                        className={cn(
                          "h-28 rounded-lg bg-gradient-to-br mb-3 p-3 flex flex-col justify-between relative overflow-hidden",
                          tpl.thumbnailGradient
                        )}
                      >
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/90 text-[#18231E] w-fit shadow-2xs">
                          {tpl.layoutType}
                        </span>
                        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs p-1 rounded w-fit">
                          <span
                            className="w-3 h-3 rounded-full border border-black/10"
                            style={{ backgroundColor: tpl.colorPalette.primary }}
                          />
                          <span
                            className="w-3 h-3 rounded-full border border-black/10"
                            style={{ backgroundColor: tpl.colorPalette.secondary }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-[#18231E] group-hover:text-[#176B4D]">
                            {tpl.name}
                          </h4>
                          {isSelected && (
                            <span className="h-5 w-5 rounded-full bg-[#176B4D] text-white flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <span className="inline-block text-[10px] font-medium text-[#176B4D] bg-[#E2F5E9] px-2 py-0.5 rounded">
                          {tpl.style}
                        </span>
                        <p className="text-xs text-[#66736C] line-clamp-2 mt-1">
                          {tpl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: BRANDING CONFIGURATION */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Step 3: Brand Styling & Storefront Sections</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Customize colors, typography and hero banners applied directly to the rendered storefront.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 max-w-2xl pt-2 border-t border-[#F0F4F1]">
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

              {/* Enabled Storefront Sections */}
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
            </CardContent>
          </Card>
        )}

        {/* STEP 4: PRODUCT SELECTION */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Step 4: Curate Demo Catalog</CardTitle>
                <p className="text-xs text-[#66736C] mt-0.5">
                  Select products to showcase in this storefront demonstration.
                </p>
              </div>
              <span className="text-xs bg-[#E2F5E9] text-[#176B4D] font-semibold px-2.5 py-1 rounded-full">
                {selectedProductIds.length} Products Selected
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <SearchInput
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onClear={() => setProductSearch("")}
                  placeholder="Search products by title or SKU..."
                  wrapperClassName="max-w-md w-full"
                />
                <FilterSelect
                  label="Category"
                  options={[
                    { value: "ALL", label: "All Categories" },
                    ...INDUSTRY_OPTIONS.map((i) => ({ value: i, label: i })),
                  ]}
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleProduct(prod.id)}
                      className={cn(
                        "p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all select-none",
                        isSelected
                          ? "border-[#176B4D] bg-[#E2F5E9]/30 ring-1 ring-[#176B4D]"
                          : "border-[#E4E9E5] bg-white hover:border-[#CCD5CE]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by div click
                        className="mt-1 rounded border-[#CCD5CE] text-[#176B4D] focus:ring-[#176B4D]"
                      />
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                          prod.thumbnailColor
                        )}
                      >
                        {prod.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#18231E] truncate">
                          {prod.name}
                        </p>
                        <p className="text-[10px] text-[#66736C] font-mono">{prod.sku}</p>
                        <div className="flex items-center justify-between mt-1 text-xs">
                          <span className="font-semibold text-[#18231E]">
                            ${prod.price.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#66736C]">{prod.category}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
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
                      <strong>Preview Slug:</strong>{" "}
                      <span className="font-mono text-[#176B4D]">/store/{slug}</span>
                    </p>
                    <p>
                      <strong>Industry:</strong> {selectedIndustry}
                    </p>
                  </div>
                </div>

                {/* Architecture & Theme Summary */}
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E9E5] space-y-3">
                  <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                    Template & Visual Branding
                  </h4>
                  <div className="text-xs space-y-1.5 text-[#4F5D56]">
                    <p>
                      <strong>Template:</strong> {selectedTemplate?.name} ({selectedTemplate?.style})
                    </p>
                    <div className="flex items-center gap-2">
                      <strong>Brand Colors:</strong>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <span className="font-mono text-[11px]">{primaryColor}</span>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 inline-block ml-2"
                        style={{ backgroundColor: secondaryColor }}
                      />
                      <span className="font-mono text-[11px]">{secondaryColor}</span>
                    </div>
                    <p>
                      <strong>Typography:</strong> {fontFamily.split(",")[0]}
                    </p>
                    <p>
                      <strong>Catalog:</strong> {selectedProductIds.length} Products Included
                    </p>
                  </div>
                </div>
              </div>

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
          >
            Generate Demo Storefront
          </Button>
        )}
      </div>

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
              Company / Brand Name <span className="text-[#C43D3D]">*</span>
            </label>
            <input
              type="text"
              required
              value={newClientCompany}
              onChange={(e) => setNewClientCompany(e.target.value)}
              placeholder="e.g. Zenith Optical"
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1">
              Primary Contact Lead
            </label>
            <input
              type="text"
              value={newClientLead}
              onChange={(e) => setNewClientLead(e.target.value)}
              placeholder="e.g. Maya Lin"
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#F0F4F1]">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setQuickClientModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreatingClient}>
              Save Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
