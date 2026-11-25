"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Store, DeliveryRecord, DeliveryMode, DeploymentRecord, DeploymentProvider } from "@/types";
import {
  X,
  Package,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  FileCode,
  Globe,
  Clock,
  ShieldCheck,
  Rocket,
  ExternalLink,
  Copy,
} from "lucide-react";

interface DeliveryModalProps {
  store: Store;
  isOpen: boolean;
  onClose: () => void;
}

export function DeliveryModal({ store, isOpen, onClose }: DeliveryModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "staging">("export");
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [selectedMode, setSelectedMode] = useState<DeliveryMode>("bundle_export");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Staging deployment state
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<DeploymentProvider>("mock");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<{
    type: "success" | "error";
    text: string;
    url?: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stores/${store.id}/deliveries`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
      }
    } catch {
      // Ignore network errors in preview mode
    } finally {
      setIsLoading(false);
    }
  }, [store.id]);

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch(`/api/stores/${store.id}/deployments`);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data.deployments || []);
      }
    } catch {
      // Ignore network errors
    }
  }, [store.id]);

  useEffect(() => {
    if (isOpen) {
      fetchDeliveries();
      fetchDeployments();
      setStatusMessage(null);
      setDeployStatus(null);
    }
  }, [isOpen, fetchDeliveries, fetchDeployments]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/stores/${store.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedMode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate package");
      }

      setStatusMessage({
        type: "success",
        text: `Export package generated successfully (${data.delivery?.artifactName || "ZIP"})!`,
      });
      fetchDeliveries();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Generation failed",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployStatus(null);
    try {
      const res = await fetch(`/api/stores/${store.id}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Deployment failed");
      }

      const stagingUrl = data.deployment?.stagingUrl;
      setDeployStatus({
        type: "success",
        text: `Successfully deployed to ${selectedProvider}!`,
        url: stagingUrl,
      });
      fetchDeployments();
    } catch (err: unknown) {
      setDeployStatus({
        type: "error",
        text: err instanceof Error ? err.message : "Deployment failed",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              {activeTab === "staging" ? <Rocket className="h-5 w-5" /> : <Package className="h-5 w-5" />}
            </div>
            <div>
              <h2 id="delivery-modal-title" className="text-lg font-bold text-stone-900">
                {activeTab === "staging" ? "One-Click Staging Deployment" : "Storefront Delivery & Export"}
              </h2>
              <p className="text-xs text-stone-500">
                {activeTab === "staging"
                  ? `Deploy live preview environments for ${store.name}`
                  : `Package and distribute ${store.name} for ${store.clientName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-stone-400 hover:text-stone-600 p-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Close delivery modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-0 border-b border-stone-200 bg-stone-50/30 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "export"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Package className="h-4 w-4" />
            Static Export &amp; Packages
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staging")}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "staging"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Rocket className="h-4 w-4" />
            One-Click Staging Deploy
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "export" ? (
            <>
              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                    statusMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {statusMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <span className="font-medium">{statusMessage.text}</span>
                </div>
              )}

              {/* Mode Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-3">
                  Delivery Target &amp; Packaging Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMode("bundle_export")}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedMode === "bundle_export"
                        ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileCode className="h-4 w-4 text-emerald-700" />
                      <span className="text-sm font-bold text-stone-900">Standalone ZIP Bundle</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Complete static export with index.html, styles.css, store manifest, and product catalog.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode("platform_publish")}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedMode === "platform_publish"
                        ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                        : "border-stone-200 hover:border-stone-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-emerald-700" />
                      <span className="text-sm font-bold text-stone-900">Platform Demonstration</span>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Generates an immutable deployment snapshot ready for client live pitch presentation.
                    </p>
                  </button>
                </div>
              </div>

              {/* Packaging Details Summary */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-medium flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-stone-400" />
                    Target Archive Format:
                  </span>
                  <span className="font-semibold text-stone-900">Standard PKZIP 2.0 (.zip)</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-medium flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-stone-400" />
                    Integrity Verification:
                  </span>
                  <span className="font-semibold text-stone-900">SHA-256 Cryptographic Checksum</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    Compatibility:
                  </span>
                  <span className="font-semibold text-stone-900">Universal Static Web Server / S3 / Vercel / Netlify</span>
                </div>
              </div>

              {/* Action Trigger */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Building Package...</span>
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      <span>Generate Delivery Package</span>
                    </>
                  )}
                </button>
              </div>

              {/* Deliveries History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Delivery History &amp; Downloadable Archives ({deliveries.length})
                  </label>
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />}
                </div>

                {deliveries.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                    No delivery packages generated yet. Click &quot;Generate Delivery Package&quot; above to create one.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden">
                    {deliveries.map((d) => (
                      <div key={d.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50/60 transition-colors text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800">{d.artifactName || `Bundle (${d.mode})`}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                              {d.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-stone-400 text-[11px]">
                            <span>{new Date(d.createdAt).toLocaleString()}</span>
                            <span>&bull;</span>
                            <span>{d.fileSizeBytes ? `${(d.fileSizeBytes / 1024).toFixed(1)} KB` : "ZIP"}</span>
                            {d.checksumSha256 && (
                              <>
                                <span>&bull;</span>
                                <span className="font-mono text-[10px]">SHA: {d.checksumSha256.slice(0, 8)}...</span>
                              </>
                            )}
                          </div>
                        </div>

                        <a
                          href={`/api/stores/${store.id}/deliveries/${d.id}/download`}
                          download={d.artifactName || `export-${store.slug}.zip`}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 hover:border-emerald-600 hover:text-emerald-700 bg-white font-medium text-stone-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Staging Deployment Content */}
              {deployStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-2 ${
                    deployStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {deployStatus.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span className="font-medium">{deployStatus.text}</span>
                  </div>
                  {deployStatus.url && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-emerald-200">
                      <a
                        href={deployStatus.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-emerald-700 hover:underline truncate flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        {deployStatus.url}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(deployStatus.url!)}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedUrl ? "Copied" : "Copy URL"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Provider Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-3">
                  Target Cloud Provider &amp; Hosting Environment
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: "mock" as const,
                      name: "Simulated Edge Staging",
                      desc: "Instant sandbox deployment on GridRetail's simulated edge network.",
                      tag: "Recommended for Pitch",
                    },
                    {
                      id: "cloudflare_pages" as const,
                      name: "Cloudflare Pages",
                      desc: "Deploy directly to Cloudflare Pages edge CDN via API token.",
                      tag: "Cloud CDN",
                    },
                    {
                      id: "vercel" as const,
                      name: "Vercel Preview",
                      desc: "Deploy preview instances on Vercel serverless platform.",
                      tag: "Serverless",
                    },
                    {
                      id: "aws_s3" as const,
                      name: "AWS S3 Static Web",
                      desc: "Direct object upload to configured S3 web hosting bucket.",
                      tag: "Cloud Storage",
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selectedProvider === p.id
                          ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-stone-900">{p.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          {p.tag}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deployment Trigger */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deploying to Staging...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      <span>Deploy to Staging</span>
                    </>
                  )}
                </button>
              </div>

              {/* Deployment History */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-3">
                  Deployment History ({deployments.length})
                </label>
                {deployments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                    No staging deployments created yet. Click &quot;Deploy to Staging&quot; above to launch one.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden">
                    {deployments.map((d) => (
                      <div key={d.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50/60 transition-colors text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800 capitalize">
                              {d.provider.replace("_", " ")}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                d.status === "ready"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : d.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {d.status}
                            </span>
                          </div>
                          <div className="text-stone-400 text-[11px]">
                            {new Date(d.createdAt).toLocaleString()} &bull; by {d.createdBy}
                          </div>
                          {d.errorMessage && (
                            <div className="text-red-600 text-[11px] font-mono">{d.errorMessage}</div>
                          )}
                        </div>

                        {d.stagingUrl && (
                          <a
                            href={d.stagingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-stone-200 hover:border-emerald-600 hover:text-emerald-700 bg-white font-medium text-stone-700 flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:text-stone-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
