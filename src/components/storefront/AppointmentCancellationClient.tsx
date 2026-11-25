"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Store } from "@/types/store";
import { resolveColorTokens } from "@/constants/themes";

interface AppointmentCancellationClientProps {
  store: Store;
  token: string;
}

interface AppointmentDetails {
  confirmationNumber: string;
  serviceName: string;
  providerName?: string;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  status: string;
  timezone: string;
  cancellationDeadlineUtc: string;
  canCancel: boolean;
  cancellationPolicyText: string;
  storeName: string;
  storeSlug: string;
}

export function AppointmentCancellationClient({
  store,
  token,
}: AppointmentCancellationClientProps) {
  const themeId = store.themeId || "minimal-stone";
  const tokens = resolveColorTokens(themeId);
  const primaryColor = store.branding?.primaryColor || tokens.primary;

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cancellation form state
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    async function loadAppointment() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/public/appointments/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to find appointment for this token.");
        }
        setAppointment(data.appointment);
        if (data.appointment.status === "Cancelled") {
          setIsCancelled(true);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg);
      } finally {
        setIsLoading(false);
      }
    }
    loadAppointment();
  }, [token]);

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/public/appointments/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationToken: token,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel appointment.");
      }

      setIsCancelled(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCancelError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 font-sans"
      style={{ backgroundColor: tokens.background, color: tokens.text }}
    >
      <div
        className="max-w-lg w-full rounded-2xl border p-6 sm:p-8 space-y-6 shadow-xl"
        style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: tokens.border }}>
          <div>
            <h1 className="font-black text-xl" style={{ color: tokens.text }}>
              {store.name}
            </h1>
            <p className="text-xs" style={{ color: tokens.textMuted }}>
              Client Appointment Self-Service Portal
            </p>
          </div>
          <Link
            href={`/store/${store.slug}`}
            className="p-2 rounded-lg border hover:bg-stone-100/50 text-xs font-semibold flex items-center gap-1"
            style={{ borderColor: tokens.border, color: tokens.text }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Store</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-2 text-xs" style={{ color: tokens.textMuted }}>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" />
            <p>Verifying secure cancellation token...</p>
          </div>
        ) : loadError ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2 text-center">
            <XCircle className="h-8 w-8 mx-auto text-rose-500" />
            <p className="font-bold">{loadError}</p>
            <p className="text-[11px]">Please check your link or contact our office directly.</p>
          </div>
        ) : isCancelled ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-stone-700 bg-stone-100 border-stone-200">
                Appointment Cancelled
              </span>
              <h2 className="text-xl font-black mt-3" style={{ color: tokens.text }}>
                Time Slot Released
              </h2>
              <p className="text-xs mt-1" style={{ color: tokens.textMuted }}>
                Reference <strong>{appointment?.confirmationNumber}</strong> has been cancelled. No fees or penalties will be incurred.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href={`/store/${store.slug}`}
                className="w-full inline-block py-3 rounded-xl font-bold text-xs text-white shadow-md text-center"
                style={{ backgroundColor: primaryColor }}
              >
                Return to Practice Homepage & Re-book
              </Link>
            </div>
          </div>
        ) : appointment ? (
          <div className="space-y-6">
            <div className="text-left space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-emerald-800 bg-emerald-50 border-emerald-200">
                Status: {appointment.status}
              </span>
              <h2 className="text-lg font-bold pt-2" style={{ color: tokens.text }}>
                Manage Your Booking ({appointment.confirmationNumber})
              </h2>
              <p className="text-xs" style={{ color: tokens.textMuted }}>
                Review details below to proceed with your cancellation.
              </p>
            </div>

            {/* Appointment Details Box */}
            <div
              className="p-4 rounded-xl border text-xs space-y-2.5 text-left"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <div className="flex justify-between">
                <span style={{ color: tokens.textMuted }}>Consultation</span>
                <span className="font-semibold" style={{ color: tokens.text }}>{appointment.serviceName}</span>
              </div>
              {appointment.providerName && (
                <div className="flex justify-between">
                  <span style={{ color: tokens.textMuted }}>Practitioner</span>
                  <span className="font-semibold" style={{ color: tokens.text }}>{appointment.providerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: tokens.textMuted }}>Scheduled Time</span>
                <span className="font-bold text-emerald-700">
                  {new Date(appointment.startUtc).toLocaleDateString()} at {new Date(appointment.startUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({appointment.timezone})
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: tokens.textMuted }}>Duration</span>
                <span className="font-semibold" style={{ color: tokens.text }}>{appointment.durationMinutes} mins</span>
              </div>
            </div>

            {/* Policy Info */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 text-left">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Cancellation Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {appointment.cancellationPolicyText}
              </p>
              <p className="text-[11px] text-amber-800 font-semibold pt-1">
                Deadline to cancel: {new Date(appointment.cancellationDeadlineUtc).toLocaleString()} ({appointment.timezone})
              </p>
            </div>

            {appointment.canCancel ? (
              <form onSubmit={handleConfirmCancel} className="space-y-4">
                <div className="text-left text-xs space-y-1">
                  <label className="font-semibold block" style={{ color: tokens.text }}>
                    Reason for Cancellation (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Scheduling conflict or personal emergency"
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none text-xs"
                    style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                  />
                </div>

                {cancelError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {cancelError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Link
                    href={`/store/${store.slug}`}
                    className="flex-1 py-3 rounded-xl font-semibold text-xs border text-center hover:bg-stone-100/50"
                    style={{ borderColor: tokens.border, color: tokens.text }}
                  >
                    Keep Appointment
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-stone-100 border text-center text-xs space-y-2">
                <p className="font-bold text-stone-700">Online cancellation is no longer available.</p>
                <p className="text-[11px] text-stone-500">
                  The cancellation window for this booking has passed. Please contact our office directly if you require urgent assistance.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
