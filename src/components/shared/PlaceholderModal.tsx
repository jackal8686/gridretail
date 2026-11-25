"use client";

import React from "react";
import { Info, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface PlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  targetPhase?: string;
  description?: string;
}

export function PlaceholderModal({
  isOpen,
  onClose,
  featureName,
  description,
}: PlaceholderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${featureName}`}
      description="Item Details & Context"
      maxWidth="md"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 py-1">
        <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#176B4D]">
            <Info className="h-4 w-4" />
            <span>Information</span>
          </div>
          <p className="text-xs text-[#66736C] leading-relaxed">
            {description || `Detailed overview and attributes for "${featureName}".`}
          </p>
        </div>

        <div className="text-xs text-[#66736C] space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#176B4D]" />
            <span>GridRetail Website Generation Platform &mdash; Production Ready</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
