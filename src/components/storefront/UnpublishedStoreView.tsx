import React from "react";
import Link from "next/link";
import { Lock, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StoreStatus } from "@/types";

interface UnpublishedStoreViewProps {
  storeName: string;
  status: StoreStatus;
  slug: string;
}

export function UnpublishedStoreView({ storeName, status, slug }: UnpublishedStoreViewProps) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E4E9E5] shadow-lg p-6 sm:p-8 text-center space-y-6">
        {/* Status Icon */}
        <div className="h-14 w-14 rounded-2xl bg-[#FFF8EB] border border-[#FDE5B5] text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <Lock className="h-7 w-7" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 mb-1">
            <StatusBadge status={status} size="sm" />
            <span className="text-[11px] font-mono text-[#66736C]">({slug})</span>
          </div>
          <h1 className="text-xl font-bold text-[#18231E] tracking-tight">{storeName}</h1>
          <p className="text-xs text-[#66736C] leading-relaxed">
            This storefront is currently in <strong className="text-[#18231E]">{status}</strong> status and has not been published for public access.
          </p>
        </div>

        {/* Guidance Notice */}
        <div className="p-3.5 rounded-xl bg-[#F0F4F1] border border-[#E4E9E5] text-left space-y-2 text-xs">
          <div className="flex items-start gap-2 text-[#4F5D56]">
            <Sparkles className="h-4 w-4 text-[#176B4D] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#18231E]">Client Reviewers:</span> Use your dedicated, time-limited preview link provided by the account team.
            </div>
          </div>
          <div className="flex items-start gap-2 text-[#4F5D56]">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#18231E]">Internal Team:</span> Sign in with employee credentials to view or edit this draft.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Link href="/login" className="block w-full">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In to Workspace
            </Button>
          </Link>
          <p className="text-[11px] text-[#909D96]">
            Hostname existence does not bypass workspace access boundaries.
          </p>
        </div>
      </div>
    </div>
  );
}
