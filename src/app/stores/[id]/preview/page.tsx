"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  Presentation,
  Share2,
  Package,
  Calendar as CalendarIcon,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShareModal } from "@/components/shared/ShareModal";
import { DeliveryModal } from "@/components/shared/DeliveryModal";
import { Store } from "@/types";
import { VisualEditorWorkspace } from "@/components/editor/VisualEditorWorkspace";

export default function StoreCustomizerPreviewPage() {
  const params = useParams();
  const id = params?.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Initial Data Load
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

  // Publish / Unpublish status handler
  const handlePublishStore = async (targetStatus: "Published" | "Draft" = "Published") => {
    if (!store || isPublishing) return;
    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);

    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to transition store status to ${targetStatus}`);
      }

      const updatedData = await res.json();
      setStore(updatedData.store);
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Error updating store status.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-[#66736C]">
        <div className="animate-spin h-6 w-6 border-2 border-[#176B4D] border-t-transparent rounded-full mx-auto mb-3" />
        <span>Loading advanced visual editor...</span>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-[#FDEAEA] text-[#C43D3D] flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-[#18231E]">Storefront Editor Unavailable</h2>
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

  return (
    <div className="space-y-3">
      {/* Top Utility Bar for Store Extras (Schedule, Leads, Present, Deliver, Share) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          {store.websiteType === "appointments" && (
            <Link href={`/stores/${store.id}/schedule`}>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 text-xs"
                leftIcon={<CalendarIcon className="h-3.5 w-3.5 text-emerald-600" />}
              >
                Schedule &amp; Bookings
              </Button>
            </Link>
          )}

          {store.websiteType === "lead_gen" && (
            <Link href={`/stores/${store.id}/leads`}>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 text-xs"
                leftIcon={<Users className="h-3.5 w-3.5 text-emerald-600" />}
              >
                Lead CRM
              </Button>
            </Link>
          )}

          <Link href={`/stores/${store.id}/present`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-stone-700 border-stone-200"
              leftIcon={<Presentation className="h-3.5 w-3.5 text-[#176B4D]" />}
            >
              Present
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeliveryModalOpen(true)}
            className="h-8 text-xs text-stone-700 border-stone-200"
            leftIcon={<Package className="h-3.5 w-3.5 text-[#176B4D]" />}
          >
            Export &amp; Deliver
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            className="h-8 text-xs text-stone-700 border-stone-200"
            leftIcon={<Share2 className="h-3.5 w-3.5 text-[#176B4D]" />}
          >
            Share with Client
          </Button>
        </div>

        {publishError && (
          <span className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded-md border border-red-200">
            {publishError}
          </span>
        )}
      </div>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        storeId={store.id}
        storeName={store.name}
        clientName={store.clientName}
      />

      {/* Delivery & Export Modal Dialog */}
      <DeliveryModal
        store={store}
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      {/* Visual Editor Workspace */}
      <VisualEditorWorkspace
        initialStore={store}
        onStoreUpdated={(updated) => setStore(updated)}
        onPublishStore={handlePublishStore}
        isPublishing={isPublishing}
        publishSuccess={publishSuccess}
      />
    </div>
  );
}
