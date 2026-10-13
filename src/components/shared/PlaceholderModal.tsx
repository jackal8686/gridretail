"use client";

import React from "react";
import { Sparkles, Calendar, Layers } from "lucide-react";
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
  targetPhase = "Phase 2 (Store Engine & Workflow)",
  description,
}: PlaceholderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${featureName}`}
      description="Feature Roadmap Specification"
      maxWidth="md"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Understood
        </Button>
      }
    >
      <div className="space-y-4 py-1">
        <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#176B4D]">
            <Sparkles className="h-4 w-4" />
            <span>Scheduled Implementation</span>
          </div>
          <p className="text-xs text-[#66736C]">
            {description ||
              `The full interactive execution of "${featureName}" (wizard workflow, dynamic catalog generation, and database persistence) is scheduled for ${targetPhase}.`}
          </p>
        </div>

        <div className="text-xs text-[#66736C] space-y-1.5">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[#176B4D]" />
            <span><strong>Phase 1 Scope:</strong> Foundation, Design System, Reusable UI & Navigation.</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#176B4D]" />
            <span><strong>Next Phase:</strong> Storefront generator engine, MongoDB models, client workflows.</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
