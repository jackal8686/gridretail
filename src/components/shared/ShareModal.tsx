"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PreviewShare } from "@/types/preview-share";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  clientName: string;
}

export function ShareModal({
  isOpen,
  onClose,
  storeId,
  storeName,
  clientName,
}: ShareModalProps) {
  const [shares, setShares] = useState<PreviewShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationHours, setDurationHours] = useState(72);
  const [latestGeneratedUrl, setLatestGeneratedUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing shares
  useEffect(() => {
    async function loadShares() {
      if (!storeId || !isOpen) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/stores/${storeId}/shares`);
        if (res.ok) {
          const data = await res.json();
          setShares(data.shares || []);
        }
      } catch {
        setErrorMessage("Failed to load active preview links.");
      } finally {
        setIsLoading(false);
      }
    }

    loadShares();
  }, [storeId, isOpen]);

  const handleCreateShare = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setLatestGeneratedUrl(null);

    try {
      const res = await fetch(`/api/stores/${storeId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationHours }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate link");
      }

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.previewUrl}`;
      setLatestGeneratedUrl(fullUrl);
      setShares((prev) => [data.share, ...prev]);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error generating link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const res = await fetch(`/api/stores/${storeId}/shares/${shareId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        const data = await res.json();
        setShares((prev) =>
          prev.map((s) => (s.id === shareId ? data.share : s))
        );
      }
    } catch {
      setErrorMessage("Error revoking link.");
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Client Storefront Preview"
      description={`Generate a secure, expiring public link for ${clientName} to review the ${storeName} storefront proposal.`}
      maxWidth="md"
    >
      <div className="space-y-5 text-xs">
        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Generate New Link Section */}
        <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#E4E9E5] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#18231E]">Create New Preview Link</span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[#66736C]">Validity:</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="bg-white border border-[#CCD5CE] rounded px-2 py-1 text-xs"
              >
                <option value={24}>24 Hours</option>
                <option value={72}>3 Days (Recommended)</option>
                <option value={168}>7 Days</option>
                <option value={336}>14 Days</option>
              </select>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateShare}
            isLoading={isGenerating}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Generate Bearer Link
          </Button>

          {/* Just Generated URL Display */}
          {latestGeneratedUrl && (
            <div className="p-3 bg-[#E2F5E9] border border-[#C8E8D5] rounded-lg space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[#176B4D] font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Secure Link Ready for Client</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(latestGeneratedUrl)}
                  className="flex items-center gap-1 text-xs bg-white text-[#176B4D] px-2 py-1 rounded border border-[#C8E8D5] hover:bg-[#F0F4F1] cursor-pointer"
                >
                  {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUrl ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={latestGeneratedUrl}
                className="w-full text-[11px] font-mono bg-white border border-[#C8E8D5] rounded px-2 py-1 text-[#18231E] select-all"
              />
              <p className="text-[10px] text-[#4F5D56]">
                This tokenized link can be opened by the client without signing in. Anyone with this link can view the preview until it expires.
              </p>
            </div>
          )}
        </div>

        {/* Existing Shares List */}
        <div className="space-y-2">
          <h3 className="font-semibold text-[#18231E]">Active & Past Links</h3>
          {isLoading ? (
            <p className="text-stone-400 py-3 text-center">Loading links...</p>
          ) : shares.length === 0 ? (
            <p className="text-[#66736C] py-3 text-center bg-stone-50 rounded-lg border border-dashed border-[#E4E9E5]">
              No preview links generated yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {shares.map((share) => {
                const isActive = share.status === "active";
                return (
                  <div
                    key={share.id}
                    className="p-3 bg-white border border-[#E4E9E5] rounded-lg flex items-center justify-between gap-3 text-[11px]"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded-full font-semibold uppercase text-[9px] ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : share.status === "revoked"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {share.status}
                        </span>
                        <span className="text-stone-500 font-mono text-[10px]">
                          Created by {share.createdByName || "Operator"}
                        </span>
                      </div>
                      <p className="text-[#66736C] flex items-center gap-1 text-[10px]">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(share.expiresAt).toLocaleDateString()} at{" "}
                        {new Date(share.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" • "}Accessed {share.accessCount} times
                      </p>
                    </div>

                    {isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeShare(share.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[10px] h-7"
                        leftIcon={<Trash2 className="h-3 w-3" />}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
