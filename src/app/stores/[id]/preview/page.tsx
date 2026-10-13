"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Store } from "@/types";
import { cn } from "@/utils/cn";

type DevicePreset = "desktop" | "tablet" | "mobile";

export default function StorePreviewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DevicePreset>("desktop");
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  useEffect(() => {
    async function loadStore() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stores/${id}`);
        if (res.ok) {
          const data = await res.json();
          setStore(data.store);
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

  const handleRefreshIframe = () => {
    setIsIframeLoading(true);
    setIframeKey(Date.now());
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
        <span>Loading storefront preview configuration...</span>
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E9E5]">
        <div className="flex items-center gap-3">
          <Link href="/stores">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Stores
            </Button>
          </Link>
          <div className="h-4 w-px bg-[#E4E9E5]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#18231E]">{store.name}</h1>
              <StatusBadge status={store.status} size="sm" />
            </div>
            <p className="text-xs text-[#66736C]">
              Client: <span className="font-semibold text-[#18231E]">{store.clientName}</span> • Template:{" "}
              <span className="font-semibold text-[#18231E]">{store.templateName}</span> • Slug:{" "}
              <span className="font-mono text-[#176B4D]">/{store.slug}</span>
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ExternalLink className="h-3.5 w-3.5 text-[#176B4D]" />}
            >
              Open Live in New Tab
            </Button>
          </a>
        </div>
      </div>

      {/* Control Bar: Device presets & Refresh */}
      <div className="bg-white p-3 rounded-xl border border-[#E4E9E5] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Device Switcher */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F6] p-1 rounded-lg border border-[#E4E9E5]">
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

        {/* Viewport Info & Refresh */}
        <div className="flex items-center gap-3 text-xs text-[#66736C]">
          <span className="hidden sm:inline font-mono">
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

      {/* Sandboxed Iframe Container Canvas */}
      <div className="bg-[#FAF9F6] p-4 sm:p-8 rounded-2xl border border-[#E4E9E5] min-h-[900px] flex justify-center items-start overflow-x-auto shadow-inner">
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
                <span>Rendering storefront canvas...</span>
              </div>
            </div>
          )}

          <iframe
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
  );
}
