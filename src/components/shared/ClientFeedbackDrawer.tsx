"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Send,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StoreFeedback } from "@/types/feedback";
import { cn } from "@/utils/cn";

interface ClientFeedbackDrawerProps {
  token: string;
  clientName: string;
  storeName: string;
  initialFeedback: StoreFeedback[];
}

export function ClientFeedbackDrawer({
  token,
  clientName,
  storeName,
  initialFeedback,
}: ClientFeedbackDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackList, setFeedbackList] = useState<StoreFeedback[]>(initialFeedback);
  const [authorName, setAuthorName] = useState(clientName);
  const [message, setMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<"general" | "approval" | "changes_requested">("general");
  const [selectedAnchor, setSelectedAnchor] = useState<string>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const ANCHOR_OPTIONS = [
    { id: "general", label: "Whole Storefront (General)", type: "general" as const },
    { id: "section.hero", label: "Hero Banner", type: "section" as const },
    { id: "section.featured_products", label: "Featured Products Grid", type: "section" as const },
    { id: "section.about", label: "About Brand Section", type: "section" as const },
    { id: "section.newsletter", label: "Newsletter Signup", type: "section" as const },
    { id: "section.footer", label: "Footer & Legal", type: "section" as const },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const anchorItem = ANCHOR_OPTIONS.find((a) => a.id === selectedAnchor);

      // Submit feedback record
      const res = await fetch(`/api/preview/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim() || clientName,
          type: feedbackType,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit feedback.");
      }

      // Also record anchored collaboration comment
      try {
        await fetch(`/api/preview/${token}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorName: authorName.trim() || clientName,
            anchorType: anchorItem?.type || "general",
            anchorId: selectedAnchor,
            anchorLabel: anchorItem?.label || "General",
            message: message.trim(),
          }),
        });
      } catch {
        // Non-blocking for primary feedback
      }

      const data = await res.json();
      setFeedbackList((prev) => [data.feedback, ...prev]);
      setMessage("");
      setSubmitSuccess(
        feedbackType === "approval"
          ? "Thank you! Your proposal approval has been transmitted to the GridRetail team."
          : feedbackType === "changes_requested"
          ? "Thank you! Your requested changes have been sent to the account architects."
          : "Your comments have been posted."
      );
      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error submitting feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Toggle Pill */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-[#176B4D] text-white px-4 py-2.5 rounded-full font-semibold text-xs shadow-xl hover:bg-[#104D38] transition-all cursor-pointer border border-[#E2F5E9]/30 hover:scale-105"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Client Review & Approval</span>
          {feedbackList.length > 0 && (
            <span className="bg-white text-[#176B4D] px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {feedbackList.length}
            </span>
          )}
        </button>
      ) : (
        /* Expanded Drawer Container */
        <div className="bg-white w-[360px] sm:w-[420px] rounded-2xl shadow-2xl border border-[#CCD5CE] overflow-hidden flex flex-col text-xs animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-[#18231E] text-white p-3.5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Review & Approval Panel</h3>
              <p className="text-[10px] text-stone-400">
                Evaluating proposal for {storeName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Body: Form & Conversation Thread */}
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto bg-[#FAF9F6]">
            {submitSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-[11px] font-medium leading-relaxed">{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-[11px] font-medium leading-relaxed">{submitError}</span>
              </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="bg-white p-3.5 rounded-xl border border-[#E4E9E5] space-y-3 shadow-2xs">
              <div>
                <label className="font-semibold text-[#18231E] block mb-1">Reviewer Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your Name / Title"
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18231E] block mb-1">Feedback Action</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFeedbackType("general")}
                    className={cn(
                      "py-1 px-2 rounded-md font-medium text-[10px] border transition-colors cursor-pointer text-center",
                      feedbackType === "general"
                        ? "bg-[#18231E] text-white border-[#18231E]"
                        : "bg-white text-stone-600 border-[#CCD5CE] hover:bg-stone-50"
                    )}
                  >
                    Comment
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType("changes_requested")}
                    className={cn(
                      "py-1 px-2 rounded-md font-medium text-[10px] border transition-colors cursor-pointer text-center",
                      feedbackType === "changes_requested"
                        ? "bg-amber-700 text-white border-amber-700"
                        : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                    )}
                  >
                    Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackType("approval")}
                    className={cn(
                      "py-1 px-2 rounded-md font-medium text-[10px] border transition-colors cursor-pointer text-center",
                      feedbackType === "approval"
                        ? "bg-[#16804A] text-white border-[#16804A]"
                        : "bg-white text-[#16804A] border-emerald-300 hover:bg-emerald-50"
                    )}
                  >
                    Approve Store
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#18231E] block mb-1">Anchor Target (Optional)</label>
                <select
                  value={selectedAnchor}
                  onChange={(e) => setSelectedAnchor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs bg-white"
                >
                  {ANCHOR_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#18231E] block mb-1">
                  {feedbackType === "approval"
                    ? "Approval Sign-off Notes"
                    : feedbackType === "changes_requested"
                    ? "Requested Modifications Details"
                    : "Feedback Comments"}
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    feedbackType === "approval"
                      ? "e.g. Layout and branding look excellent. Approved for next steps."
                      : feedbackType === "changes_requested"
                      ? "e.g. Please update hero banner to darker tone and include 4 SKUs in catalog."
                      : "Share your thoughts or questions on this store design..."
                  }
                  className="w-full px-2.5 py-1.5 rounded-md border border-[#CCD5CE] focus:border-[#176B4D] focus:outline-hidden text-xs"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={isSubmitting}
                leftIcon={<Send className="h-3 w-3" />}
              >
                {feedbackType === "approval"
                  ? "Submit Formal Approval"
                  : feedbackType === "changes_requested"
                  ? "Submit Change Request"
                  : "Post Feedback"}
              </Button>
            </form>

            {/* Conversation / Feedback Stream */}
            <div className="space-y-2">
              <h4 className="font-semibold text-[#18231E] text-[11px]">Review Conversation</h4>
              {feedbackList.length === 0 ? (
                <p className="text-[#66736C] text-[10px] text-center py-4 bg-white rounded-lg border border-dashed border-[#CCD5CE]">
                  No feedback comments yet. Be the first to leave review notes.
                </p>
              ) : (
                <div className="space-y-2">
                  {feedbackList.map((item) => {
                    const isClient = item.authorType === "client";
                    const isApproval = item.type === "approval";
                    const isChanges = item.type === "changes_requested";

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-lg border text-[11px] space-y-1",
                          isApproval
                            ? "bg-emerald-50/70 border-emerald-300"
                            : isChanges
                            ? "bg-amber-50/70 border-amber-300"
                            : isClient
                            ? "bg-white border-[#E4E9E5]"
                            : "bg-[#F0F4F1] border-[#CCD5CE]"
                        )}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-[#18231E]">
                            {item.authorName}{" "}
                            <span className="font-normal text-[#66736C]">
                              ({isClient ? "Client Reviewer" : "GridRetail Architect"})
                            </span>
                          </span>
                          <span className="text-[#909D96]">
                            {new Date(item.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        {isApproval && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Proposal Approved</span>
                          </div>
                        )}

                        {isChanges && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" />
                            <span>Changes Requested</span>
                          </div>
                        )}

                        <p className="text-stone-800 whitespace-pre-wrap leading-relaxed mt-1">
                          {item.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
