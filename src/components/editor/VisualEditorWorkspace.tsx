"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Store, StoreStylingTokens, PreviewUpdatePayload, StoreBranding } from "@/types";
import { SectionInstance, SectionType } from "@/types/section";
import { getSectionDefinition } from "@/constants/sections";
import { COLOR_THEMES } from "@/constants/themes";
import { DESIGN_TEMPLATES } from "@/constants/design-templates";
import { getStoreLocalSubdomainUrl } from "@/lib/urls";
import { validatePreviewMessage, isAllowedPreviewOrigin } from "@/lib/security/preview-origin";
import { generateSectionId, deepCloneSectionSettings } from "@/lib/sections/id-generator";
import { resolveStoreSections } from "@/lib/sections/resolver";

import {
  ViewportMode,
  EditorPageItem,
  LeftPanelTab,
  EditorSnapshot,
} from "./types";
import { EditorToolbar } from "./EditorToolbar";
import { EditorLeftPanel } from "./EditorLeftPanel";
import { EditorRightPanel } from "./EditorRightPanel";
import { EditorCanvas } from "./EditorCanvas";
import { useEditorHistory } from "./useEditorHistory";

interface VisualEditorWorkspaceProps {
  initialStore: Store;
  onStoreUpdated?: (updatedStore: Store) => void;
  onPublishStore?: (status: "Published" | "Draft") => Promise<void>;
  isPublishing?: boolean;
  publishSuccess?: boolean;
}

