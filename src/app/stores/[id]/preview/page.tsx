"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  Save,
  Check,
  Palette,
  Layout,
  Type,
  ChevronLeft,
  ChevronRight,
  Share2,
  MessageSquare,
  Send,
  CheckCircle2,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ShareModal } from "@/components/shared/ShareModal";
import { Store, PreviewUpdatePayload, StoreFeedback } from "@/types";
import { cn } from "@/utils/cn";

type DevicePreset = "desktop" | "tablet" | "mobile";
type ActiveTab = "branding" | "content" | "sections" | "feedback";

export default function StoreCustomizerPreviewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Device & Canvas State
  const [preset, setPreset] = useState<DevicePreset>("desktop");
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [lastAckTime, setLastAckTime] = useState<number | null>(null);

  // Customizer Drawer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("branding");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Feedback State
  const [feedbackList, setFeedbackList] = useState<StoreFeedback[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [isPostingReply, setIsPostingReply] = useState(false);

  // Media Upload State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Editable Form State
  const [storeName, setStoreName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#176B4D");
  const [secondaryColor, setSecondaryColor] = useState("#FAF9F6");
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubheadline, setHeroSubheadline] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [ctaText, setCtaText] = useState("Explore Catalog");
  const [enabledSections, setEnabledSections] = useState<string[]>([
    "hero",
    "featured_products",
    "about",
    "newsletter",
    "footer",
  ]);

  // Persistence & Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Initial Data Load
  useEffect(() => {
    async function loadStore() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stores/${id}`);
        if (res.ok) {
          const data = await res.json();
          const s: Store = data.store;
          setStore(s);
          setStoreName(s.name);
          setPrimaryColor(s.branding?.primaryColor || "#176B4D");
          setSecondaryColor(s.branding?.secondaryColor || "#FAF9F6");
          setFontFamily(s.branding?.fontFamily || "Inter, sans-serif");
          setLogoUrl(s.branding?.logoUrl || "");
          setBannerUrl(s.branding?.bannerUrl || "");
          setHeroHeadline(s.branding?.heroHeadline || `Welcome to ${s.name}`);
          setHeroSubheadline(
            s.branding?.heroSubheadline ||
              `Curated ${s.industry} collection designed for modern living.`
          );
          setAboutText(s.branding?.aboutText || s.description || "");
          setCtaText(s.branding?.ctaText || "Explore Catalog");
          if (s.enabledSections && s.enabledSections.length > 0) {
            setEnabledSections(s.enabledSections);
          }

          // Fetch feedback
          const fbRes = await fetch(`/api/stores/${id}/feedback`);
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            setFeedbackList(fbData.feedback || []);
          }
        } else {
          setError("Store record not found.");
        }
      } catch {
        setError("Network error loading store record.");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadStore();
    }
  }, [id]);

  // Send Live postMessage to Iframe
  const sendPreviewUpdate = useCallback(
    (payload: PreviewUpdatePayload) => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) return;

      const targetOrigin = window.location.origin;
      iframeRef.current.contentWindow.postMessage(
        {
          type: "GRIDRETAIL_PREVIEW_UPDATE",
          payload,
        },
        targetOrigin
      );
    },
    []
  );

  // Broadcast edits when state changes
  useEffect(() => {
    if (!store) return;

    // Check if changes exist vs original store
    const isDirty =
      storeName !== store.name ||
      primaryColor !== (store.branding?.primaryColor || "#176B4D") ||
      secondaryColor !== (store.branding?.secondaryColor || "#FAF9F6") ||
      fontFamily !== (store.branding?.fontFamily || "Inter, sans-serif") ||
      logoUrl !== (store.branding?.logoUrl || "") ||
      bannerUrl !== (store.branding?.bannerUrl || "") ||
      heroHeadline !== (store.branding?.heroHeadline || `Welcome to ${store.name}`) ||
      heroSubheadline !==
        (store.branding?.heroSubheadline ||
          `Curated ${store.industry} collection designed for modern living.`) ||
      aboutText !== (store.branding?.aboutText || store.description || "") ||
      ctaText !== (store.branding?.ctaText || "Explore Catalog") ||
      JSON.stringify(enabledSections) !== JSON.stringify(store.enabledSections || []);

    setHasUnsavedChanges(isDirty);

    // Live sync with iframe
    const payload: PreviewUpdatePayload = {
      name: storeName,
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
    };

    sendPreviewUpdate(payload);
  }, [
    store,
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
    sendPreviewUpdate,
  ]);

  // Listen for Iframe Handshakes and ACKs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "GRIDRETAIL_PREVIEW_READY") {
        setIsIframeReady(true);
        setIsIframeLoading(false);
        // Dispatch current state immediately upon iframe readiness
        sendPreviewUpdate({
          name: storeName,
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
        });
      } else if (data.type === "GRIDRETAIL_PREVIEW_ACK") {
        setLastAckTime(data.timestamp);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
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
    sendPreviewUpdate,
  ]);

  // Save handler
  const handleSaveChanges = async () => {
    if (!store) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updates = {
        name: storeName.trim(),
        description: aboutText.trim(),
        branding: {
          primaryColor,
          secondaryColor,
          fontFamily,
          logoUrl,
          bannerUrl,
          heroHeadline: heroHeadline.trim(),
          heroSubheadline: heroSubheadline.trim(),
          aboutText: aboutText.trim(),
          ctaText: ctaText.trim(),
        },
        enabledSections,
      };

      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to persist storefront changes.");
      }

      const updatedData = await res.json();
      setStore(updatedData.store);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error saving changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshIframe = () => {
    setIsIframeLoading(true);
    setIsIframeReady(false);
    setIframeKey(Date.now());
  };

  const toggleSection = (sectionId: string) => {
    setEnabledSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getContainerWidth = () => {
    switch (preset) {
      case "mobile":
        return "max-w-[390px] h-[780px]";
      case "tablet":
        return "max-w-[800px] h-[900px]";
      case "desktop":
      default:
        return "w-full h-[850px]";
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-[#66736C]">
        <div className="animate-spin h-6 w-6 border-2 border-[#176B4D] border-t-transparent rounded-full mx-auto mb-3" />
        <span>Loading storefront visual customizer...</span>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-[#FDEAEA] text-[#C43D3D] flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-[#18231E]">Storefront Preview Unavailable</h2>
        <p className="text-xs text-[#66736C] max-w-sm mx-auto">
          {error || "The specified store configuration could not be resolved from the database."}
        </p>
        <Link href="/stores">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
            Return to Store Management
          </Button>
        </Link>
      </div>
    );
  }

  const storefrontUrl = `/store/${store.slug}`;

  return (
    <div className="space-y-4">
      {/* Top Action & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E4E9E5] shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/stores">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Stores
            </Button>
          </Link>
          <div className="h-4 w-px bg-[#E4E9E5]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#18231E]">{store.name}</h1>
              <StatusBadge status={store.status} size="sm" />
              {hasUnsavedChanges && (
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-semibold animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-[#66736C]">
              Client: <span className="font-medium text-[#18231E]">{store.clientName}</span> • Template:{" "}
              <span className="font-medium text-[#18231E]">{store.templateName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-red-600 font-medium mr-2">{saveError}</span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            leftIcon={isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          >
            {isSidebarOpen ? "Hide Controls" : "Edit Storefront"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            leftIcon={<Share2 className="h-3.5 w-3.5 text-[#176B4D]" />}
          >
            Share with Client
          </Button>

          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Open Tab
            </Button>
          </a>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveChanges}
            isLoading={isSaving}
            disabled={!hasUnsavedChanges || isSaving}
            leftIcon={saveSuccess ? <Check className="h-3.5 w-3.5 text-white" /> : <Save className="h-3.5 w-3.5" />}
          >
            {saveSuccess ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        storeId={store.id}
        storeName={store.name}
        clientName={store.clientName}
      />

      {/* Main Workspace: Left Customizer Panel + Central Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT CUSTOMIZER DRAWER */}
        {isSidebarOpen && (
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E4E9E5] shadow-xs flex flex-col h-[850px] overflow-hidden">
            {/* Drawer Tab Headers */}
            <div className="p-2 border-b border-[#E4E9E5] bg-[#FAF9F6] flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("branding")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  activeTab === "branding"
                    ? "bg-white text-[#176B4D] shadow-xs border border-[#E4E9E5]"
                    : "text-[#66736C] hover:text-[#18231E]"
                )}
              >
                <Palette className="h-3.5 w-3.5" />
                <span>Branding</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("content")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  activeTab === "content"
                    ? "bg-white text-[#176B4D] shadow-xs border border-[#E4E9E5]"
                    : "text-[#66736C] hover:text-[#18231E]"
                )}
              >
                <Type className="h-3.5 w-3.5" />
                <span>Content</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sections")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  activeTab === "sections"
                    ? "bg-white text-[#176B4D] shadow-xs border border-[#E4E9E5]"
                    : "text-[#66736C] hover:text-[#18231E]"
                )}
              >
                <Layout className="h-3.5 w-3.5" />
                <span>Sections</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("feedback")}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer relative",
                  activeTab === "feedback"
                    ? "bg-white text-[#176B4D] shadow-xs border border-[#E4E9E5]"
                    : "text-[#66736C] hover:text-[#18231E]"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Review</span>
                {feedbackList.length > 0 && (
                  <span className="bg-[#176B4D] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                    {feedbackList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Drawer Tab Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-5 text-xs">
              {/* TAB 1: BRANDING */}
              {activeTab === "branding" && (
                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-[#18231E] block mb-1">
                        Primary Accent
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-8 w-8 rounded-md border border-[#CCD5CE] cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-full px-2 py-1 rounded-md border border-[#CCD5CE] text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-[#18231E] block mb-1">
                        Secondary Theme
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="h-8 w-8 rounded-md border border-[#CCD5CE] cursor-pointer p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-full px-2 py-1 rounded-md border border-[#CCD5CE] text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Typography Pairing
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden bg-white cursor-pointer"
                    >
                      <option value="Inter, sans-serif">Modern Clean (Inter)</option>
                      <option value="Geist, sans-serif">Technical Sans (Geist)</option>
                      <option value="Georgia, serif">Editorial Elegance (Georgia)</option>
                      <option value="'Playfair Display', serif">Luxury Haute (Playfair)</option>
                      <option value="'Plus Jakarta Sans', sans-serif">Vibrant Tech (Jakarta)</option>
                    </select>
                  </div>

                  {/* Logo Configuration with Direct Upload */}
                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Store Logo
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] border border-[#CCD5CE] rounded-lg cursor-pointer hover:bg-[#F0F4F1] transition-colors text-xs font-semibold text-[#18231E]">
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
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingLogo(true);
                              setUploadError(null);
                              try {
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("purpose", "logo");
                                const res = await fetch(`/api/stores/${store.id}/media`, {
                                  method: "POST",
                                  body: formData,
                                });
                                if (!res.ok) {
                                  const errData = await res.json();
                                  throw new Error(errData.error || "Failed to upload logo.");
                                }
                                const data = await res.json();
                                setLogoUrl(data.asset.url);
                              } catch (err: unknown) {
                                setUploadError(err instanceof Error ? err.message : "Upload error");
                              } finally {
                                setIsUploadingLogo(false);
                              }
                            }}
                          />
                        </label>

                        <input
                          type="url"
                          placeholder="or paste image URL..."
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs"
                        />
                      </div>
                      {logoUrl && (
                        <div className="p-2 bg-[#FAF9F6] border border-[#E4E9E5] rounded-lg flex items-center justify-between">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={logoUrl} alt="Logo preview" className="h-6 max-w-[120px] object-contain" />
                          <button
                            type="button"
                            onClick={() => setLogoUrl("")}
                            className="text-[10px] text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-[#66736C]">
                        Supported: PNG, SVG, JPG, WEBP (Max 5MB).
                      </p>
                    </div>
                  </div>

                  {/* Hero Banner Configuration with Direct Upload */}
                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Hero Banner Image
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] border border-[#CCD5CE] rounded-lg cursor-pointer hover:bg-[#F0F4F1] transition-colors text-xs font-semibold text-[#18231E]">
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
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingBanner(true);
                              setUploadError(null);
                              try {
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("purpose", "banner");
                                const res = await fetch(`/api/stores/${store.id}/media`, {
                                  method: "POST",
                                  body: formData,
                                });
                                if (!res.ok) {
                                  const errData = await res.json();
                                  throw new Error(errData.error || "Failed to upload banner.");
                                }
                                const data = await res.json();
                                setBannerUrl(data.asset.url);
                              } catch (err: unknown) {
                                setUploadError(err instanceof Error ? err.message : "Upload error");
                              } finally {
                                setIsUploadingBanner(false);
                              }
                            }}
                          />
                        </label>

                        <input
                          type="url"
                          placeholder="or paste banner URL..."
                          value={bannerUrl}
                          onChange={(e) => setBannerUrl(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs"
                        />
                      </div>
                      {bannerUrl && (
                        <div className="p-2 bg-[#FAF9F6] border border-[#E4E9E5] rounded-lg flex items-center justify-between">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={bannerUrl} alt="Banner preview" className="h-8 max-w-[120px] object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => setBannerUrl("")}
                            className="text-[10px] text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      {uploadError && (
                        <p className="text-[10px] text-red-600 font-medium">{uploadError}</p>
                      )}
                      <p className="text-[10px] text-[#66736C]">
                        16:9 banner showcased in the storefront hero section.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTENT */}
              {activeTab === "content" && (
                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Hero Headline
                    </label>
                    <input
                      type="text"
                      value={heroHeadline}
                      onChange={(e) => setHeroHeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Hero Subheadline
                    </label>
                    <textarea
                      rows={3}
                      value={heroSubheadline}
                      onChange={(e) => setHeroSubheadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Call to Action Button Text
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#18231E] block mb-1">
                      Brand Story / About
                    </label>
                    <textarea
                      rows={4}
                      value={aboutText}
                      onChange={(e) => setAboutText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SECTIONS */}
              {activeTab === "sections" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[#66736C]">
                    Toggle storefront layout blocks on or off. Changes update instantly on the canvas.
                  </p>

                  {[
                    { id: "hero", label: "Hero Banner & Pitch Message" },
                    { id: "featured_products", label: "Featured Product Catalog Grid" },
                    { id: "about", label: "Brand Story & Heritage" },
                    { id: "newsletter", label: "Newsletter Subscription Box" },
                    { id: "footer", label: "Storefront Legal & Navigation Footer" },
                  ].map((sec) => {
                    const isChecked = enabledSections.includes(sec.id);
                    return (
                      <label
                        key={sec.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                          isChecked
                            ? "bg-[#E2F5E9]/50 border-[#176B4D] text-[#18231E]"
                            : "bg-[#FAF9F6] border-[#CCD5CE] text-[#66736C]"
                        )}
                      >
                        <span className="font-medium">{sec.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSection(sec.id)}
                          className="h-4 w-4 text-[#176B4D] rounded-sm focus:ring-[#176B4D] accent-[#176B4D]"
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: REVIEW & FEEDBACK */}
              {activeTab === "feedback" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-[#18231E] block mb-1">
                      Client Review Status
                    </h4>
                    <div className="flex items-center gap-2 p-2.5 bg-[#FAF9F6] rounded-lg border border-[#E4E9E5]">
                      <StatusBadge status={store.status} size="sm" />
                      <span className="text-[11px] text-[#66736C]">
                        {store.status === "Approved"
                          ? "Client has approved this storefront proposal."
                          : store.status === "Changes Requested"
                          ? "Client has requested updates."
                          : "Awaiting client review response."}
                      </span>
                    </div>
                  </div>

                  {/* Reply Form */}
                  <div className="p-3 bg-[#FAF9F6] rounded-lg border border-[#E4E9E5] space-y-2">
                    <label className="font-semibold text-[#18231E] block text-[11px]">
                      Post Response to Client Thread
                    </label>
                    <textarea
                      rows={2}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type response notes for client or team..."
                      className="w-full px-2.5 py-1.5 rounded-md border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs bg-white"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!replyMessage.trim() || isPostingReply}
                      isLoading={isPostingReply}
                      onClick={async () => {
                        if (!replyMessage.trim()) return;
                        setIsPostingReply(true);
                        try {
                          const res = await fetch(`/api/stores/${store.id}/feedback`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ message: replyMessage }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setFeedbackList((prev) => [data.feedback, ...prev]);
                            setReplyMessage("");
                          }
                        } finally {
                          setIsPostingReply(false);
                        }
                      }}
                      leftIcon={<Send className="h-3 w-3" />}
                    >
                      Post Response
                    </Button>
                  </div>

                  {/* Feedback Stream */}
                  <div className="space-y-2">
                    <h5 className="font-semibold text-[#18231E] text-[11px]">
                      Conversation Thread ({feedbackList.length})
                    </h5>
                    {feedbackList.length === 0 ? (
                      <p className="text-[#66736C] text-[10px] text-center py-4 bg-[#FAF9F6] rounded-lg border border-dashed border-[#CCD5CE]">
                        No client feedback or approval notes received yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {feedbackList.map((item) => {
                          const isClient = item.authorType === "client";
                          const isApproval = item.type === "approval";
                          const isChanges = item.type === "changes_requested";

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "p-2.5 rounded-lg border text-[11px] space-y-1",
                                isApproval
                                  ? "bg-emerald-50/70 border-emerald-300"
                                  : isChanges
                                  ? "bg-amber-50/70 border-amber-300"
                                  : isClient
                                  ? "bg-white border-[#E4E9E5]"
                                  : "bg-[#F0F4F1] border-[#CCD5CE]"
                              )}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-[#18231E]">
                                  {item.authorName}{" "}
                                  <span className="font-normal text-[#66736C]">
                                    ({isClient ? "Client" : "Team"})
                                  </span>
                                </span>
                                <span className="text-[#909D96]">
                                  {new Date(item.createdAt).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>

                              {isApproval && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Proposal Approved</span>
                                </div>
                              )}

                              {isChanges && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Changes Requested</span>
                                </div>
                              )}

                              <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">
                                {item.message}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Status */}
            <div className="p-3 border-t border-[#E4E9E5] bg-[#FAF9F6] text-[10px] text-[#66736C] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isIframeReady ? "bg-emerald-500" : "bg-amber-500 animate-ping"
                  )}
                />
                {isIframeReady ? "Live Canvas Connected" : "Connecting..."}
              </span>
              {lastAckTime && (
                <span>
                  Synced {new Date(lastAckTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CENTRAL PREVIEW CANVAS */}
        <div className={cn("space-y-4", isSidebarOpen ? "lg:col-span-8" : "lg:col-span-12")}>
          {/* Canvas Controls Bar */}
          <div className="bg-white p-2.5 rounded-xl border border-[#E4E9E5] flex items-center justify-between shadow-2xs">
            {/* Viewport Presets */}
            <div className="flex items-center gap-1 bg-[#F0F4F1] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPreset("desktop")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  preset === "desktop"
                    ? "bg-white text-[#176B4D] shadow-xs"
                    : "text-[#66736C] hover:text-[#18231E]"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset("tablet")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  preset === "tablet"
                    ? "bg-white text-[#176B4D] shadow-xs"
                    : "text-[#66736C] hover:text-[#18231E]"
                )}
              >
                <Tablet className="h-3.5 w-3.5" />
                <span>Tablet (768px)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset("mobile")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                  preset === "mobile"
                    ? "bg-white text-[#176B4D] shadow-xs"
                    : "text-[#66736C] hover:text-[#18231E]"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile (375px)</span>
              </button>
            </div>

            {/* Canvas Actions */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline font-mono text-xs text-[#66736C]">
                {preset === "desktop" ? "100% Fluid Width" : preset === "tablet" ? "768 × 1024" : "375 × 812"}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshIframe}
                leftIcon={<RefreshCw className={cn("h-3.5 w-3.5", isIframeLoading && "animate-spin")} />}
              >
                Refresh Canvas
              </Button>
            </div>
          </div>

          {/* Iframe Viewport Sandbox Canvas */}
          <div className="bg-[#FAF9F6] p-4 sm:p-6 rounded-2xl border border-[#E4E9E5] min-h-[850px] flex justify-center items-start overflow-x-auto shadow-inner">
            <div
              className={cn(
                "transition-all duration-300 relative bg-white rounded-xl overflow-hidden shadow-2xl border border-[#CCD5CE]",
                getContainerWidth()
              )}
            >
              {/* Virtual Browser Top Header Chrome for tablet & mobile */}
              {preset !== "desktop" && (
                <div className="bg-[#E4E9E5] px-4 py-2 flex items-center justify-between border-b border-[#CCD5CE] text-[10px] text-[#4F5D56] font-mono select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C43D3D]" />
                    <span className="w-2 h-2 rounded-full bg-[#B7791F]" />
                    <span className="w-2 h-2 rounded-full bg-[#16804A]" />
                  </div>
                  <span className="truncate max-w-[180px] bg-white px-2 py-0.5 rounded text-[10px]">
                    gridretail.demo/store/{store.slug}
                  </span>
                  <span className="text-[10px] font-sans">100%</span>
                </div>
              )}

              {isIframeLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2 text-xs text-[#176B4D]">
                    <div className="animate-spin h-5 w-5 border-2 border-[#176B4D] border-t-transparent rounded-full" />
                    <span>Connecting live storefront renderer...</span>
                  </div>
                </div>
              )}

              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={storefrontUrl}
                title={`${store.name} Preview`}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms"
                onLoad={() => setIsIframeLoading(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
