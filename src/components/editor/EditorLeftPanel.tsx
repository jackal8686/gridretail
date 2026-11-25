"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  PlusCircle,
  FileCode,
  Palette,
  GripVertical,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  LeftPanelTab,
  EditorPageItem,
  SectionLibraryCategory,
} from "./types";
import { SectionInstance, SectionType } from "@/types/section";
import {
  ALL_SECTION_DEFINITIONS,
  getSectionDefinition,
} from "@/constants/sections";
import { COLOR_THEMES } from "@/constants/themes";
import { DESIGN_TEMPLATES } from "@/constants/design-templates";
import { StoreStylingTokens } from "@/types/store";
import { cn } from "@/utils/cn";

interface EditorLeftPanelProps {
  isOpen: boolean;
  activeTab: LeftPanelTab;
  onTabChange: (tab: LeftPanelTab) => void;
  sections: SectionInstance[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string | null) => void;
  onReorderSections: (newSections: SectionInstance[]) => void;
  onToggleVisibility: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddSection: (type: SectionType) => void;
  pages: EditorPageItem[];
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  websiteType: string;
  // Styling props
  themeId: string;
  onThemeChange: (themeId: string) => void;
  templateId: string;
  onTemplateChange: (templateId: string) => void;
  styling: StoreStylingTokens;
  onUpdateStyling: (patch: Partial<StoreStylingTokens>) => void;
}

