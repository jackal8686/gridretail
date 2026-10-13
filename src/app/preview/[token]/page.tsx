import React from "react";
import { hashToken } from "@/lib/crypto/tokens";
import { PreviewShareRepository } from "@/lib/repositories/preview-share.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { FeedbackRepository } from "@/lib/repositories/feedback.repository";
import { Product } from "@/types";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { ClientFeedbackDrawer } from "@/components/shared/ClientFeedbackDrawer";
import { ShieldAlert, Clock, Lock, Sparkles } from "lucide-react";

interface PublicPreviewPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicPreviewPage({ params }: PublicPreviewPageProps) {
  const { token } = await params;

  if (!token || token.length < 16) {
    return <InvalidLinkView message="Invalid or malformed preview link." />;
  }

  const tokenHash = hashToken(token);
  const share = await PreviewShareRepository.findByTokenHash(tokenHash);

  if (!share) {
    return <InvalidLinkView message="The requested preview link was not found or is invalid." />;
  }

  if (share.status === "revoked") {
    return (
      <InvalidLinkView
        icon={<Lock className="h-8 w-8 text-red-500" />}
        title="Preview Access Revoked"
        message="This demonstration preview link has been revoked by the account team. Please reach out to your GridRetail representative for an updated link."
      />
    );
  }

  if (share.status === "expired") {
    return (
      <InvalidLinkView
        icon={<Clock className="h-8 w-8 text-amber-500" />}
        title="Preview Link Expired"
        message="This confidential demonstration preview has expired. Please contact your account representative to request a new session."
      />
    );
  }

  // Record access count
  await PreviewShareRepository.recordAccess(share.id);

  // Load authorized store
  const store = await StoreRepository.findById(share.storeId);
  if (!store) {
    return <InvalidLinkView message="The storefront project associated with this link is unavailable." />;
  }

  const template = await TemplateRepository.findById(store.templateId);

  let products: Product[] = [];
  if (store.selectedProductIds && store.selectedProductIds.length > 0) {
    products = await ProductRepository.findByIds(store.selectedProductIds);
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll({ category: store.industry });
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll();
  }

  // Fetch feedback history for this store
  const feedbackList = await FeedbackRepository.findByStoreId(store.id);

  return (
    <div>
      {/* Top Client Pitch Bar */}
      <div className="bg-[#18231E] text-white px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#2C3B34]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold">Tailored Demonstration Storefront</span>
          <span className="text-stone-400 hidden sm:inline">• Prepared exclusively for {share.clientName || store.clientName}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-stone-400">
          <span>Expires: {new Date(share.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
            Active Review
          </span>
        </div>
      </div>

      {/* Render Storefront */}
      <StorefrontView
        initialStore={store}
        template={template}
        initialProducts={products}
        isPreviewMode={true}
      />

      {/* Floating Client Feedback & Approval Drawer */}
      <ClientFeedbackDrawer
        token={token}
        clientName={share.clientName || store.clientName}
        storeName={store.name}
        initialFeedback={feedbackList}
      />
    </div>
  );
}

function InvalidLinkView({
  title = "Preview Link Unavailable",
  message,
  icon,
}: {
  title?: string;
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#E4E9E5] shadow-sm space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-600">
          {icon || <ShieldAlert className="h-8 w-8 text-stone-500" />}
        </div>
        <h1 className="text-xl font-bold text-[#18231E]">{title}</h1>
        <p className="text-xs text-[#66736C] leading-relaxed">{message}</p>
        <div className="pt-4 border-t border-[#F0F4F1]">
          <p className="text-[11px] text-[#909D96]">
            GridRetail Demonstration Platform • Enterprise Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
