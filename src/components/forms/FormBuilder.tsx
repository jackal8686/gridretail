import React, { useState } from "react";
import {
  LeadForm,
  FormStep,
  FormField,
  FormFieldType,
  FormSettings,
  FormPresentationMode,
  FormLayoutType,
  PostSubmissionAction,
} from "@/types/lead";
import { FieldPalette } from "./FieldPalette";
import { FieldEditor } from "./FieldEditor";
import { FormStepManager } from "./FormStepManager";
import { Button } from "@/components/ui/Button";
import {
  Save,
  Send,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sparkles,
} from "lucide-react";

interface FormBuilderProps {
  form: LeadForm;
  onSaveDraft: (steps: FormStep[], settings: FormSettings) => Promise<void>;
  onPublishVersion: () => Promise<void>;
  isSaving?: boolean;
  isPublishing?: boolean;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  form,
  onSaveDraft,
  onPublishVersion,
  isSaving = false,
  isPublishing = false,
}) => {
  const [steps, setSteps] = useState<FormStep[]>(() =>
    JSON.parse(JSON.stringify(form.currentDraft.steps))
  );
  const [settings, setSettings] = useState<FormSettings>(() =>
    JSON.parse(JSON.stringify(form.currentDraft.settings))
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    steps[0]?.fields[0]?.id || null
  );
  const [activeTab, setActiveTab] = useState<"fields" | "settings">("fields");

  const currentStep = steps[activeStepIndex] || steps[0];
  const allFields = steps.flatMap((s) => s.fields);
  const selectedField = allFields.find((f) => f.id === selectedFieldId);

  // Field manipulation helpers
  const handleAddField = (type: FormFieldType) => {
    const newFieldId = `field_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newField: FormField = {
      id: newFieldId,
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: "",
      width: "full",
      validation: { required: false },
      options:
        ["select", "radio", "checkbox"].includes(type)
          ? [
              { label: "Option 1", value: "opt_1" },
              { label: "Option 2", value: "opt_2" },
            ]
          : undefined,
    };

    const updatedSteps = [...steps];
    updatedSteps[activeStepIndex] = {
      ...currentStep,
      fields: [...currentStep.fields, newField],
    };

    setSteps(updatedSteps);
    setSelectedFieldId(newFieldId);
  };

  const handleUpdateField = (updatedField: FormField) => {
    const updatedSteps = steps.map((s, sIdx) => {
      if (sIdx !== activeStepIndex) return s;
      return {
        ...s,
        fields: s.fields.map((f) => (f.id === updatedField.id ? updatedField : f)),
      };
    });
    setSteps(updatedSteps);
  };

  const handleDeleteField = (fieldId: string) => {
    const updatedSteps = steps.map((s, sIdx) => {
      if (sIdx !== activeStepIndex) return s;
      return {
        ...s,
        fields: s.fields.filter((f) => f.id !== fieldId),
      };
    });
    setSteps(updatedSteps);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleMoveField = (fieldIndex: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
    if (targetIdx < 0 || targetIdx >= currentStep.fields.length) return;

    const fields = [...currentStep.fields];
    const temp = fields[fieldIndex];
    fields[fieldIndex] = fields[targetIdx];
    fields[targetIdx] = temp;

    const updatedSteps = [...steps];
    updatedSteps[activeStepIndex] = {
      ...currentStep,
      fields,
    };
    setSteps(updatedSteps);
  };

  // Step manipulation helpers
  const handleAddStep = () => {
    const newStep: FormStep = {
      id: `step_${Date.now()}_${steps.length + 1}`,
      title: `Step ${steps.length + 1}`,
      fields: [],
    };
    setSteps([...steps, newStep]);
    setActiveStepIndex(steps.length);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, idx) => idx !== index);
    setSteps(updated);
    setActiveStepIndex(Math.max(0, index - 1));
  };

  const handleUpdateStep = (index: number, patch: Partial<FormStep>) => {
    const updated = steps.map((s, idx) => (idx === index ? { ...s, ...patch } : s));
    setSteps(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E4E9E5] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#18231E]">{form.name}</h3>
            {form.publishedVersion ? (
              <span className="text-[10px] font-bold bg-[#E2F5E9] text-[#176B4D] px-2 py-0.5 rounded border border-[#C8E8D5]">
                Version {form.publishedVersion} Live
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                Draft (Unpublished)
              </span>
            )}
          </div>
          <p className="text-xs text-[#66736C] mt-0.5">
            Configure form steps, drag/reorder inputs, conditional rules, and submission handlers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#F0F4F1] p-0.5 rounded-lg text-xs mr-2">
            <button
              type="button"
              onClick={() => setActiveTab("fields")}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === "fields" ? "bg-white text-[#18231E] shadow-2xs" : "text-[#66736C]"
              }`}
            >
              Fields & Logic
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === "settings" ? "bg-white text-[#18231E] shadow-2xs" : "text-[#66736C]"
              }`}
            >
              Form Settings
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSaveDraft(steps, settings)}
            isLoading={isSaving}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Save Draft
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onPublishVersion}
            isLoading={isPublishing}
            leftIcon={<Send className="h-3.5 w-3.5" />}
          >
            Publish Live Version
          </Button>
        </div>
      </div>

      {activeTab === "fields" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Palette and Steps (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <FormStepManager
              steps={steps}
              activeStepIndex={activeStepIndex}
              onSelectStep={setActiveStepIndex}
              onAddStep={handleAddStep}
              onRemoveStep={handleRemoveStep}
              onUpdateStep={handleUpdateStep}
            />

            <FieldPalette onAddField={handleAddField} />

            {/* Current Step Fields List */}
            <div className="bg-white rounded-xl border border-[#E4E9E5] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0F4F1]">
                <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                  Fields in {currentStep.title} ({currentStep.fields.length})
                </h4>
                <span className="text-[10px] text-[#66736C]">Click to edit</span>
              </div>

              {currentStep.fields.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[#E4E9E5] rounded-lg bg-[#FAF9F6] text-xs text-[#66736C]">
                  No fields yet in this step. Choose from the palette above to add one.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {currentStep.fields.map((f, idx) => {
                    const isSelected = f.id === selectedFieldId;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFieldId(f.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#E2F5E9]/50 border-[#176B4D] shadow-2xs ring-1 ring-[#176B4D]"
                            : "bg-[#FAF9F6] border-[#E4E9E5] hover:border-[#CCD5CE]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-[#909D96] w-4">
                            {idx + 1}.
                          </span>
                          <span className="font-semibold text-[#18231E] truncate">{f.label}</span>
                          {f.validation?.required && (
                            <span className="text-[10px] text-[#C43D3D] font-bold">*</span>
                          )}
                          {f.conditions && f.conditions.length > 0 && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                              Logic
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveField(idx, "up");
                            }}
                            className="p-1 text-[#909D96] hover:text-[#18231E] disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === currentStep.fields.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveField(idx, "down");
                            }}
                            className="p-1 text-[#909D96] hover:text-[#18231E] disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(f.id);
                            }}
                            className="p-1 text-[#909D96] hover:text-[#C43D3D]"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Field Configuration (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedField ? (
              <FieldEditor
                key={selectedField.id}
                field={selectedField}
                allFields={allFields}
                onChange={handleUpdateField}
                onDelete={() => handleDeleteField(selectedField.id)}
              />
            ) : (
              <div className="p-12 text-center bg-white rounded-xl border border-[#E4E9E5] space-y-2">
                <Sparkles className="h-8 w-8 text-[#909D96] mx-auto" />
                <h4 className="text-sm font-bold text-[#18231E]">No Field Selected</h4>
                <p className="text-xs text-[#66736C]">
                  Select a field from the list or add one from the palette to edit labels, options,
                  and rules.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="bg-white rounded-xl border border-[#E4E9E5] p-6 space-y-6">
          <div className="border-b border-[#F0F4F1] pb-3">
            <h4 className="text-sm font-bold text-[#18231E]">Presentation & Submission Settings</h4>
            <p className="text-xs text-[#66736C] mt-0.5">
              Customize how this form behaves on storefront visitor pages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="font-semibold text-[#18231E] block mb-1">Presentation Mode</label>
              <select
                value={settings.presentationMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    presentationMode: e.target.value as FormPresentationMode,
                  })
                }
                className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-xs text-[#18231E] focus:outline-hidden"
              >
                <option value="embedded">Embedded within Landing Section</option>
                <option value="modal">Modal Trigger Popup</option>
                <option value="page">Dedicated Standalone Page</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#18231E] block mb-1">Layout Style</label>
              <select
                value={settings.layout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    layout: e.target.value as FormLayoutType,
                  })
                }
                className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-xs text-[#18231E] focus:outline-hidden"
              >
                <option value="two_column">Two Columns (Balanced)</option>
                <option value="single_column">Single Column (Focused)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#18231E] block mb-1">Submit Button Text</label>
              <input
                type="text"
                value={settings.submitButtonText}
                onChange={(e) => setSettings({ ...settings, submitButtonText: e.target.value })}
                className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-xs text-[#18231E] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-[#18231E] block mb-1">Post-Submission Action</label>
              <select
                value={settings.postSubmissionAction}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    postSubmissionAction: e.target.value as PostSubmissionAction,
                  })
                }
                className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-xs text-[#18231E] focus:outline-hidden"
              >
                <option value="message">Display In-Place Thank You Message</option>
                <option value="redirect">Redirect to Internal Path</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-[#18231E] block mb-1">Success Message</label>
              <textarea
                value={settings.successMessage}
                onChange={(e) => setSettings({ ...settings, successMessage: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-xs text-[#18231E] focus:outline-hidden"
              />
            </div>

            {settings.postSubmissionAction === "redirect" && (
              <div className="md:col-span-2">
                <label className="font-semibold text-[#18231E] block mb-1">
                  Internal Redirect Path
                </label>
                <input
                  type="text"
                  value={settings.redirectUrl || ""}
                  onChange={(e) => setSettings({ ...settings, redirectUrl: e.target.value })}
                  placeholder="/thank-you"
                  className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-xs text-[#18231E] focus:outline-hidden"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
