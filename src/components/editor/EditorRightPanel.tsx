"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  Type,
  Layout,
  Palette,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  X,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { RightPanelTab } from "./types";
import { SectionInstance } from "@/types/section";
import { getSectionDefinition } from "@/constants/sections";
import { StoreStylingTokens, StoreBranding } from "@/types/store";
import { BusinessProfile } from "@/types/business-profile";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface EditorRightPanelProps {
  isOpen: boolean;
  selectedSection: SectionInstance | null;
  onCloseSection: () => void;
  onUpdateSectionSettings: (sectionId: string, patch: Record<string, unknown>) => void;
  onToggleVisibility: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  // Global Store & Styling Props
  storeName: string;
  onUpdateStoreName: (name: string) => void;
  branding: StoreBranding;
  onUpdateBranding: (patch: Partial<StoreBranding>) => void;
  styling: StoreStylingTokens;
  onUpdateStyling: (patch: Partial<StoreStylingTokens>) => void;
  businessProfile?: BusinessProfile;
}

export function EditorRightPanel({
  isOpen,
  selectedSection,
  onCloseSection,
  onUpdateSectionSettings,
  onToggleVisibility,
  onDuplicateSection,
  onDeleteSection,
  storeName,
  onUpdateStoreName,
  branding,
  onUpdateBranding,
  styling,
  onUpdateStyling,
  businessProfile,
}: EditorRightPanelProps) {
  const [activeTab, setActiveTab] = useState<RightPanelTab>("content");
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!isOpen) return null;

  const sectionDef = selectedSection ? getSectionDefinition(selectedSection.type) : null;
  const settings = (selectedSection?.settings || {}) as Record<string, unknown>;

  const handleFieldChange = (key: string, value: unknown) => {
    if (!selectedSection) return;
    onUpdateSectionSettings(selectedSection.id, { [key]: value });
  };

  const handleConfirmRegenerate = async () => {
    if (!selectedSection) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/generation/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: businessProfile || {
            businessName: storeName,
            industry: "Professional Services",
            businessCategory: "General Business",
            description: "",
            websiteType: "lead_gen",
          },
          sectionType: selectedSection.type,
          existingSection: selectedSection,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.section?.settings) {
          onUpdateSectionSettings(selectedSection.id, data.section.settings);
        }
        setRegenModalOpen(false);
      }
    } catch {
      // Fallback: graceful closure
      setRegenModalOpen(false);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <aside
      data-testid="advanced-visual-editor-inspector"
      className="w-80 md:w-88 bg-white border-l border-[#E4E9E5] flex flex-col shrink-0 h-full select-none z-20 shadow-2xs"
    >
      {/* PANEL HEADER */}
      <div className="p-3 border-b border-[#E4E9E5] bg-[#FAF9F6] flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-stone-900 truncate">
              {selectedSection ? sectionDef?.name || selectedSection.type : "Global Store Inspector"}
            </span>
            {selectedSection && (
              <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded-sm bg-stone-200 text-stone-700">
                {sectionDef?.category || "section"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-stone-400 block font-mono truncate">
            {selectedSection ? selectedSection.id : "Global typography, colors & layout"}
          </span>
        </div>

        {selectedSection && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleVisibility(selectedSection.id)}
              className={cn(
                "p-1 rounded-md transition-colors cursor-pointer",
                selectedSection.visible
                  ? "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  : "text-amber-600 bg-amber-50"
              )}
              title={selectedSection.visible ? "Hide Section" : "Show Section"}
            >
              {selectedSection.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onDuplicateSection(selectedSection.id)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              title="Duplicate Section"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteSection(selectedSection.id)}
              className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
              title="Delete Section"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onCloseSection}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer ml-1"
              title="Deselect Section"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* INSPECTOR TABS (Only when section is selected) */}
      {selectedSection && (
        <div className="flex items-center border-b border-[#E4E9E5] bg-white p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer",
              activeTab === "content"
                ? "bg-[#E2F5E9] text-[#176B4D]"
                : "text-stone-500 hover:text-stone-800"
            )}
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>Content</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("typography")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer",
              activeTab === "typography"
                ? "bg-[#E2F5E9] text-[#176B4D]"
                : "text-stone-500 hover:text-stone-800"
            )}
          >
            <Type className="h-3 w-3" />
            <span>Type</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("layout")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer",
              activeTab === "layout"
                ? "bg-[#E2F5E9] text-[#176B4D]"
                : "text-stone-500 hover:text-stone-800"
            )}
          >
            <Layout className="h-3 w-3" />
            <span>Layout</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("appearance")}
            className={cn(
              "flex-1 py-1 px-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer",
              activeTab === "appearance"
                ? "bg-[#E2F5E9] text-[#176B4D]"
                : "text-stone-500 hover:text-stone-800"
            )}
          >
            <Palette className="h-3 w-3" />
            <span>Style</span>
          </button>
        </div>
      )}

      {/* INSPECTOR BODY */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {selectedSection ? (
          <>
            {/* TAB: CONTENT CONTROLS */}
            {activeTab === "content" && (
              <div className="space-y-3.5">
                {/* AI Context Copy Card */}
                <div className="p-2.5 rounded-xl border border-[#C8E8D5] bg-[#F4F9F6] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#176B4D] flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-[#176B4D]" />
                      <span>Context Copy Regeneration</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-[#4F5D56]">
                    Refresh this section&apos;s headlines and messaging using your store&apos;s business profile.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRegenModalOpen(true)}
                    className="w-full py-1 px-2.5 rounded-md bg-[#176B4D] hover:bg-[#12533B] text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Regenerate with Business Context</span>
                  </button>
                </div>

                {/* Headline / Primary Title */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={String(settings.headline || settings.title || "")}
                    onChange={(e) => handleFieldChange("headline", e.target.value)}
                    placeholder="Enter section headline..."
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>

                {/* Subheadline / Subtitle / Description */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Subheadline &amp; Description
                  </label>
                  <textarea
                    rows={3}
                    value={String(settings.subheadline || settings.description || settings.subtitle || "")}
                    onChange={(e) => handleFieldChange("subheadline", e.target.value)}
                    placeholder="Enter supporting description..."
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>

                {/* Primary Call-to-Action */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 uppercase mb-1">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={String(settings.ctaText || "")}
                      onChange={(e) => handleFieldChange("ctaText", e.target.value)}
                      placeholder="e.g. Shop Now"
                      className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 uppercase mb-1">
                      Destination URL
                    </label>
                    <input
                      type="text"
                      value={String(settings.ctaUrl || "")}
                      onChange={(e) => handleFieldChange("ctaUrl", e.target.value)}
                      placeholder="e.g. /collections"
                      className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>
                </div>

                {/* Secondary Call-to-Action */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 uppercase mb-1">
                      Secondary Button
                    </label>
                    <input
                      type="text"
                      value={String(settings.secondaryCtaText || "")}
                      onChange={(e) => handleFieldChange("secondaryCtaText", e.target.value)}
                      placeholder="e.g. Learn More"
                      className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-700 uppercase mb-1">
                      Secondary URL
                    </label>
                    <input
                      type="text"
                      value={String(settings.secondaryCtaUrl || "")}
                      onChange={(e) => handleFieldChange("secondaryCtaUrl", e.target.value)}
                      placeholder="e.g. #story"
                      className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>
                </div>

                {/* Image & Banner Controls */}
                <div className="pt-2 border-t border-stone-100">
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Image / Media Asset URL
                  </label>
                  <input
                    type="text"
                    value={String(settings.imageUrl || settings.backgroundImageUrl || settings.bannerUrl || "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFieldChange("imageUrl", val);
                      handleFieldChange("backgroundImageUrl", val);
                      handleFieldChange("bannerUrl", val);
                    }}
                    placeholder="https://images.unsplash.com/... or /images/..."
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>

                {/* Badge Text */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Badge / Tagline
                  </label>
                  <input
                    type="text"
                    value={String(settings.badgeText || settings.tagline || "")}
                    onChange={(e) => handleFieldChange("badgeText", e.target.value)}
                    placeholder="e.g. Flagship Edition"
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
              </div>
            )}

            {/* TAB: TYPOGRAPHY CONTROLS */}
            {activeTab === "typography" && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Font Family
                  </label>
                  <select
                    value={String(settings.fontFamily || branding.fontFamily || "Inter, sans-serif")}
                    onChange={(e) => handleFieldChange("fontFamily", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  >
                    <option value="Inter, sans-serif">Inter (Clean Modern Sans)</option>
                    <option value="'Playfair Display', serif">Playfair Display (Editorial Serif)</option>
                    <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans (Geometric)</option>
                    <option value="'Fraunces', serif">Fraunces (Warm Heritage Serif)</option>
                    <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech Monospace)</option>
                    <option value="'Syne', sans-serif">Syne (Brutalist Statement)</option>
                    <option value="'Cormorant Garamond', serif">Cormorant Garamond (Luxury Atelier)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Headline Typography Scale
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "compact", label: "Compact", hint: "Balanced" },
                      { id: "balanced", label: "Balanced", hint: "Standard" },
                      { id: "prominent", label: "Prominent", hint: "Large" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onUpdateStyling({ typographyScale: s.id as StoreStylingTokens["typographyScale"] })}
                        className={cn(
                          "p-2 rounded-lg border text-left transition-all cursor-pointer",
                          styling.typographyScale === s.id
                            ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                            : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                        )}
                      >
                        <span className="block text-xs">{s.label}</span>
                        <span className="block text-[9px] text-stone-400">{s.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Text Alignment
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "left", label: "Left" },
                      { id: "center", label: "Center" },
                      { id: "right", label: "Right" },
                    ].map((align) => (
                      <button
                        key={align.id}
                        type="button"
                        onClick={() => handleFieldChange("textAlign", align.id)}
                        className={cn(
                          "py-1.5 text-center text-xs rounded-lg border transition-all cursor-pointer",
                          settings.textAlign === align.id
                            ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        {align.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LAYOUT & SPACING CONTROLS */}
            {activeTab === "layout" && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Content Width
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "compact", label: "Compact (max-w-4xl)" },
                      { id: "normal", label: "Normal (max-w-6xl)" },
                      { id: "full", label: "Full Bleed" },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onUpdateStyling({ contentWidth: w.id as StoreStylingTokens["contentWidth"] })}
                        className={cn(
                          "py-1.5 text-center text-[11px] rounded-lg border transition-all cursor-pointer",
                          styling.contentWidth === w.id
                            ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        {w.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Section Spacing Density
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "compact", label: "Compact (py-8)" },
                      { id: "normal", label: "Normal (py-16)" },
                      { id: "generous", label: "Generous (py-24)" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onUpdateStyling({ spacingDensity: s.id as StoreStylingTokens["spacingDensity"] })}
                        className={cn(
                          "py-1.5 text-center text-[11px] rounded-lg border transition-all cursor-pointer",
                          styling.spacingDensity === s.id
                            ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        {s.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section Layout Variant */}
                {sectionDef?.availableLayouts && sectionDef.availableLayouts.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Layout Arrangement ({sectionDef.availableLayouts.length} Options)
                    </label>
                    <div className="space-y-1">
                      {sectionDef.availableLayouts.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            if (!selectedSection) return;
                            onUpdateSectionSettings(selectedSection.id, { layoutVariant: l.id });
                          }}
                          className={cn(
                            "w-full text-left p-2 rounded-lg border text-xs transition-all cursor-pointer",
                            (settings.layoutVariant === l.id || selectedSection.layoutVariant === l.id)
                              ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                          )}
                        >
                          <span className="block font-semibold">{l.label}</span>
                          {l.previewHint && (
                            <span className="block text-[10px] text-stone-400 mt-0.5">{l.previewHint}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: APPEARANCE & STYLING */}
            {activeTab === "appearance" && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Card Style Treatment
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "bordered", label: "Bordered Minimal" },
                      { id: "elevated", label: "Elevated Shadow" },
                      { id: "flat", label: "Flat Subsurface" },
                      { id: "floating", label: "Floating Layer" },
                      { id: "soft_rounded", label: "Soft Rounded" },
                      { id: "block_solid", label: "Block Solid" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onUpdateStyling({ cardStyle: c.id as StoreStylingTokens["cardStyle"] })}
                        className={cn(
                          "p-2 rounded-lg border text-left text-xs transition-all cursor-pointer",
                          styling.cardStyle === c.id
                            ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                            : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Shadow Elevation
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: "none", label: "None" },
                      { id: "subtle", label: "Subtle" },
                      { id: "medium", label: "Medium" },
                      { id: "dramatic", label: "High" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onUpdateStyling({ shadowScale: s.id as StoreStylingTokens["shadowScale"] })}
                        className={cn(
                          "py-1.5 text-center text-xs rounded-lg border transition-all cursor-pointer",
                          styling.shadowScale === s.id
                            ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* GLOBAL STORE INSPECTOR (When no section is selected) */
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-600 leading-relaxed">
              <span className="font-bold text-stone-800 block mb-0.5">Global Store Configuration</span>
              Select any section on the canvas or in the Layers panel to inspect section-specific content and typography.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => onUpdateStoreName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-stone-700 uppercase mb-1">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primaryColor || "#176B4D"}
                    onChange={(e) => onUpdateBranding({ primaryColor: e.target.value })}
                    className="h-8 w-8 rounded-md border border-stone-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={branding.primaryColor || "#176B4D"}
                    onChange={(e) => onUpdateBranding({ primaryColor: e.target.value })}
                    className="w-full px-2 py-1 text-xs font-mono bg-stone-50 border border-stone-200 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-700 uppercase mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.secondaryColor || "#104D38"}
                    onChange={(e) => onUpdateBranding({ secondaryColor: e.target.value })}
                    className="h-8 w-8 rounded-md border border-stone-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={branding.secondaryColor || "#104D38"}
                    onChange={(e) => onUpdateBranding({ secondaryColor: e.target.value })}
                    className="w-full px-2 py-1 text-xs font-mono bg-stone-50 border border-stone-200 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Global Font Family
              </label>
              <select
                value={branding.fontFamily || "Inter, sans-serif"}
                onChange={(e) => onUpdateBranding({ fontFamily: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              >
                <option value="Inter, sans-serif">Inter (Modern Clean)</option>
                <option value="'Playfair Display', serif">Playfair Display (Serif)</option>
                <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                <option value="'Fraunces', serif">Fraunces (Warm Serif)</option>
                <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                <option value="'Syne', sans-serif">Syne (Brutalist)</option>
                <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
              </select>
            </div>

            <div>
              <label className="flex items-center justify-between text-xs text-stone-700 cursor-pointer p-2 rounded-lg border border-stone-200 bg-stone-50">
                <span className="font-semibold">Sticky Navigation Header</span>
                <input
                  type="checkbox"
                  checked={styling.headerSticky !== false}
                  onChange={(e) => onUpdateStyling({ headerSticky: e.target.checked })}
                  className="h-4 w-4 text-[#176B4D] rounded-sm accent-[#176B4D] cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Regeneration Confirmation Modal */}
      <Modal
        isOpen={regenModalOpen}
        onClose={() => setRegenModalOpen(false)}
        title="Regenerate Section Copy"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-bold block">Safe Regeneration Notice</span>
              <span>
                Regenerating this section will refresh its headline, subheadline, and copy using your store&apos;s business profile.
                Any manual edits to this section will be replaced, but can be undone anytime via the Editor Undo button.
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E9E5]">
            <Button variant="ghost" size="sm" onClick={() => setRegenModalOpen(false)}>
              Keep Current Content
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isRegenerating}
              onClick={handleConfirmRegenerate}
              className="bg-[#176B4D] hover:bg-[#12533B]"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Confirm &amp; Apply Context Copy
            </Button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
