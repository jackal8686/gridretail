"use client";

import React from "react";
import Link from "next/link";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  RotateCw,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  Rocket,
  RefreshCw,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { ViewportMode, SaveStatus, EditorPageItem } from "./types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { getWebsiteTypeLabel } from "@/utils/store-types";

interface EditorToolbarProps {
  storeName: string;
  websiteType: string;
  storeSlug: string;
  storeStatus: string;
  localSubdomainUrl: string;
  viewportMode: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  onManualSave: () => void;
  isSaving: boolean;
  isPublishing: boolean;
  publishSuccess?: boolean;
  onPublish: (status: "Published" | "Draft") => void;
  pages: EditorPageItem[];
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
}

export function EditorToolbar({
  storeName,
  websiteType,
  storeSlug,
  storeStatus,
  localSubdomainUrl,
  viewportMode,
  onViewportChange,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  saveStatus,
  saveError,
  onManualSave,
  isSaving,
  isPublishing,
  publishSuccess = false,
  onPublish,
  pages,
  currentPageId,
  onPageChange,
  isLeftPanelOpen,
  onToggleLeftPanel,
  isRightPanelOpen,
  onToggleRightPanel,
}: EditorToolbarProps) {
  const currentPage = pages.find((p) => p.id === currentPageId) || pages[0];

  return (
    <header className="h-14 bg-white border-b border-[#E4E9E5] px-4 flex items-center justify-between gap-3 shrink-0 z-30 select-none shadow-2xs">
      {/* LEFT: Branding, Navigation & Store Info */}
      <div className="flex items-center gap-3">
        <Link
          href="/stores"
          className="p-1.5 rounded-lg text-[#66736C] hover:text-[#18231E] hover:bg-stone-100 transition-colors"
          title="Back to Stores"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={onToggleLeftPanel}
          className={cn(
            "p-1.5 rounded-lg border transition-colors",
            isLeftPanelOpen
              ? "bg-[#E2F5E9] border-[#176B4D] text-[#176B4D]"
              : "border-stone-200 text-stone-600 hover:bg-stone-50"
          )}
          title="Toggle Navigation & Sections Panel"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="h-5 w-px bg-stone-200" />

        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#18231E] truncate max-w-[160px] sm:max-w-[220px]">
            {storeName}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hidden md:inline-block">
            {getWebsiteTypeLabel(websiteType)}
          </span>
        </div>

        {/* Page Selector Dropdown */}
        <div className="relative group ml-1" title={`Store Slug: ${storeSlug} | Editing: ${currentPage?.label || currentPageId}`}>
          <select
            value={currentPageId}
            onChange={(e) => onPageChange(e.target.value)}
            className="text-xs font-medium bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            aria-label="Select website page to edit"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.isAvailable}>
                {p.label} {!p.isAvailable ? "(Preview only)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* CENTER: Responsive Viewport & Undo/Redo */}
      <div className="hidden lg:flex items-center gap-4">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-lg border border-stone-200">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              canUndo
                ? "text-stone-700 hover:bg-white hover:shadow-2xs cursor-pointer"
                : "text-stone-300 cursor-not-allowed"
            )}
            title={`Undo (Ctrl+Z) - ${undoCount} actions in history`}
            aria-label="Undo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              canRedo
                ? "text-stone-700 hover:bg-white hover:shadow-2xs cursor-pointer"
                : "text-stone-300 cursor-not-allowed"
            )}
            title={`Redo (Ctrl+Y or Ctrl+Shift+Z) - ${redoCount} actions`}
            aria-label="Redo"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Viewport Switcher */}
        <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-lg border border-stone-200">
          <button
            type="button"
            onClick={() => onViewportChange("desktop")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              viewportMode === "desktop"
                ? "bg-white text-[#176B4D] shadow-2xs border border-stone-200/60"
                : "text-stone-500 hover:text-stone-900"
            )}
            title="Desktop Viewport (1440px)"
            aria-label="Desktop View"
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => onViewportChange("tablet")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              viewportMode === "tablet"
                ? "bg-white text-[#176B4D] shadow-2xs border border-stone-200/60"
                : "text-stone-500 hover:text-stone-900"
            )}
            title="Tablet Viewport (768px)"
            aria-label="Tablet View"
          >
            <Tablet className="h-3.5 w-3.5" />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => onViewportChange("mobile")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              viewportMode === "mobile"
                ? "bg-white text-[#176B4D] shadow-2xs border border-stone-200/60"
                : "text-stone-500 hover:text-stone-900"
            )}
            title="Mobile Viewport (390px)"
            aria-label="Mobile View"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* RIGHT: Save Status, Actions, Publishing & Inspector Toggle */}
      <div className="flex items-center gap-2">
        {/* Save Status Indicator */}
        <div className="hidden sm:flex items-center">
          {saveStatus === "saved" && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
              <span>Autosaving...</span>
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Unsaved changes</span>
            </span>
          )}
          {saveStatus === "error" && (
            <span
              className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1.5"
              title={saveError || "Error saving changes"}
            >
              <AlertCircle className="h-3 w-3 text-red-600" />
              <span>Save failed</span>
            </span>
          )}
        </div>

        {/* Manual Save Button */}
        <Button
          variant={saveStatus === "unsaved" ? "primary" : "outline"}
          size="sm"
          onClick={onManualSave}
          disabled={isSaving}
          isLoading={isSaving}
          leftIcon={<Save className="h-3.5 w-3.5" />}
          className="h-8 text-xs font-semibold"
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>

        {/* Live Subdomain Link */}
        <a
          href={localSubdomainUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1 text-xs text-[#176B4D] hover:bg-[#E2F5E9] px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[#176B4D]/20 font-medium transition-colors"
          title="Open live storefront in new tab"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Live Site</span>
          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
        </a>

        {/* Publish Action Button */}
        {storeStatus !== "Published" ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onPublish("Published")}
            isLoading={isPublishing}
            className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
            leftIcon={publishSuccess ? <Check className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
          >
            {publishSuccess ? "Published!" : "Publish"}
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPublish("Published")}
              isLoading={isPublishing}
              className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-semibold"
              leftIcon={publishSuccess ? <Check className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            >
              {publishSuccess ? "Published!" : "Republish"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPublish("Draft")}
              isLoading={isPublishing}
              className="h-8 text-xs text-amber-700 hover:bg-amber-50 font-semibold border border-amber-200"
              leftIcon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
              title="Transition published store back to draft"
            >
              Unpublish
            </Button>
          </div>
        )}

        {/* Toggle Right Inspector */}
        <div className="h-5 w-px bg-stone-200" />

        <button
          type="button"
          onClick={onToggleRightPanel}
          className={cn(
            "p-1.5 rounded-lg border transition-colors",
            isRightPanelOpen
              ? "bg-[#E2F5E9] border-[#176B4D] text-[#176B4D]"
              : "border-stone-200 text-stone-600 hover:bg-stone-50"
          )}
          title="Toggle Properties Inspector Panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
