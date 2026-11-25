import React, { useState } from "react";
import { FormStep, FormField, FormSettings, FieldCondition } from "@/types/lead";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle, ArrowRight, ArrowLeft, Send } from "lucide-react";

interface LeadFormRendererProps {
  steps: FormStep[];
  settings: FormSettings;
  onSubmit: (data: Record<string, unknown>, honeypotValue?: string) => Promise<{
    success: boolean;
    message?: string;
    redirectUrl?: string;
    error?: string;
  }>;
  isSubmitting?: boolean;
}

function evaluateCondition(
  cond: FieldCondition,
  formData: Record<string, unknown>
): boolean {
  const rawVal = formData[cond.fieldId];
  const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
  const targetVal = (cond.value || "").trim();

  switch (cond.operator) {
    case "equals":
      return strVal.toLowerCase() === targetVal.toLowerCase();
    case "not_equals":
      return strVal.toLowerCase() !== targetVal.toLowerCase();
    case "contains":
      return strVal.toLowerCase().includes(targetVal.toLowerCase());
    case "is_empty":
      return strVal === "";
    case "is_not_empty":
      return strVal !== "";
    default:
      return true;
  }
}

function isFieldVisible(field: FormField, formData: Record<string, unknown>): boolean {
  if (!field.conditions || field.conditions.length === 0) return true;

  if (field.conditionLogic === "or") {
    return field.conditions.some((cond) => evaluateCondition(cond, formData));
  }
  return field.conditions.every((cond) => evaluateCondition(cond, formData));
}

export const LeadFormRenderer: React.FC<LeadFormRendererProps> = ({
  steps,
  settings,
  onSubmit,
  isSubmitting = false,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [honeypotTrap, setHoneypotTrap] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentStep = steps[currentStepIdx] || steps[0];
  const isLastStep = currentStepIdx === steps.length - 1;

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateStepFields = (step: FormStep): boolean => {
    const errors: Record<string, string> = {};
    const visibleFields = step.fields.filter((f) => isFieldVisible(f, formData));

    for (const field of visibleFields) {
      const val = formData[field.id];
      const strVal = val !== undefined && val !== null ? String(val).trim() : "";

      if (field.validation?.required && !strVal) {
        errors[field.id] = field.validation.customErrorMessage || `${field.label} is required.`;
      }

      if (strVal && field.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(strVal)) {
          errors[field.id] = "Please enter a valid email address.";
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateStepFields(currentStep)) return;
    setCurrentStepIdx((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleBack = () => {
    setCurrentStepIdx((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateStepFields(currentStep)) return;

    const res = await onSubmit(formData, honeypotTrap);
    if (res.success) {
      setSubmitSuccess(res.message || settings.successMessage);
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } else {
      setSubmitError(res.error || "An error occurred submitting the form.");
    }
  };

  if (submitSuccess) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#C8E8D5] shadow-xs space-y-3 animate-in fade-in">
        <div className="h-12 w-12 rounded-full bg-[#E2F5E9] text-[#176B4D] flex items-center justify-center mx-auto">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h4 className="text-base font-bold text-[#18231E]">Submission Received</h4>
        <p className="text-xs text-[#4F5D56] max-w-md mx-auto leading-relaxed">
          {submitSuccess}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Multi-step progression indicator if steps > 1 */}
      {steps.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#18231E]">
            <span>
              Step {currentStepIdx + 1} of {steps.length}: {currentStep.title}
            </span>
            <span className="text-[#66736C]">
              {Math.round(((currentStepIdx + 1) / steps.length) * 100)}% Completed
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#F0F4F1] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#176B4D] transition-all duration-300 rounded-full"
              style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
            />
          </div>
          {currentStep.description && (
            <p className="text-xs text-[#66736C]">{currentStep.description}</p>
          )}
        </div>
      )}

      {/* Honeypot field (hidden from legitimate users) */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="_website_url_trap">Website Address</label>
        <input
          type="text"
          id="_website_url_trap"
          name="_website_url_trap"
          value={honeypotTrap}
          onChange={(e) => setHoneypotTrap(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {submitError && (
        <div className="p-3.5 rounded-lg bg-[#FDEAEA] border border-[#F7BCBC] text-xs text-[#C43D3D] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Step Fields Grid */}
      <div
        className={
          settings.layout === "two_column"
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "space-y-4"
        }
      >
        {currentStep.fields.map((field) => {
          if (!isFieldVisible(field, formData)) return null;

          const error = fieldErrors[field.id];
          const isHalf = field.width === "half" && settings.layout === "two_column";
          const colSpanClass = isHalf ? "col-span-1" : "md:col-span-2";

          return (
            <div key={field.id} className={`${colSpanClass} space-y-1.5`}>
              <label className="text-xs font-semibold text-[#18231E] block">
                {field.label}
                {field.validation?.required && <span className="text-[#C43D3D] ml-0.5">*</span>}
              </label>

              {/* Input Types */}
              {field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number" || field.type === "date" ? (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D] transition-colors ${
                    error ? "border-[#C43D3D] bg-[#FDEAEA]/30" : "border-[#E4E9E5] bg-white"
                  }`}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D] transition-colors ${
                    error ? "border-[#C43D3D] bg-[#FDEAEA]/30" : "border-[#E4E9E5] bg-white"
                  }`}
                />
              ) : field.type === "select" ? (
                <select
                  value={(formData[field.id] as string) || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-xs text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D] bg-white ${
                    error ? "border-[#C43D3D]" : "border-[#E4E9E5]"
                  }`}
                >
                  <option value="">Select an option...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "radio" ? (
                <div className="space-y-2 pt-1">
                  {(field.options || []).map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-xs text-[#18231E] cursor-pointer">
                      <input
                        type="radio"
                        name={field.id}
                        value={opt.value}
                        checked={formData[field.id] === opt.value}
                        onChange={() => handleFieldChange(field.id, opt.value)}
                        className="text-[#176B4D] focus:ring-[#176B4D]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              ) : field.type === "checkbox" ? (
                <div className="space-y-2 pt-1">
                  {(field.options || []).map((opt) => {
                    const currentValues = (formData[field.id] as string[]) || [];
                    const isChecked = currentValues.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2 text-xs text-[#18231E] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFieldChange(field.id, [...currentValues, opt.value]);
                            } else {
                              handleFieldChange(
                                field.id,
                                currentValues.filter((v) => v !== opt.value)
                              );
                            }
                          }}
                          className="rounded text-[#176B4D] focus:ring-[#176B4D]"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {field.helpText && !error && (
                <p className="text-[11px] text-[#66736C]">{field.helpText}</p>
              )}
              {error && <p className="text-[11px] text-[#C43D3D]">{error}</p>}
            </div>
          );
        })}
      </div>

      {/* Navigation & Submit Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-[#F0F4F1]">
        {currentStepIdx > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
        ) : (
          <div />
        )}

        {isLastStep ? (
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Send className="h-4 w-4" />}
          >
            {settings.submitButtonText || "Submit Inquiry"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleNext}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Next Step
          </Button>
        )}
      </div>
    </form>
  );
};
