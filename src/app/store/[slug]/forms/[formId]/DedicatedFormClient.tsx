"use client";

import React, { useState } from "react";
import { FormStep, FormSettings } from "@/types/lead";
import { LeadFormRenderer } from "@/components/forms/LeadFormRenderer";

interface DedicatedFormClientProps {
  slug: string;
  formId: string;
  steps: FormStep[];
  settings: FormSettings;
}

export const DedicatedFormClient: React.FC<DedicatedFormClientProps> = ({
  slug,
  formId,
  steps,
  settings,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    data: Record<string, unknown>,
    honeypotValue?: string
  ): Promise<{
    success: boolean;
    message?: string;
    redirectUrl?: string;
    error?: string;
  }> => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/stores/${slug}/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          _website_url_trap: honeypotValue,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error || "Submission failed." };
      }

      return {
        success: true,
        message: json.message,
        redirectUrl: json.redirectUrl,
      };
    } catch {
      return { success: false, error: "Network error submitting form." };
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LeadFormRenderer
      steps={steps}
      settings={settings}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
};
