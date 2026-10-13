"use client";

import React, { useState } from "react";
import { Info, X } from "lucide-react";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-[#E2F5E9] border-b border-[#C8E8D5] px-4 py-2 text-xs text-[#176B4D] flex items-center justify-between">
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        <Info className="h-4 w-4 shrink-0 text-[#176B4D]" />
        <span>
          <strong className="font-semibold">Phase 1 Preview:</strong> GridRetail Foundation & UI Design System. All store metrics, products, and client records are mock demonstration datasets.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded text-[#176B4D] hover:bg-[#d0eed9] transition-colors ml-2"
        aria-label="Dismiss banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
