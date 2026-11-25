import React from "react";
import { FormStep } from "@/types/lead";
import { Plus, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FormStepManagerProps {
  steps: FormStep[];
  activeStepIndex: number;
  onSelectStep: (index: number) => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onUpdateStep: (index: number, patch: Partial<FormStep>) => void;
}

export const FormStepManager: React.FC<FormStepManagerProps> = ({
  steps,
  activeStepIndex,
  onSelectStep,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
}) => {
  const currentStep = steps[activeStepIndex] || steps[0];

  return (
    <div className="bg-white rounded-xl border border-[#E4E9E5] p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#F0F4F1]">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#176B4D]" />
          <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
            Form Steps & Organization ({steps.length})
          </h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddStep}
          leftIcon={<Plus className="h-3 w-3" />}
          className="text-xs"
        >
          Add Step
        </Button>
      </div>

      {/* Step Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, idx) => {
          const isSelected = idx === activeStepIndex;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                isSelected
                  ? "bg-[#176B4D] text-white border-[#176B4D] shadow-xs"
                  : "bg-[#FAF9F6] text-[#4F5D56] border-[#E4E9E5] hover:border-[#CCD5CE]"
              }`}
              onClick={() => onSelectStep(idx)}
            >
              <span>
                Step {idx + 1}: {step.title || "Untitled"}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-white/20" : "bg-[#E4E9E5] text-[#18231E]"
                }`}
              >
                {step.fields.length}
              </span>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete Step ${idx + 1} and its ${step.fields.length} fields?`)) {
                      onRemoveStep(idx);
                    }
                  }}
                  className={`ml-1 hover:opacity-100 ${
                    isSelected ? "text-white/80 hover:text-white" : "text-[#909D96] hover:text-[#C43D3D]"
                  }`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Step Metadata Edit */}
      {currentStep && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div>
            <label className="font-semibold text-[#18231E] block mb-1">Step Heading</label>
            <input
              type="text"
              value={currentStep.title}
              onChange={(e) => onUpdateStep(activeStepIndex, { title: e.target.value })}
              placeholder="e.g. Project Scope & Specifications"
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>
          <div>
            <label className="font-semibold text-[#18231E] block mb-1">Step Subtitle / Description</label>
            <input
              type="text"
              value={currentStep.description || ""}
              onChange={(e) => onUpdateStep(activeStepIndex, { description: e.target.value })}
              placeholder="e.g. Tell us more about what you want to achieve."
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