export const VisualEditorWorkspace: React.FC<VisualEditorWorkspaceProps> = ({
  initialStore,
  onStoreUpdated,
  onPublishStore,
  isPublishing = false,
  publishSuccess = false,
}) => {
  const store = initialStore;

  // Layout Panels & Viewport State
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<LeftPanelTab>("layers");
  const [currentPageId, setCurrentPageId] = useState("home");

  // Selection State
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Form & Styling State
  const [storeName, setStoreName] = useState(store.name || "");
  const [templateId, setTemplateId] = useState(store.templateId || "tmpl_modern_minimal");
  const [themeId, setThemeId] = useState(store.themeId || "theme_nordic_pine");
  const [primaryColor, setPrimaryColor] = useState(store.branding?.primaryColor || "#176B4D");
  const [secondaryColor, setSecondaryColor] = useState(store.branding?.secondaryColor || "#FAF9F6");
  const [fontFamily, setFontFamily] = useState(store.branding?.fontFamily || "Inter, sans-serif");
  const [logoUrl, setLogoUrl] = useState(store.branding?.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(store.branding?.bannerUrl || "");
  const [heroHeadline, setHeroHeadline] = useState(store.branding?.heroHeadline || "");
  const [heroSubheadline, setHeroSubheadline] = useState(store.branding?.heroSubheadline || "");
  const [aboutText, setAboutText] = useState(store.branding?.aboutText || store.description || "");
  const [ctaText, setCtaText] = useState(store.branding?.ctaText || "Explore Catalog");
  const [enabledSections, setEnabledSections] = useState<string[]>(
    store.enabledSections && store.enabledSections.length > 0
      ? store.enabledSections
      : ["hero", "featured_products", "about", "newsletter", "footer"]
  );
  const [orderedSections, setOrderedSections] = useState<string[]>(
    store.orderedSections && store.orderedSections.length > 0
      ? store.orderedSections
      : ["hero", "featured_products", "about", "newsletter", "footer"]
  );
  const [sections, setSections] = useState<SectionInstance[]>(
    store.sections && store.sections.length > 0
      ? store.sections
      : resolveStoreSections(store)
  );
  const [pageSections, setPageSections] = useState<Record<string, SectionInstance[]>>(() => {
    const initialHome =
      store.sections && store.sections.length > 0
        ? store.sections
        : resolveStoreSections(store);
    const map: Record<string, SectionInstance[]> = {
      home: initialHome,
    };
    if (store.pageSections) {
      Object.assign(map, store.pageSections);
    }
    return map;
  });

  const activeSections = pageSections[currentPageId] || (currentPageId === "home" ? sections : []);

  const updatePageSections = (newSecs: SectionInstance[]) => {
    setPageSections((prev) => ({
      ...prev,
      [currentPageId]: newSecs,
    }));
    if (currentPageId === "home") {
      setSections(newSecs);
    }
  };
  const [styling, setStyling] = useState<StoreStylingTokens>(
    store.styling || {
      buttonRadius: "rounded",
      cardStyle: "bordered",
      contentWidth: "normal",
      headerSticky: true,
      formStyle: "bordered",
      shadowScale: "subtle",
    }
  );

  // Canvas Iframe State
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  // Pages definition
  const pages: EditorPageItem[] = [
    {
      id: "home",
      label: "Home Page",
      path: "/",
      category: "main",
      description: "Storefront primary landing page",
      isAvailable: true,
    },
    ...(store.websiteType === "ecommerce"
      ? [
          {
            id: "catalog",
            label: "Product Catalog",
            path: "#products",
            category: "catalog" as const,
            description: "Product inventory showcase",
            isAvailable: true,
          },
          {
            id: "cart",
            label: "Cart & Checkout",
            path: "#cart",
            category: "catalog" as const,
            description: "Customer cart and checkout flow",
            isAvailable: true,
          },
        ]
      : store.websiteType === "appointments"
      ? [
          {
            id: "services",
            label: "Services Menu",
            path: "#services",
            category: "service" as const,
            description: "Practitioner and service offerings",
            isAvailable: true,
          },
          {
            id: "booking",
            label: "Appointment Scheduler",
            path: "#booking",
            category: "service" as const,
            description: "Interactive booking calendar",
            isAvailable: true,
          },
        ]
      : [
          {
            id: "inquiry",
            label: "Consultation Form",
            path: "#inquiry",
            category: "main" as const,
            description: "High-intent client qualification form",
            isAvailable: true,
          },
          {
            id: "case_studies",
            label: "Case Studies & Proof",
            path: "#proof",
            category: "info" as const,
            description: "Client success metrics and reviews",
            isAvailable: true,
          },
        ]),
    {
      id: "contact",
      label: "Contact & Location",
      path: "#contact",
      category: "info" as const,
      description: "Operating hours and business contacts",
      isAvailable: true,
    },
  ];

  // Build current snapshot helper
  const createSnapshot = useCallback(
    (overrides?: Partial<EditorSnapshot>): EditorSnapshot => {
      const mergedPageSections = {
        ...pageSections,
        [currentPageId]: overrides?.sections || activeSections,
      };
      return {
        templateId,
        themeId,
        storeName,
        primaryColor,
        secondaryColor,
        fontFamily,
        logoUrl,
        bannerUrl,
        heroHeadline,
        heroSubheadline,
        aboutText,
        ctaText,
        enabledSections,
        orderedSections,
        sections: currentPageId === "home" ? (overrides?.sections || sections) : (pageSections.home || sections),
        pageSections: mergedPageSections,
        styling,
        ...overrides,
      };
    },
    [
      templateId,
      themeId,
      storeName,
      primaryColor,
      secondaryColor,
      fontFamily,
      logoUrl,
      bannerUrl,
      heroHeadline,
      heroSubheadline,
      aboutText,
      ctaText,
      enabledSections,
      orderedSections,
      sections,
      pageSections,
      currentPageId,
      activeSections,
      styling,
    ]
  );

  // Apply snapshot from history
  const handleApplySnapshot = useCallback((snap: EditorSnapshot) => {
    setTemplateId(snap.templateId);
    setThemeId(snap.themeId);
    setStoreName(snap.storeName);
    setPrimaryColor(snap.primaryColor);
    setSecondaryColor(snap.secondaryColor);
    setFontFamily(snap.fontFamily);
    setLogoUrl(snap.logoUrl || "");
    setBannerUrl(snap.bannerUrl || "");
    setHeroHeadline(snap.heroHeadline);
    setHeroSubheadline(snap.heroSubheadline);
    setAboutText(snap.aboutText);
    setCtaText(snap.ctaText);
    setEnabledSections(snap.enabledSections);
    setOrderedSections(snap.orderedSections);
    setSections(snap.sections);
    if (snap.pageSections) {
      setPageSections(snap.pageSections);
    }
    setStyling(snap.styling);

    // Send update to iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "GRIDRETAIL_PREVIEW_UPDATE",
          payload: {
            templateId: snap.templateId,
            themeId: snap.themeId,
            branding: {
              primaryColor: snap.primaryColor,
              secondaryColor: snap.secondaryColor,
              fontFamily: snap.fontFamily,
              logoUrl: snap.logoUrl,
              bannerUrl: snap.bannerUrl,
              heroHeadline: snap.heroHeadline,
              heroSubheadline: snap.heroSubheadline,
              aboutText: snap.aboutText,
              ctaText: snap.ctaText,
            },
            enabledSections: snap.enabledSections,
            orderedSections: snap.orderedSections,
            sections: snap.sections,
            styling: snap.styling,
          },
        },
        "*"
      );
    }
  }, []);

  // Callback when server persistence succeeds and version is updated
  const handleStorePersisted = useCallback(
    (persistedStore: Partial<EditorSnapshot> & { version?: number }) => {
      if (onStoreUpdated) {
        onStoreUpdated({
          ...store,
          version: persistedStore.version ?? store.version,
        });
      }
    },
    [onStoreUpdated, store]
  );

  // History & Autosave Engine Hook
  const {
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    saveStatus,
    errorMessage: saveError,
    pushSnapshot,
    undo,
    redo,
    manualSave,
  } = useEditorHistory({
    storeId: store.id,
    initialSnapshot: createSnapshot(),
    initialVersion: store.version || 0,
    onApplySnapshot: handleApplySnapshot,
    onStorePersisted: handleStorePersisted,
    debounceMs: 2500,
  });

  // PostMessage sender helper
  const sendPreviewUpdate = useCallback((payload: PreviewUpdatePayload) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload,
      },
      "*"
    );
  }, []);

  // Bi-directional Message Listener from Iframe (e.g. click section on canvas)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!isAllowedPreviewOrigin(e.origin)) return;
      if (iframeRef.current?.contentWindow && e.source !== iframeRef.current.contentWindow) return;

      const validation = validatePreviewMessage(e.data);
      if (!validation.valid) return;

      if (validation.type === "GRIDRETAIL_PREVIEW_READY") {
        setIsIframeLoading(false);
        // Send initial state payload
        sendPreviewUpdate({
          templateId,
          themeId,
          branding: {
            primaryColor,
            secondaryColor,
            fontFamily,
            logoUrl,
            bannerUrl,
            heroHeadline,
            heroSubheadline,
            aboutText,
            ctaText,
          },
          enabledSections,
          orderedSections,
          sections,
          styling,
        });
      } else if (validation.type === "GRIDRETAIL_SECTION_SELECT") {
        const secId = validation.sectionId;
        if (secId) {
          setSelectedSectionId(secId);
          setIsRightPanelOpen(true);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    sendPreviewUpdate,
    templateId,
    themeId,
    primaryColor,
    secondaryColor,
    fontFamily,
    logoUrl,
    bannerUrl,
    heroHeadline,
    heroSubheadline,
    aboutText,
    ctaText,
    enabledSections,
    orderedSections,
    sections,
    styling,
  ]);

  // Helper to generate default starter sections for subpages
  const getStarterSectionsForPage = useCallback((pageId: string): SectionInstance[] => {
    if (pageId === "home") return store.sections && store.sections.length > 0 ? store.sections : resolveStoreSections(store);
    if (pageId === "catalog") {
      return [
        {
          id: generateSectionId("featured_products"),
          type: "featured_products",
          customTitle: "Product Inventory Catalog",
          order: 0,
          visible: true,
          settings: { title: "Our Full Collection", columns: 3 },
        },
      ];
    }
    if (pageId === "cart") {
      return [
        {
          id: generateSectionId("contact_info"),
          type: "contact_info",
          customTitle: "Order & Checkout Details",
          order: 0,
          visible: true,
          settings: { title: "Secure Checkout & Order Review" },
        },
      ];
    }
    if (pageId === "services") {
      return [
        {
          id: generateSectionId("benefits_grid"),
          type: "benefits_grid",
          customTitle: "Practitioner & Services Menu",
          order: 0,
          visible: true,
          settings: { title: "Our Advisory & Consultation Menu" },
        },
      ];
    }
    if (pageId === "booking") {
      return [
        {
          id: generateSectionId("how_it_works"),
          type: "how_it_works",
          customTitle: "Schedule an Appointment",
          order: 0,
          visible: true,
          settings: { title: "Reserve Your Session" },
        },
      ];
    }
    if (pageId === "inquiry") {
      return [
        {
          id: generateSectionId("trust_badges"),
          type: "trust_badges",
          customTitle: "Client Inquiry Form",
          order: 0,
          visible: true,
          settings: { title: "Request a Consultation Assessment" },
        },
      ];
    }
    if (pageId === "case_studies") {
      return [
        {
          id: generateSectionId("verified_statistics_bar"),
          type: "verified_statistics_bar",
          customTitle: "Client Success Stories",
          order: 0,
          visible: true,
          settings: { title: "Client Testimonials & Outcomes" },
        },
      ];
    }
    return [
      {
        id: generateSectionId("contact_info"),
        type: "contact_info",
        customTitle: "Location & Operating Contacts",
        order: 0,
        visible: true,
        settings: { title: "Get in Touch" },
      },
    ];
  }, [store]);

  // Section Management Handlers
  const handleReorderSections = (newSections: SectionInstance[]) => {
    updatePageSections(newSections);
    if (currentPageId === "home") {
      const newOrdered = newSections.map((s) => s.id);
      setOrderedSections(newOrdered);
    }

    const snapshot = createSnapshot({ sections: newSections });
    pushSnapshot(snapshot);
    sendPreviewUpdate({
      sections: newSections,
      pageSections: { ...pageSections, [currentPageId]: newSections },
      currentPageId,
    });
  };

  const handleToggleVisibility = (sectionId: string) => {
    const newSections = activeSections.map((s) =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    );
    updatePageSections(newSections);
    if (currentPageId === "home") {
      const newEnabled = newSections.filter((s) => s.visible).map((s) => s.id);
      setEnabledSections(newEnabled);
    }

    const snapshot = createSnapshot({ sections: newSections });
    pushSnapshot(snapshot);
    sendPreviewUpdate({
      sections: newSections,
      pageSections: { ...pageSections, [currentPageId]: newSections },
      currentPageId,
    });
  };

  const handleDuplicateSection = (sectionId: string) => {
    const targetIdx = activeSections.findIndex((s) => s.id === sectionId);
    if (targetIdx === -1) return;

    const source = activeSections[targetIdx];
    const newId = generateSectionId(source.type);
    const duplicateInstance: SectionInstance = {
      ...source,
      id: newId,
      order: targetIdx + 1,
      settings: deepCloneSectionSettings(source.settings),
    };

    const newSections = [...activeSections];
    newSections.splice(targetIdx + 1, 0, duplicateInstance);
    // Recalculate orders
    const normalized = newSections.map((sec, idx) => ({ ...sec, order: idx }));
    updatePageSections(normalized);
    if (currentPageId === "home") {
      const newOrdered = normalized.map((s) => s.id);
      setOrderedSections(newOrdered);
    }
    setSelectedSectionId(newId);

    const snapshot = createSnapshot({ sections: normalized });
    pushSnapshot(snapshot);
    sendPreviewUpdate({
      sections: normalized,
      pageSections: { ...pageSections, [currentPageId]: normalized },
      currentPageId,
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    const newSections = activeSections.filter((s) => s.id !== sectionId);
    const normalized = newSections.map((sec, idx) => ({ ...sec, order: idx }));
    updatePageSections(normalized);
    if (currentPageId === "home") {
      const newOrdered = normalized.map((s) => s.id);
      const newEnabled = normalized.filter((s) => s.visible).map((s) => s.id);
      setOrderedSections(newOrdered);
      setEnabledSections(newEnabled);
    }

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }

    const snapshot = createSnapshot({ sections: normalized });
    pushSnapshot(snapshot);
    sendPreviewUpdate({
      sections: normalized,
      pageSections: { ...pageSections, [currentPageId]: normalized },
      currentPageId,
    });
  };

  const handleAddSection = (type: SectionType) => {
    const def = getSectionDefinition(type);
    const newId = generateSectionId(type);
    const newInstance: SectionInstance = {
      id: newId,
      type,
      customTitle: def?.name || type,
      order: activeSections.length,
      visible: true,
      settings: deepCloneSectionSettings(def?.defaultSettings || {}),
    };

    const newSections = [...activeSections, newInstance];
    updatePageSections(newSections);
    if (currentPageId === "home") {
      const newOrdered = newSections.map((s) => s.id);
      const newEnabled = newSections.filter((s) => s.visible).map((s) => s.id);
      setOrderedSections(newOrdered);
      setEnabledSections(newEnabled);
    }
    setSelectedSectionId(newId);
    setLeftTab("layers");

    const snapshot = createSnapshot({ sections: newSections });
    pushSnapshot(snapshot);
    sendPreviewUpdate({
      sections: newSections,
      pageSections: { ...pageSections, [currentPageId]: newSections },
      currentPageId,
    });
  };

  const handleMoveSectionUp = (sectionId: string) => {
    const idx = activeSections.findIndex((s) => s.id === sectionId);
    if (idx <= 0) return;
    const newSections = [...activeSections];
    const [moved] = newSections.splice(idx, 1);
    newSections.splice(idx - 1, 0, moved);
    handleReorderSections(newSections.map((s, i) => ({ ...s, order: i })));
  };

  const handleMoveSectionDown = (sectionId: string) => {
    const idx = activeSections.findIndex((s) => s.id === sectionId);
    if (idx === -1 || idx >= activeSections.length - 1) return;
    const newSections = [...activeSections];
    const [moved] = newSections.splice(idx, 1);
    newSections.splice(idx + 1, 0, moved);
    handleReorderSections(newSections.map((s, i) => ({ ...s, order: i })));
  };

  // Section Property Updates (from Right Panel or Canvas Inline Edit)
  const handleUpdateSectionSettings = (sectionId: string, patch: Record<string, unknown>) => {
    const newSections = activeSections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          settings: {
            ...s.settings,
            ...patch,
          },
        };
      }
      return s;
    });

    updatePageSections(newSections);

    // Also update top-level headline/subheadline if updating hero
    const updatedSec = newSections.find((s) => s.id === sectionId);
    let newHeadline = heroHeadline;
    let newSub = heroSubheadline;
    let newCta = ctaText;
    if (updatedSec && updatedSec.type.startsWith("hero_")) {
      if (typeof patch.headline === "string") {
        newHeadline = patch.headline;
        setHeroHeadline(newHeadline);
      }
      if (typeof patch.subheadline === "string") {
        newSub = patch.subheadline;
        setHeroSubheadline(newSub);
      }
      if (typeof patch.ctaText === "string") {
        newCta = patch.ctaText;
        setCtaText(newCta);
      }
    }

    const snapshot = createSnapshot({
      sections: newSections,
      heroHeadline: newHeadline,
      heroSubheadline: newSub,
      ctaText: newCta,
    });
    pushSnapshot(snapshot, {
      isTextEdit:
        typeof patch.headline === "string" ||
        typeof patch.subheadline === "string" ||
        typeof patch.ctaText === "string" ||
        typeof patch.title === "string" ||
        typeof patch.subtitle === "string",
    });
    sendPreviewUpdate({
      sections: newSections,
      pageSections: { ...pageSections, [currentPageId]: newSections },
      currentPageId,
      branding: {
        heroHeadline: newHeadline,
        heroSubheadline: newSub,
        ctaText: newCta,
      },
    });
  };

  // Global Store Settings Update
  const handleUpdateGlobalSettings = (patch: {
    storeName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    bannerUrl?: string;
    styling?: Partial<StoreStylingTokens>;
  }) => {
    const newName = patch.storeName !== undefined ? patch.storeName : storeName;
    const newPrimary = patch.primaryColor !== undefined ? patch.primaryColor : primaryColor;
    const newSecondary = patch.secondaryColor !== undefined ? patch.secondaryColor : secondaryColor;
    const newFont = patch.fontFamily !== undefined ? patch.fontFamily : fontFamily;
    const newLogo = patch.logoUrl !== undefined ? patch.logoUrl : logoUrl;
    const newBanner = patch.bannerUrl !== undefined ? patch.bannerUrl : bannerUrl;
    const newStyling = patch.styling ? { ...styling, ...patch.styling } : styling;

    if (patch.storeName !== undefined) setStoreName(newName);
    if (patch.primaryColor !== undefined) setPrimaryColor(newPrimary);
    if (patch.secondaryColor !== undefined) setSecondaryColor(newSecondary);
    if (patch.fontFamily !== undefined) setFontFamily(newFont);
    if (patch.logoUrl !== undefined) setLogoUrl(newLogo);
    if (patch.bannerUrl !== undefined) setBannerUrl(newBanner);
    if (patch.styling) setStyling(newStyling);

    const snapshot = createSnapshot({
      storeName: newName,
      primaryColor: newPrimary,
      secondaryColor: newSecondary,
      fontFamily: newFont,
      logoUrl: newLogo,
      bannerUrl: newBanner,
      styling: newStyling,
    });
    pushSnapshot(snapshot, { isTextEdit: patch.storeName !== undefined });
    sendPreviewUpdate({
      name: newName,
      branding: {
        primaryColor: newPrimary,
        secondaryColor: newSecondary,
        fontFamily: newFont,
        logoUrl: newLogo,
        bannerUrl: newBanner,
      },
      styling: newStyling,
    });
  };

  // Theme & Template Selection
  const handleSelectTheme = (selectedThemeId: string) => {
    const theme = COLOR_THEMES.find((t) => t.id === selectedThemeId);
    if (!theme) return;
    setThemeId(selectedThemeId);
    setPrimaryColor(theme.tokens.primary);
    setSecondaryColor(theme.tokens.secondary);

    const snapshot = createSnapshot({
      themeId: selectedThemeId,
      primaryColor: theme.tokens.primary,
      secondaryColor: theme.tokens.secondary,
    });
    pushSnapshot(snapshot);
    sendPreviewUpdate({
      themeId: selectedThemeId,
      branding: {
        primaryColor: theme.tokens.primary,
        secondaryColor: theme.tokens.secondary,
      },
    });
  };

  const handleSelectTemplate = (selectedTemplateId: string) => {
    const tmpl = DESIGN_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!tmpl) return;
    setTemplateId(selectedTemplateId);

    const snapshot = createSnapshot({ templateId: selectedTemplateId });
    pushSnapshot(snapshot);
    sendPreviewUpdate({ templateId: selectedTemplateId });
  };

  const handleRefreshIframe = () => {
    setIsIframeLoading(true);
    setIframeKey(Date.now());
  };

  const localSubdomainUrl = store.localUrl || getStoreLocalSubdomainUrl(store.slug);
  const storefrontUrl = `/store/${store.slug}`;

  const currentBranding: StoreBranding = {
    primaryColor,
    secondaryColor,
    fontFamily,
    logoUrl,
    bannerUrl,
    heroHeadline,
    heroSubheadline,
    aboutText,
    ctaText,
  };

  const selectedSection = activeSections.find((s) => s.id === selectedSectionId) || null;

  return (
    <div
      data-testid="advanced-visual-editor-workspace"
      className="flex flex-col h-[calc(100vh-80px)] min-h-[850px] w-full bg-[#18231E]/5 rounded-xl border border-stone-200 shadow-md overflow-hidden"
    >
      {/* 1. Global Editor Toolbar */}
      <EditorToolbar
        storeName={storeName}
        websiteType={store.websiteType || "ecommerce"}
        storeSlug={store.slug}
        storeStatus={store.status}
        localSubdomainUrl={localSubdomainUrl}
        viewportMode={viewportMode}
        onViewportChange={setViewportMode}
        canUndo={canUndo}
        canRedo={canRedo}
        undoCount={undoCount}
        redoCount={redoCount}
        onUndo={undo}
        onRedo={redo}
        saveStatus={saveStatus}
        saveError={saveError}
        onManualSave={manualSave}
        isSaving={saveStatus === "saving"}
        isPublishing={isPublishing}
        publishSuccess={publishSuccess}
        onPublish={async (status) => {
          if (onPublishStore) {
            await onPublishStore(status);
          }
        }}
        pages={pages}
        currentPageId={currentPageId}
        onPageChange={(pageId: string) => {
          setCurrentPageId(pageId);
          setSelectedSectionId(null);
          if (!pageSections[pageId]) {
            const starters = getStarterSectionsForPage(pageId);
            setPageSections((prev) => ({ ...prev, [pageId]: starters }));
          }
          const page = pages.find((p) => p.id === pageId);
          if (page?.path && iframeRef.current?.contentWindow) {
            if (page.path.startsWith("#")) {
              const targetType = page.path.replace("#", "");
              const currentSecs = pageSections[pageId] || getStarterSectionsForPage(pageId);
              const matchingSec = currentSecs.find((s) => s.type.includes(targetType));
              if (matchingSec) {
                setSelectedSectionId(matchingSec.id);
              }
            }
          }
        }}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
      />

      {/* 2. Workspace Body: Left Sidebar + Visual Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel */}
        <EditorLeftPanel
          isOpen={isLeftPanelOpen}
          activeTab={leftTab}
          onTabChange={setLeftTab}
          sections={activeSections}
          selectedSectionId={selectedSectionId}
          onSelectSection={(id) => {
            setSelectedSectionId(id);
            if (id) setIsRightPanelOpen(true);
          }}
          onReorderSections={handleReorderSections}
          onToggleVisibility={handleToggleVisibility}
          onDuplicateSection={handleDuplicateSection}
          onDeleteSection={handleDeleteSection}
          onAddSection={handleAddSection}
          pages={pages}
          currentPageId={currentPageId}
          onPageChange={(pageId: string) => {
            setCurrentPageId(pageId);
            setSelectedSectionId(null);
            if (!pageSections[pageId]) {
              const starters = getStarterSectionsForPage(pageId);
              setPageSections((prev) => ({ ...prev, [pageId]: starters }));
            }
          }}
          websiteType={store.websiteType || "ecommerce"}
          themeId={themeId}
          onThemeChange={handleSelectTheme}
          templateId={templateId}
          onTemplateChange={handleSelectTemplate}
          styling={styling}
          onUpdateStyling={(patch) => handleUpdateGlobalSettings({ styling: patch })}
        />

        {/* Center Canvas */}
        <EditorCanvas
          storefrontUrl={storefrontUrl}
          viewportMode={viewportMode}
          iframeRef={iframeRef}
          iframeKey={iframeKey}
          isIframeLoading={isIframeLoading}
          onIframeLoad={() => setIsIframeLoading(false)}
          onRefreshIframe={handleRefreshIframe}
          selectedSectionId={selectedSectionId}
          sections={activeSections}
          onMoveSectionUp={handleMoveSectionUp}
          onMoveSectionDown={handleMoveSectionDown}
          onDuplicateSection={handleDuplicateSection}
          onDeleteSection={handleDeleteSection}
          onUpdateSectionContent={handleUpdateSectionSettings}
        />

        {/* Right Panel */}
        <EditorRightPanel
          isOpen={isRightPanelOpen}
          selectedSection={selectedSection}
          onCloseSection={() => setSelectedSectionId(null)}
          onUpdateSectionSettings={handleUpdateSectionSettings}
          onToggleVisibility={handleToggleVisibility}
          onDuplicateSection={handleDuplicateSection}
          onDeleteSection={handleDeleteSection}
          storeName={storeName}
          onUpdateStoreName={(name) => handleUpdateGlobalSettings({ storeName: name })}
          branding={currentBranding}
          onUpdateBranding={(patch) => handleUpdateGlobalSettings(patch)}
          styling={styling}
          onUpdateStyling={(patch) => handleUpdateGlobalSettings({ styling: patch })}
          businessProfile={store.businessProfile}
        />
      </div>
    </div>
  );
};
