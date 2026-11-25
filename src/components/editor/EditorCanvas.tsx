"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  ExternalLink,
  Loader2,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { ViewportMode } from "./types";
import { SectionInstance } from "@/types/section";
import { getSectionDefinition } from "@/constants/sections";
import { cn } from "@/utils/cn";

interface EditorCanvasProps {
  storefrontUrl: string;
  viewportMode: ViewportMode;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  iframeKey: number;
  isIframeLoading: boolean;
  onIframeLoad: () => void;
  onRefreshIframe: () => void;
  selectedSectionId: string | null;
  sections: SectionInstance[];
  onMoveSectionUp?: (sectionId: string) => void;
  onMoveSectionDown?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onUpdateSectionContent?: (sectionId: string, updates: Record<string, unknown>) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  storefrontUrl,
  viewportMode,
  iframeRef,
  iframeKey,
  isIframeLoading,
  onIframeLoad,
  onRefreshIframe,
  selectedSectionId,
  sections,
  onMoveSectionUp,
  onMoveSectionDown,
  onDuplicateSection,
  onDeleteSection,
  onUpdateSectionContent,
}) => {
  const [isInlineEditingOpen, setIsInlineEditingOpen] = useState(false);
  const [inlineHeadline, setInlineHeadline] = useState("");
  const [inlineSubheadline, setInlineSubheadline] = useState("");
  const [inlineCtaText, setInlineCtaText] = useState("");

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const selectedIndex = sections.findIndex((s) => s.id === selectedSectionId);
  const isFirst = selectedIndex <= 0;
  const isLast = selectedIndex >= sections.length - 1;
  const def = selectedSection ? getSectionDefinition(selectedSection.type) : null;

  const handleOpenInlineEdit = () => {
    if (!selectedSection) return;
    setInlineHeadline(String(selectedSection.settings?.headline || selectedSection.settings?.title || ""));
    setInlineSubheadline(String(selectedSection.settings?.subheadline || selectedSection.settings?.subtitle || ""));
    setInlineCtaText(String(selectedSection.settings?.ctaText || selectedSection.settings?.buttonText || ""));
    setIsInlineEditingOpen(true);
  };

  const handleSaveInlineEdit = () => {
    if (!selectedSection || !onUpdateSectionContent) return;
    const updates: Record<string, unknown> = {};
    if (inlineHeadline !== undefined) {
      if (selectedSection.settings?.headline !== undefined || def?.category === "hero") {
        updates.headline = inlineHeadline;
      } else {
        updates.title = inlineHeadline;
      }
    }
    if (inlineSubheadline !== undefined) {
      if (selectedSection.settings?.subheadline !== undefined || def?.category === "hero") {
        updates.subheadline = inlineSubheadline;
      } else {
        updates.subtitle = inlineSubheadline;
      }
    }
    if (inlineCtaText) {
      if (selectedSection.settings?.ctaText !== undefined || def?.category === "hero") {
        updates.ctaText = inlineCtaText;
      } else {
        updates.buttonText = inlineCtaText;
      }
    }
    onUpdateSectionContent(selectedSection.id, updates);
    setIsInlineEditingOpen(false);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 1440,
    height: 900,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      // Horizontal padding: 48px on large screens, 32px on smaller
      const horizontalPadding = window.innerWidth >= 1024 ? 48 : 32;
      // Vertical space reserved for top header (approx 44px) + margin/padding (approx 48px)
      const verticalReserved = 96;

      const availWidth = Math.max(320, el.clientWidth - horizontalPadding);
      const availHeight = Math.max(400, el.clientHeight - verticalReserved);

      setContainerDimensions({
        width: availWidth,
        height: availHeight,
      });
    };

    updateDimensions();
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(el);
    window.addEventListener("resize", updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Logical viewport dimensions based on selected viewport mode:
  // Desktop: 1440 x 900
  // Tablet:  768 x 1024
  // Mobile:  390 x 844
  const getViewportDimensions = () => {
    const { width: availWidth, height: availHeight } = containerDimensions;

    switch (viewportMode) {
      case "mobile": {
        const baseWidth = 390;
        const baseHeight = 844;
        const widthScale = availWidth / baseWidth;
        const heightScale = availHeight / baseHeight;
        // Mobile displays 1:1 if space permits, or scales down smoothly on constrained viewports
        const scale = Math.min(1, Math.max(0.3, Math.min(widthScale, heightScale)));
        return {
          baseWidth,
          baseHeight,
          scale,
          wrapperClass: "rounded-[36px] shadow-2xl border-[8px] border-stone-800",
          widthLabel: scale < 0.99 ? `390px • Mobile (${Math.round(scale * 100)}% scale)` : "390px • Mobile",
        };
      }
      case "tablet": {
        const baseWidth = 768;
        const baseHeight = 1024;
        const widthScale = availWidth / baseWidth;
        const heightScale = availHeight / baseHeight;
        // Tablet fits cleanly in both dimensions
        const scale = Math.min(1, Math.max(0.3, Math.min(widthScale, heightScale)));
        return {
          baseWidth,
          baseHeight,
          scale,
          wrapperClass: "rounded-[24px] shadow-2xl border-[8px] border-stone-800",
          widthLabel: scale < 0.99 ? `768px • Tablet (${Math.round(scale * 100)}% scale)` : "768px • Tablet",
        };
      }
      case "desktop":
      default: {
        const baseWidth = 1440;
        const baseHeight = 900;
        const widthScale = availWidth / baseWidth;
        const heightScale = availHeight / baseHeight;
        // Desktop scales comfortably to fit the canvas workspace while preserving 1440x900 resolution
        const scale = Math.min(1, Math.max(0.25, Math.min(widthScale, heightScale)));
        return {
          baseWidth,
          baseHeight,
          scale,
          wrapperClass: "rounded-xl shadow-lg border border-stone-200",
          widthLabel: scale < 0.99 ? `1440px • Desktop (${Math.round(scale * 100)}% scale)` : "1440px • Desktop",
        };
      }
    }
  };

  const { baseWidth, baseHeight, scale, wrapperClass, widthLabel } = getViewportDimensions();

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col items-center bg-[#F4F6F5] min-h-0 w-full p-4 lg:p-6 overflow-y-auto overflow-x-hidden"
    >
      {/* Top Floating Viewport Info & Refresh Header */}
      <div className="w-full max-w-[1440px] flex items-center justify-between px-3 py-1.5 mb-3 bg-white/80 backdrop-blur-xs rounded-lg border border-stone-200 text-xs text-stone-600 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Canvas
          </span>
          <span className="text-stone-300">|</span>
          <span className="font-mono text-[11px] text-stone-500">{widthLabel}</span>
          {selectedSection && (
            <>
              <span className="text-stone-300">|</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                Active: {def?.name || selectedSection.type}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefreshIframe}
            className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition-colors"
            title="Reload preview frame"
            aria-label="Reload preview frame"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isIframeLoading && "animate-spin text-emerald-600")} />
          </button>
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition-colors"
            title="Open in standalone tab"
            aria-label="Open in standalone tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Floating Canvas Quick Action Pill (when a section is active) */}
      {selectedSection && (
        <div
          data-testid="canvas-floating-action-pill"
          className="z-30 mb-2 flex items-center gap-1.5 bg-stone-900/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-xl border border-stone-700 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <span className="text-xs font-semibold px-2 py-0.5 bg-stone-800 rounded-md text-emerald-400">
            {def?.name || selectedSection.type}
          </span>

          <div className="h-3 w-px bg-stone-700 mx-1" />

          {/* Move Up */}
          <button
            type="button"
            onClick={() => onMoveSectionUp && onMoveSectionUp(selectedSection.id)}
            disabled={isFirst}
            className="p-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move Section Up"
            aria-label="Move Section Up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>

          {/* Move Down */}
          <button
            type="button"
            onClick={() => onMoveSectionDown && onMoveSectionDown(selectedSection.id)}
            disabled={isLast}
            className="p-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Move Section Down"
            aria-label="Move Section Down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={() => onDuplicateSection && onDuplicateSection(selectedSection.id)}
            className="p-1 hover:bg-stone-800 rounded text-stone-300 hover:text-white"
            title="Duplicate Section"
            aria-label="Duplicate Section"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          {/* Inline Edit Content */}
          <button
            type="button"
            onClick={handleOpenInlineEdit}
            className="px-2 py-1 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
            title="Inline Text Edit"
          >
            <Edit3 className="h-3 w-3" />
            Quick Edit
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDeleteSection && onDeleteSection(selectedSection.id)}
            className="p-1 hover:bg-red-950/50 rounded text-red-400 hover:text-red-300 transition-colors"
            title="Delete Section"
            aria-label="Delete Section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Inline Text Editing Modal / Overlay */}
      {isInlineEditingOpen && selectedSection && (
        <div
          data-testid="inline-text-editor-popover"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  Quick Edit: {def?.name || selectedSection.type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInlineEditingOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Headline / Main Title
                </label>
                <input
                  type="text"
                  value={inlineHeadline}
                  onChange={(e) => setInlineHeadline(e.target.value)}
                  placeholder="Enter section headline..."
                  className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Subheadline / Body Text
                </label>
                <textarea
                  rows={3}
                  value={inlineSubheadline}
                  onChange={(e) => setInlineSubheadline(e.target.value)}
                  placeholder="Enter supporting description or body..."
                  className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Call-to-Action Text
                </label>
                <input
                  type="text"
                  value={inlineCtaText}
                  onChange={(e) => setInlineCtaText(e.target.value)}
                  placeholder="e.g. Explore Now / Schedule"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsInlineEditingOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInlineEdit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div
        data-testid="editor-viewport-container"
        style={{
          width: `${Math.round(baseWidth * scale)}px`,
          height: `${Math.round(baseHeight * scale)}px`,
          position: "relative",
          flexShrink: 0,
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="mx-auto"
      >
        <div
          data-testid="editor-viewport-scaler"
          style={{
            width: `${baseWidth}px`,
            height: `${baseHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
            transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          className={cn(
            "bg-white flex flex-col",
            wrapperClass
          )}
        >
          {/* Loading Spinner Indicator */}
          {isIframeLoading && (
            <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              <span className="text-xs font-medium text-stone-600">Rendering Storefront...</span>
            </div>
          )}

          {/* Embedded Live Storefront Iframe */}
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={storefrontUrl}
            onLoad={onIframeLoad}
            className="w-full h-full border-0 bg-white"
            title="Live Storefront Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
