"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Eye,
  RefreshCw,
  Layout,
  Palette,
  ChevronRight,
  ArrowRight,
  Monitor,
  Smartphone,
  X,
  ShoppingBag,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DESIGN_TEMPLATES, getDesignTemplateById } from "@/constants/design-templates";
import { COLOR_THEMES, getThemeById } from "@/constants/themes";
import { cn } from "@/utils/cn";

type ActiveTab = "templates" | "themes";
type DevicePreset = "desktop" | "mobile";

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("templates");

  // Search & Filters for Design Templates
  const [templateSearch, setTemplateSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");

  // Search & Filters for Colour Themes
  const [themeSearch, setThemeSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "LIGHT" | "DARK">("ALL");

  // Interactive Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [modalTemplateId, setModalTemplateId] = useState<string>("tmpl_modern_minimal");
  const [modalThemeId, setModalThemeId] = useState<string>("theme_nordic_pine");
  const [devicePreset, setDevicePreset] = useState<DevicePreset>("desktop");

  // Apply Template to Existing Store State
  const [applyModalTemplate, setApplyModalTemplate] = useState<{ id: string; name: string } | null>(null);
  const [storesList, setStoresList] = useState<Array<{ id: string; name: string; slug: string; status: string; templateName?: string }>>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const handleOpenApplyModal = async (templateId: string, templateName: string) => {
    setApplyModalTemplate({ id: templateId, name: templateName });
    setApplySuccess(null);
    setApplyError(null);
    try {
      const res = await fetch("/api/stores");
      if (res.ok) {
        const data = await res.json();
        const stores = data.stores || [];
        setStoresList(stores);
        if (stores.length > 0) {
          setSelectedStoreId(stores[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch stores:", err);
    }
  };

  const handleConfirmApplyTemplate = async () => {
    if (!applyModalTemplate || !selectedStoreId) return;
    setApplyLoading(true);
    setApplyError(null);
    try {
      const res = await fetch(`/api/stores/${selectedStoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: applyModalTemplate.id,
          templateName: applyModalTemplate.name,
          serverAutoVersion: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to apply template to store");
      }
      const storeObj = storesList.find((s) => s.id === selectedStoreId);
      setApplySuccess(`Template "${applyModalTemplate.name}" successfully applied to "${storeObj?.name || 'store'}"!`);
    } catch (err: unknown) {
      setApplyError((err as Error)?.message || "Failed to apply template");
    } finally {
      setApplyLoading(false);
    }
  };

  const industryOptions = [
    { value: "ALL", label: "All Industries" },
    { value: "Home & Living", label: "Home & Living" },
    { value: "Electronics & Gadgets", label: "Electronics & Gadgets" },
    { value: "Fashion & Apparel", label: "Fashion & Apparel" },
    { value: "Beauty & Cosmetics", label: "Beauty & Cosmetics" },
    { value: "Food & Gourmet", label: "Food & Gourmet" },
    { value: "Sports & Outdoors", label: "Sports & Outdoors" },
    { value: "Health & Wellness", label: "Health & Wellness" },
    { value: "Luxury Goods", label: "Luxury Goods" },
  ];

  const modeOptions = [
    { value: "ALL", label: "All Themes (12)" },
    { value: "LIGHT", label: "Light Themes (10)" },
    { value: "DARK", label: "Dark Themes (2)" },
  ];

  // Filtered Design Templates
  const filteredTemplates = useMemo(() => {
    return DESIGN_TEMPLATES.filter((tpl) => {
      const q = templateSearch.toLowerCase();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.layoutFamily.toLowerCase().includes(q) ||
        tpl.tagline.toLowerCase().includes(q) ||
        tpl.compatibleIndustries.some((i) => i.toLowerCase().includes(q));

      const matchesIndustry =
        industryFilter === "ALL" ||
        tpl.compatibleIndustries.includes(industryFilter);

      return matchesSearch && matchesIndustry;
    });
  }, [templateSearch, industryFilter]);

  // Filtered Colour Themes
  const filteredThemes = useMemo(() => {
    return COLOR_THEMES.filter((th) => {
      const q = themeSearch.toLowerCase();
      const matchesSearch =
        !q ||
        th.name.toLowerCase().includes(q) ||
        th.description.toLowerCase().includes(q) ||
        th.suitableIndustries.some((i) => i.toLowerCase().includes(q));

      const matchesMode =
        modeFilter === "ALL" ||
        (modeFilter === "LIGHT" && !th.isDark) ||
        (modeFilter === "DARK" && th.isDark);

      return matchesSearch && matchesMode;
    });
  }, [themeSearch, modeFilter]);

  const openInteractivePreview = (templateId: string, themeId: string) => {
    setModalTemplateId(templateId);
    setModalThemeId(themeId);
    setPreviewModalOpen(true);
  };

  const activeModalTemplate = useMemo(
    () => getDesignTemplateById(modalTemplateId) || DESIGN_TEMPLATES[0],
    [modalTemplateId]
  );

  const activeModalTheme = useMemo(
    () => getThemeById(modalThemeId) || COLOR_THEMES[0],
    [modalThemeId]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Storefront Design & Theme System"
        description="Dual-layer customization architecture: 8 distinct website design templates paired independently with 12 WCAG-accessible colour schemes."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            8 Layouts + 12 Themes
          </span>
        }
      >
        <Link href="/stores/new">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          >
            Create New Store
          </Button>
        </Link>
      </PageHeader>

      {/* Dual Tab Navigation */}
      <div className="flex border-b border-[#E4E9E5] bg-white rounded-t-xl px-4 pt-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={cn(
            "pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer",
            activeTab === "templates"
              ? "border-[#176B4D] text-[#176B4D]"
              : "border-transparent text-[#66736C] hover:text-[#18231E]"
          )}
        >
          <Layout className="h-4 w-4" />
          <span>Website Design Templates</span>
          <span className="bg-[#E2F5E9] text-[#176B4D] text-[10px] px-2 py-0.2 rounded-full font-bold">
            8 Layouts
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("themes")}
          className={cn(
            "pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer",
            activeTab === "themes"
              ? "border-[#176B4D] text-[#176B4D]"
              : "border-transparent text-[#66736C] hover:text-[#18231E]"
          )}
        >
          <Palette className="h-4 w-4" />
          <span>Colour Themes &amp; Palettes</span>
          <span className="bg-[#E2F5E9] text-[#176B4D] text-[10px] px-2 py-0.2 rounded-full font-bold">
            12 Themes
          </span>
        </button>
      </div>

      {/* TAB 1: WEBSITE DESIGN TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9E5]">
            <SearchInput
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              onClear={() => setTemplateSearch("")}
              placeholder="Search layout by name, style, or industry..."
              wrapperClassName="max-w-md w-full"
            />

            <div className="flex items-center gap-2">
              <FilterSelect
                label="Industry"
                options={industryOptions}
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
              />

              {(templateSearch || industryFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTemplateSearch("");
                    setIndustryFilter("ALL");
                  }}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Grid */}
          {filteredTemplates.length === 0 ? (
            <EmptyState
              title="No design templates match criteria"
              description="Try adjusting your industry filter or search query."
              actionLabel="Clear Filters"
              onAction={() => {
                setTemplateSearch("");
                setIndustryFilter("ALL");
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  hoverEffect
                  className="flex flex-col overflow-hidden group border-[#E4E9E5]"
                >
                  {/* Visual Layout Mockup Banner */}
                  <div
                    className={cn(
                      "h-44 w-full bg-gradient-to-br p-4 flex flex-col justify-between relative border-b border-[#E4E9E5] overflow-hidden",
                      template.thumbnailGradient
                    )}
                  >
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/95 text-[#18231E] shadow-2xs border border-white/20">
                        {template.layoutFamily}
                      </span>
                      {template.featured && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#176B4D] text-white shadow-2xs">
                          Popular
                        </span>
                      )}
                    </div>

                    {/* Architecture Pills Overlay */}
                    <div className="z-10 bg-white/90 backdrop-blur-xs p-2 rounded-lg border border-black/5 shadow-2xs space-y-1">
                      <div className="text-[9px] text-[#66736C] font-mono flex items-center justify-between">
                        <span>Header:</span>
                        <span className="font-semibold text-[#18231E]">{template.headerLayout}</span>
                      </div>
                      <div className="text-[9px] text-[#66736C] font-mono flex items-center justify-between">
                        <span>Hero:</span>
                        <span className="font-semibold text-[#18231E]">{template.heroLayout}</span>
                      </div>
                      <div className="text-[9px] text-[#66736C] font-mono flex items-center justify-between">
                        <span>Cards:</span>
                        <span className="font-semibold text-[#18231E]">{template.cardLayout}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-semibold text-base text-[#18231E] group-hover:text-[#176B4D] transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-[11px] font-medium text-[#176B4D] mt-0.5">
                        {template.tagline}
                      </p>
                      <p className="text-xs text-[#66736C] mt-2.5 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {template.compatibleIndustries.slice(0, 3).map((ind) => (
                          <span
                            key={ind}
                            className="text-[9px] bg-[#FAF9F6] text-[#66736C] px-1.5 py-0.5 rounded border border-[#E4E9E5]"
                          >
                            {ind}
                          </span>
                        ))}
                        {template.compatibleIndustries.length > 3 && (
                          <span className="text-[9px] text-[#8F9D95] px-1 py-0.5">
                            +{template.compatibleIndustries.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#F0F4F1] flex items-center justify-between text-[11px] text-[#66736C]">
                      <span>Layout Architecture</span>
                      <span className="font-semibold text-[#18231E]">
                        Independent Theme Support
                      </span>
                    </div>
                  </CardContent>

                  {/* Footer Action Buttons */}
                  <CardFooter className="p-3 bg-[#FAF9F6] border-t border-[#F0F4F1] flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => openInteractivePreview(template.id, modalThemeId)}
                      leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs text-[#176B4D] border-[#C8E8D5] hover:bg-[#E2F5E9]"
                      onClick={() => handleOpenApplyModal(template.id, template.name)}
                    >
                      Apply to Store
                    </Button>
                    <Link
                      href={`/stores/new?templateId=${template.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full text-xs"
                        rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                      >
                        New Store
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COLOUR THEMES & PALETTES */}
      {activeTab === "themes" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9E5]">
            <SearchInput
              value={themeSearch}
              onChange={(e) => setThemeSearch(e.target.value)}
              onClear={() => setThemeSearch("")}
              placeholder="Search colour themes by name or industry..."
              wrapperClassName="max-w-md w-full"
            />

            <div className="flex items-center gap-2">
              <FilterSelect
                label="Mode"
                options={modeOptions}
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as "ALL" | "LIGHT" | "DARK")}
              />

              {(themeSearch || modeFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setThemeSearch("");
                    setModeFilter("ALL");
                  }}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Grid */}
          {filteredThemes.length === 0 ? (
            <EmptyState
              title="No colour themes match criteria"
              description="Try adjusting your theme mode filter or search query."
              actionLabel="Clear Filters"
              onAction={() => {
                setThemeSearch("");
                setModeFilter("ALL");
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredThemes.map((theme) => (
                <Card
                  key={theme.id}
                  hoverEffect
                  className="flex flex-col overflow-hidden group border-[#E4E9E5]"
                >
                  {/* Theme Palette Swatches Header */}
                  <div
                    className="p-5 flex flex-col justify-between border-b border-[#E4E9E5] relative"
                    style={{ backgroundColor: theme.tokens.background }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                        style={{
                          backgroundColor: theme.tokens.badgeBg,
                          color: theme.tokens.badgeText,
                          borderColor: theme.tokens.border,
                        }}
                      >
                        {theme.isDark ? "DARK PALETTE" : "LIGHT PALETTE"}
                      </span>
                      <span
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: theme.tokens.surface,
                          color: theme.tokens.text,
                          borderColor: theme.tokens.border,
                        }}
                      >
                        WCAG AA ≥ 4.5:1
                      </span>
                    </div>

                    {/* 4 Large Swatches */}
                    <div className="flex items-center justify-center gap-2.5 py-2">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="w-10 h-10 rounded-xl border border-black/15 shadow-xs"
                          style={{ backgroundColor: theme.tokens.primary }}
                          title={`Primary: ${theme.tokens.primary}`}
                        />
                        <span className="text-[8px] font-mono uppercase text-[#66736C]">
                          Pri
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="w-10 h-10 rounded-xl border border-black/15 shadow-xs"
                          style={{ backgroundColor: theme.tokens.secondary }}
                          title={`Secondary: ${theme.tokens.secondary}`}
                        />
                        <span className="text-[8px] font-mono uppercase text-[#66736C]">
                          Sec
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="w-10 h-10 rounded-xl border border-black/15 shadow-xs"
                          style={{ backgroundColor: theme.tokens.accent }}
                          title={`Accent: ${theme.tokens.accent}`}
                        />
                        <span className="text-[8px] font-mono uppercase text-[#66736C]">
                          Acc
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="w-10 h-10 rounded-xl border border-black/15 shadow-xs"
                          style={{ backgroundColor: theme.tokens.surface }}
                          title={`Surface: ${theme.tokens.surface}`}
                        />
                        <span className="text-[8px] font-mono uppercase text-[#66736C]">
                          Surf
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-semibold text-base text-[#18231E] group-hover:text-[#176B4D] transition-colors">
                        {theme.name}
                      </h3>
                      <p className="text-xs text-[#66736C] mt-1.5 line-clamp-2 leading-relaxed">
                        {theme.description}
                      </p>

                      {/* Mini Live Preview Widget */}
                      <div
                        className="mt-3 p-2.5 rounded-lg border flex items-center justify-between text-xs"
                        style={{
                          backgroundColor: theme.tokens.surface,
                          borderColor: theme.tokens.border,
                          color: theme.tokens.text,
                        }}
                      >
                        <span className="text-[10px] font-medium truncate">
                          UI Component Sample
                        </span>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded shadow-2xs"
                          style={{
                            backgroundColor: theme.tokens.primary,
                            color: theme.tokens.cardBg,
                          }}
                        >
                          Button
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {theme.suitableIndustries.map((ind) => (
                          <span
                            key={ind}
                            className="text-[9px] bg-[#FAF9F6] text-[#66736C] px-1.5 py-0.5 rounded border border-[#E4E9E5]"
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#F0F4F1] flex items-center justify-between text-[11px] text-[#66736C]">
                      <span>Contrast Quality</span>
                      <span className="font-semibold text-emerald-700">
                        High Contrast Accessible
                      </span>
                    </div>
                  </CardContent>

                  {/* Card Footer Actions */}
                  <CardFooter className="p-3 bg-[#FAF9F6] border-t border-[#F0F4F1] flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openInteractivePreview(modalTemplateId, theme.id)}
                      leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                    >
                      Pairing Preview
                    </Button>
                    <Link
                      href={`/stores/new?themeId=${theme.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full text-xs"
                        rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                      >
                        Use Theme
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Pairing Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E4E9E5] w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E4E9E5] bg-[#FAF9F6] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E2F5E9] text-[#176B4D] flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#18231E]">
                    Interactive Architecture &amp; Theme Pairing Canvas
                  </h2>
                  <p className="text-[11px] text-[#66736C]">
                    Preview any of the 8 design layouts combined dynamically with any of the 12 colour themes.
                  </p>
                </div>
              </div>

              {/* Viewport Presets & Close */}
              <div className="flex items-center gap-2">
                <div className="bg-white p-0.5 rounded-lg border border-[#CCD5CE] flex items-center">
                  <button
                    type="button"
                    onClick={() => setDevicePreset("desktop")}
                    className={cn(
                      "p-1.5 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-colors",
                      devicePreset === "desktop"
                        ? "bg-[#176B4D] text-white font-semibold"
                        : "text-[#66736C] hover:text-[#18231E]"
                    )}
                    title="Desktop View"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevicePreset("mobile")}
                    className={cn(
                      "p-1.5 rounded-md text-xs flex items-center gap-1 cursor-pointer transition-colors",
                      devicePreset === "mobile"
                        ? "bg-[#176B4D] text-white font-semibold"
                        : "text-[#66736C] hover:text-[#18231E]"
                    )}
                    title="Mobile View"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Dynamic Controls Bar */}
            <div className="px-4 py-3 bg-white border-b border-[#E4E9E5] grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
              {/* Select Design Template */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66736C] block mb-1">
                  1. Choose Design Layout (8 Options)
                </label>
                <select
                  value={modalTemplateId}
                  onChange={(e) => setModalTemplateId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden bg-white cursor-pointer"
                >
                  {DESIGN_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.layoutFamily})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Colour Theme */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66736C] block mb-1">
                  2. Choose Colour Theme (12 Options)
                </label>
                <select
                  value={modalThemeId}
                  onChange={(e) => setModalThemeId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden bg-white cursor-pointer"
                >
                  {COLOR_THEMES.map((th) => (
                    <option key={th.id} value={th.id}>
                      {th.name} {th.isDark ? "(Dark Mode)" : "(Light Mode)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Simulated Live Canvas */}
            <div className="flex-1 bg-[#F0F4F1] p-4 overflow-y-auto flex justify-center">
              <div
                className={cn(
                  "rounded-xl border shadow-lg transition-all overflow-hidden flex flex-col duration-300",
                  devicePreset === "mobile"
                    ? "w-[390px] min-h-[700px]"
                    : "w-full max-w-4xl min-h-[600px]"
                )}
                style={{
                  backgroundColor: activeModalTheme.tokens.background,
                  color: activeModalTheme.tokens.text,
                  borderColor: activeModalTheme.tokens.border,
                }}
              >
                {/* Header Simulation */}
                <header
                  className="p-3 border-b flex items-center justify-between"
                  style={{
                    backgroundColor: activeModalTheme.tokens.surface,
                    borderColor: activeModalTheme.tokens.border,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: activeModalTheme.tokens.primary,
                        color: activeModalTheme.tokens.cardBg,
                      }}
                    >
                      G
                    </div>
                    <span className="font-bold text-sm tracking-tight">
                      GridRetail Store
                    </span>
                  </div>

                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
                    style={{
                      borderColor: activeModalTheme.tokens.border,
                      backgroundColor: activeModalTheme.tokens.badgeBg,
                      color: activeModalTheme.tokens.badgeText,
                    }}
                  >
                    Header: {activeModalTemplate.headerLayout}
                  </span>
                </header>

                {/* Hero Simulation */}
                <div
                  className="p-6 border-b flex flex-col justify-center space-y-3"
                  style={{
                    backgroundColor: activeModalTheme.tokens.surface,
                    borderColor: activeModalTheme.tokens.border,
                  }}
                >
                  <span
                    className="w-fit text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{
                      backgroundColor: activeModalTheme.tokens.badgeBg,
                      color: activeModalTheme.tokens.badgeText,
                    }}
                  >
                    Hero Style: {activeModalTemplate.heroLayout}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {activeModalTemplate.name}
                  </h1>
                  <p
                    className="text-xs max-w-lg leading-relaxed"
                    style={{ color: activeModalTheme.tokens.textMuted }}
                  >
                    {activeModalTemplate.description}
                  </p>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: activeModalTheme.tokens.primary,
                        color: activeModalTheme.tokens.cardBg,
                      }}
                    >
                      Explore Collection
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg text-xs font-semibold border"
                      style={{
                        backgroundColor: activeModalTheme.tokens.surface,
                        borderColor: activeModalTheme.tokens.border,
                        color: activeModalTheme.tokens.text,
                      }}
                    >
                      Learn More
                    </button>
                  </div>
                </div>

                {/* Product Cards Simulation */}
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-sm">
                      Featured Products ({activeModalTemplate.cardLayout})
                    </h2>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: activeModalTheme.tokens.textMuted }}
                    >
                      Theme: {activeModalTheme.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { name: "Nordic Ceramic Vessel", price: "$48.00" },
                      { name: "Minimalist Brass Lamp", price: "$120.00" },
                      { name: "Organic Linen Cushion", price: "$34.00" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-3 border space-y-2 flex flex-col justify-between"
                        style={{
                          backgroundColor: activeModalTheme.tokens.cardBg,
                          borderColor: activeModalTheme.tokens.border,
                        }}
                      >
                        <div
                          className="h-24 rounded-lg flex items-center justify-center font-bold text-xs"
                          style={{
                            backgroundColor: activeModalTheme.tokens.secondary,
                            color: activeModalTheme.tokens.text,
                          }}
                        >
                          <ShoppingBag className="h-6 w-6 opacity-40" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs truncate">
                            {item.name}
                          </p>
                          <p
                            className="font-bold text-xs mt-1"
                            style={{ color: activeModalTheme.tokens.primary }}
                          >
                            {item.price}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="w-full py-1.5 rounded-md text-[10px] font-bold text-center"
                          style={{
                            backgroundColor: activeModalTheme.tokens.primary,
                            color: activeModalTheme.tokens.cardBg,
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Simulation */}
                <footer
                  className="p-3 border-t text-[10px] text-center"
                  style={{
                    backgroundColor: activeModalTheme.tokens.surface,
                    borderColor: activeModalTheme.tokens.border,
                    color: activeModalTheme.tokens.textMuted,
                  }}
                >
                  &copy; 2026 GridRetail Storefront &bull; Styled with {activeModalTheme.name}
                </footer>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-white border-t border-[#E4E9E5] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#18231E]">
                  Selected Configuration:
                </span>
                <span className="bg-[#E2F5E9] text-[#176B4D] font-bold px-2.5 py-0.5 rounded-full border border-[#C8E8D5]">
                  {activeModalTemplate.name} + {activeModalTheme.name}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[#176B4D] border-[#C8E8D5] hover:bg-[#E2F5E9]"
                  onClick={() => {
                    setPreviewModalOpen(false);
                    handleOpenApplyModal(activeModalTemplate.id, activeModalTemplate.name);
                  }}
                >
                  Apply to Existing Store
                </Button>
                <Link
                  href={`/stores/new?templateId=${activeModalTemplate.id}&themeId=${activeModalTheme.id}`}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Create Store with this Style
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Template to Existing Store Modal */}
      {applyModalTemplate && (
        <div
          data-testid="apply-template-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Apply Template to Existing Store
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Assign <strong>{applyModalTemplate.name}</strong> to one of your active projects. Products, services, appointments, and business info will remain intact.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalTemplate(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {applySuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3">
                <p className="font-semibold">{applySuccess}</p>
                <div className="flex items-center gap-2">
                  <Link href={`/stores/${selectedStoreId}/edit`}>
                    <Button variant="primary" size="sm" className="bg-[#176B4D] text-white">
                      Open in Visual Editor
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApplyModalTemplate(null)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {applyError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {applyError}
                  </div>
                )}

                <div>
                  <label className="font-bold text-stone-900 block mb-1.5">
                    Select Target Storefront
                  </label>
                  {storesList.length === 0 ? (
                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-500">
                      Loading stores or no stores available...
                    </div>
                  ) : (
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                    >
                      {storesList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.slug}) — {st.status} {st.templateName ? `[Current: ${st.templateName}]` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 space-y-1">
                  <div className="font-semibold text-stone-800">What happens when you apply:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-stone-500">
                    <li>The store&apos;s template pairing is updated to {applyModalTemplate.name}.</li>
                    <li>The visual editor layout hierarchy adapts to this template family.</li>
                    <li>Your existing products, appointments, leads, and custom branding tokens are preserved.</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApplyModalTemplate(null)}
                    disabled={applyLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmApplyTemplate}
                    disabled={applyLoading || !selectedStoreId}
                    className="bg-[#176B4D] hover:bg-[#12533B] text-white"
                  >
                    {applyLoading ? "Applying Template..." : "Apply Template"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