export function EditorLeftPanel({
  isOpen,
  activeTab,
  onTabChange,
  sections,
  selectedSectionId,
  onSelectSection,
  onReorderSections,
  onToggleVisibility,
  onDuplicateSection,
  onDeleteSection,
  onAddSection,
  pages,
  currentPageId,
  onPageChange,
  websiteType,
  themeId,
  onThemeChange,
  templateId,
  onTemplateChange,
  styling,
  onUpdateStyling,
}: EditorLeftPanelProps) {
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [deleteModalSectionId, setDeleteModalSectionId] = useState<string | null>(null);

  // Section Library Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLibraryCategory, setSelectedLibraryCategory] = useState<SectionLibraryCategory>("all");

  // Move Section Up/Down
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorderSections(reordered.map((s, idx) => ({ ...s, order: idx })));
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorderSections(reordered.map((s, idx) => ({ ...s, order: idx })));
    setDraggedIndex(null);
  };

  // Filtered Library Sections
  const librarySections = useMemo(() => {
    const validWebsiteType = websiteType as "ecommerce" | "appointments" | "lead_gen";
    return ALL_SECTION_DEFINITIONS.filter((def) => {
      // 1. Website type compatibility
      if (def.category === "products" && validWebsiteType !== "ecommerce") {
        return false;
      }
      // 2. Category filter
      if (selectedLibraryCategory !== "all") {
        if (selectedLibraryCategory === "hero" && def.category !== "hero") return false;
        if (selectedLibraryCategory === "content" && def.category !== "editorial") return false;
        if (selectedLibraryCategory === "products" && def.category !== "products") return false;
        if (selectedLibraryCategory === "info" && def.category !== "info") return false;
        if (selectedLibraryCategory === "footer" && def.category !== "footer") return false;
        if (selectedLibraryCategory === "social_proof" && def.type !== "trust_badges" && def.type !== "verified_statistics_bar") return false;
        if (selectedLibraryCategory === "contact" && def.type !== "contact_info" && def.type !== "newsletter_signup") return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          def.name.toLowerCase().includes(query) ||
          def.description.toLowerCase().includes(query) ||
          def.type.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [websiteType, selectedLibraryCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <aside className="w-80 md:w-88 bg-white border-r border-[#E4E9E5] flex flex-col shrink-0 h-full select-none z-20">
      {/* Tab Navigation Header */}
      <div className="flex items-center border-b border-[#E4E9E5] bg-[#FAF9F6] p-1.5 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onTabChange("layers")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeTab === "layers"
              ? "bg-white text-[#176B4D] shadow-2xs border border-stone-200/80 font-bold"
              : "text-stone-500 hover:text-stone-900"
          )}
          title="Page Layers / Section Tree"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Layers</span>
          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded-full">
            {sections.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("add-section")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeTab === "add-section"
              ? "bg-white text-[#176B4D] shadow-2xs border border-stone-200/80 font-bold"
              : "text-stone-500 hover:text-stone-900"
          )}
          title="Add Section Library"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Add</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("pages")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeTab === "pages"
              ? "bg-white text-[#176B4D] shadow-2xs border border-stone-200/80 font-bold"
              : "text-stone-500 hover:text-stone-900"
          )}
          title="Website Pages"
        >
          <FileCode className="h-3.5 w-3.5" />
          <span>Pages</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("styling")}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
            activeTab === "styling"
              ? "bg-white text-[#176B4D] shadow-2xs border border-stone-200/80 font-bold"
              : "text-stone-500 hover:text-stone-900"
          )}
          title="Themes & Design Presets"
        >
          <Palette className="h-3.5 w-3.5" />
          <span>Theme</span>
        </button>
      </div>

      {/* TAB CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: LAYERS / SECTION NAVIGATOR */}
        {activeTab === "layers" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500 px-1 pb-1">
              <span className="font-bold text-[11px] uppercase tracking-wider text-stone-700">
                Page Structure ({sections.length} Sections)
              </span>
              <button
                type="button"
                onClick={() => onTabChange("add-section")}
                className="text-[#176B4D] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="h-3 w-3" />
                <span>Add Section</span>
              </button>
            </div>

            <div className="space-y-1.5" role="list" aria-label="Page Sections Navigator">
              {sections.map((instance, index) => {
                const def = getSectionDefinition(instance.type);
                const isSelected = selectedSectionId === instance.id;
                const isDragging = draggedIndex === index;
                const sectionName = instance.customTitle || def?.name || instance.type;

                return (
                  <div
                    key={instance.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => setDraggedIndex(null)}
                    onClick={() => onSelectSection(instance.id)}
                    className={cn(
                      "group rounded-xl border p-2 flex items-center justify-between gap-2 transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-[#176B4D] bg-[#E2F5E9] shadow-xs ring-1 ring-[#176B4D]/30"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                      isDragging && "opacity-40 border-dashed border-[#176B4D] bg-emerald-50",
                      !instance.visible && "opacity-60 bg-stone-50/70"
                    )}
                    role="listitem"
                    data-selected={isSelected}
                  >
                    {/* Left: Drag handle & Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 p-0.5 shrink-0"
                        title="Drag to reorder section"
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-xs font-semibold truncate block",
                              isSelected ? "text-[#176B4D]" : "text-stone-800",
                              !instance.visible && "line-through text-stone-400"
                            )}
                          >
                            {sectionName}
                          </span>
                          {!instance.visible && (
                            <span className="text-[9px] bg-stone-200 text-stone-600 px-1 rounded-sm font-medium">
                              Hidden
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 block truncate font-mono">
                          {def?.category || "section"} • #{index + 1}
                        </span>
                      </div>
                    </div>

                    {/* Right: Quick Actions */}
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Move Up / Down Buttons */}
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          index === 0
                            ? "text-stone-300 cursor-not-allowed"
                            : "text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
                        )}
                        title="Move Section Up"
                        aria-label={`Move ${sectionName} Up`}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === sections.length - 1}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          index === sections.length - 1
                            ? "text-stone-300 cursor-not-allowed"
                            : "text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
                        )}
                        title="Move Section Down"
                        aria-label={`Move ${sectionName} Down`}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleVisibility(instance.id)}
                        className={cn(
                          "p-1 rounded-md transition-colors cursor-pointer",
                          instance.visible
                            ? "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                            : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                        )}
                        title={instance.visible ? "Hide Section" : "Show Section"}
                        aria-label={instance.visible ? "Hide Section" : "Show Section"}
                      >
                        {instance.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => onDuplicateSection(instance.id)}
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                        title="Duplicate Section"
                        aria-label={`Duplicate ${sectionName}`}
                      >
                        <Copy className="h-3 w-3" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeleteModalSectionId(instance.id)}
                        className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Delete Section"
                        aria-label={`Delete ${sectionName}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {sections.length === 0 && (
              <div className="text-center p-6 border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <Layers className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-700">No sections on page</p>
                <p className="text-[11px] text-stone-500 mt-1">Add sections from the library to populate the canvas.</p>
                <button
                  type="button"
                  onClick={() => onTabChange("add-section")}
                  className="mt-3 px-3 py-1.5 bg-[#176B4D] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#104D38] cursor-pointer"
                >
                  Browse Section Library
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADD SECTION LIBRARY */}
        {activeTab === "add-section" && (
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sections (hero, FAQ, team)..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "All" },
                { id: "hero", label: "Hero" },
                { id: "content", label: "Content" },
                { id: "products", label: "Products" },
                { id: "info", label: "Information" },
                { id: "social_proof", label: "Social Proof" },
                { id: "contact", label: "Contact" },
                { id: "footer", label: "Footer" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedLibraryCategory(cat.id as SectionLibraryCategory)}
                  className={cn(
                    "px-2 py-0.8 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                    selectedLibraryCategory === cat.id
                      ? "bg-[#176B4D] text-white font-semibold"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sections Catalog */}
            <div className="space-y-2 pt-1">
              {librarySections.map((def) => (
                <div
                  key={def.type}
                  className="p-3 rounded-xl border border-stone-200 bg-white hover:border-[#176B4D]/60 hover:shadow-2xs transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-stone-900">{def.name}</span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded-sm bg-stone-100 text-stone-600">
                          {def.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    <span className="text-[10px] text-stone-400 font-mono">
                      {def.availableLayouts.length} layout{def.availableLayouts.length > 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddSection(def.type)}
                      className="px-2.5 py-1 bg-[#E2F5E9] hover:bg-[#176B4D] text-[#176B4D] hover:text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Add to Page</span>
                    </button>
                  </div>
                </div>
              ))}

              {librarySections.length === 0 && (
                <div className="text-center py-8 text-stone-500 text-xs">
                  No sections match &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAGES NAVIGATOR */}
        {activeTab === "pages" && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider px-1">
              Website Pages
            </div>

            <div className="space-y-1.5">
              {pages.map((p) => {
                const isActive = currentPageId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPageChange(p.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer",
                      isActive
                        ? "border-[#176B4D] bg-[#E2F5E9] text-[#176B4D] font-bold shadow-2xs"
                        : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                    )}
                  >
                    <div>
                      <span className="block text-xs">{p.label}</span>
                      <span className="block text-[10px] text-stone-400 font-mono mt-0.5">
                        {p.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="text-[10px] bg-[#176B4D] text-white px-1.5 py-0.2 rounded-full font-semibold">
                          Editing
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: THEMES & DESIGN PRESETS */}
        {activeTab === "styling" && (
          <div className="space-y-4">
            {/* Color Themes */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Color Theme (12 Curated Palettes)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {COLOR_THEMES.map((theme) => {
                  const isActive = themeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onThemeChange(theme.id)}
                      className={cn(
                        "p-2 rounded-xl border text-left transition-all cursor-pointer",
                        isActive
                          ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D] shadow-2xs"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      )}
                    >
                      <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden mb-1.5 border border-stone-200">
                        {theme.previewSwatches.map((color, idx) => (
                          <div key={idx} className="flex-1 h-full" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <span className="block text-xs truncate leading-tight">{theme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Design Templates */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Design Template (8 Architectures)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DESIGN_TEMPLATES.map((tmpl) => {
                  const isActive = templateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => onTemplateChange(tmpl.id)}
                      className={cn(
                        "p-2 rounded-xl border text-left transition-all cursor-pointer",
                        isActive
                          ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D] shadow-2xs"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      )}
                    >
                      <span className="block text-xs truncate leading-tight">{tmpl.name}</span>
                      <span className="block text-[9px] text-stone-400 mt-0.5 truncate">{tmpl.tagline || tmpl.layoutFamily}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Global Button Radius */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Button Corner Radius
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: "none", label: "Sharp" },
                  { id: "rounded", label: "Smooth" },
                  { id: "pill", label: "Pill" },
                  { id: "full", label: "Full" },
                ].map((rad) => (
                  <button
                    key={rad.id}
                    type="button"
                    onClick={() => onUpdateStyling({ buttonRadius: rad.id as StoreStylingTokens["buttonRadius"] })}
                    className={cn(
                      "py-1.5 text-center text-xs rounded-lg border transition-all cursor-pointer",
                      styling.buttonRadius === rad.id
                        ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    {rad.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Treatment */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Card Treatment (6 Styles)
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "bordered", label: "Bordered" },
                  { id: "elevated", label: "Elevated" },
                  { id: "flat", label: "Flat" },
                  { id: "floating", label: "Floating" },
                  { id: "soft_rounded", label: "Soft Round" },
                  { id: "block_solid", label: "Solid Block" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onUpdateStyling({ cardStyle: c.id as StoreStylingTokens["cardStyle"] })}
                    className={cn(
                      "py-1.5 text-center text-[11px] rounded-lg border transition-all cursor-pointer",
                      styling.cardStyle === c.id
                        ? "border-[#176B4D] bg-[#E2F5E9] font-bold text-[#176B4D]"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalSectionId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-stone-200 space-y-3">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-stone-900">Delete Section?</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to remove this section? You can undo this action via the toolbar or Ctrl+Z.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalSectionId(null)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSection(deleteModalSectionId);
                  setDeleteModalSectionId(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Delete Section
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
