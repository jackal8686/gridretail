import React, { useState } from "react";
import { FormField } from "@/types/lead";
import { Button } from "@/components/ui/Button";
import { ConditionalRuleEditor } from "./ConditionalRuleEditor";
import { Plus, Trash2 } from "lucide-react";

interface FieldEditorProps {
  field: FormField;
  allFields: FormField[];
  onChange: (updatedField: FormField) => void;
  onDelete: () => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  allFields,
  onChange,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "options" | "conditions">("general");

  const hasOptions = ["select", "radio", "checkbox"].includes(field.type);

  const handleAddOption = () => {
    const currentOptions = field.options || [];
    const nextIdx = currentOptions.length + 1;
    const newOption = {
      label: `Option ${nextIdx}`,
      value: `option_${nextIdx}`,
    };
    onChange({
      ...field,
      options: [...currentOptions, newOption],
    });
  };

  const handleUpdateOption = (index: number, label: string, value: string) => {
    const currentOptions = [...(field.options || [])];
    currentOptions[index] = { label, value };
    onChange({
      ...field,
      options: currentOptions,
    });
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = (field.options || []).filter((_, idx) => idx !== index);
    onChange({
      ...field,
      options: currentOptions,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#E4E9E5] p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#F0F4F1] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E2F5E9] text-[#176B4D] px-2 py-0.5 rounded">
            {field.type}
          </span>
          <span className="text-xs font-bold text-[#18231E]">{field.label || "Untitled Field"}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#F0F4F1] p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                activeTab === "general" ? "bg-white text-[#18231E] shadow-2xs" : "text-[#66736C]"
              }`}
            >
              General
            </button>
            {hasOptions && (
              <button
                type="button"
                onClick={() => setActiveTab("options")}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  activeTab === "options" ? "bg-white text-[#18231E] shadow-2xs" : "text-[#66736C]"
                }`}
              >
                Options ({field.options?.length || 0})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("conditions")}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                activeTab === "conditions" ? "bg-white text-[#18231E] shadow-2xs" : "text-[#66736C]"
              }`}
            >
              Logic ({field.conditions?.length || 0})
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-[#C43D3D] hover:bg-[#FDEAEA] hover:text-[#C43D3D] p-1.5 h-auto"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeTab === "general" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="font-semibold text-[#18231E] block mb-1">Field Label *</label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#18231E] block mb-1">Placeholder Text</label>
            <input
              type="text"
              value={field.placeholder || ""}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
              placeholder="e.g. Enter your corporate email..."
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-[#18231E] block mb-1">Helper / Guidance Text</label>
            <input
              type="text"
              value={field.helpText || ""}
              onChange={(e) => onChange({ ...field, helpText: e.target.value })}
              placeholder="e.g. We will never share or sell your contact information."
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-1.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="flex items-center gap-4 pt-1 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#18231E]">
              <input
                type="checkbox"
                checked={field.validation?.required ?? false}
                onChange={(e) =>
                  onChange({
                    ...field,
                    validation: { ...field.validation, required: e.target.checked },
                  })
                }
                className="rounded border-[#E4E9E5] text-[#176B4D] focus:ring-[#176B4D]"
              />
              <span>Mandatory / Required Field</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#18231E]">
              <input
                type="checkbox"
                checked={field.width === "half"}
                onChange={(e) =>
                  onChange({
                    ...field,
                    width: e.target.checked ? "half" : "full",
                  })
                }
                className="rounded border-[#E4E9E5] text-[#176B4D] focus:ring-[#176B4D]"
              />
              <span>Half-width (2 columns)</span>
            </label>
          </div>
        </div>
      )}

      {activeTab === "options" && hasOptions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#66736C]">Configure choices available for this field:</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              leftIcon={<Plus className="h-3 w-3" />}
              className="text-xs"
            >
              Add Choice
            </Button>
          </div>

          <div className="space-y-2">
            {(field.options || []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => handleUpdateOption(idx, e.target.value, opt.value)}
                  placeholder="Option display label"
                  className="flex-1 rounded-lg border border-[#E4E9E5] px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => handleUpdateOption(idx, opt.label, e.target.value)}
                  placeholder="Stored value"
                  className="w-32 rounded-lg border border-[#E4E9E5] px-2.5 py-1.5 text-xs font-mono text-[#66736C]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="p-1 text-[#909D96] hover:text-[#C43D3D] rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "conditions" && (
        <ConditionalRuleEditor
          field={field}
          allFields={allFields}
          onChange={(conditions, conditionLogic) =>
            onChange({ ...field, conditions, conditionLogic })
          }
        />
      )}
    </div>
  );
};
