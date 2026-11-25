"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  MapPin,
  Video,
  Phone,
  CheckCircle2,
  ArrowRight,
  CalendarCheck,
  Search,
  Calendar,
  AlertCircle,
  X,
  Loader2,
  Check,
  ShieldCheck,
  Star,
  Leaf,
  Cpu,
  Menu,
} from "lucide-react";
import { Store, StoreStylingTokens } from "@/types/store";
import { Template } from "@/types/template";
import { PreviewUpdatePayload } from "@/types";
import { SectionInstance } from "@/types/section";
import { AppointmentService, AppointmentProvider, AvailableSlot } from "@/types/appointment";
import { getThemeById } from "@/constants/themes";
import { getDesignTemplateById } from "@/constants/design-templates";
import { isAllowedPreviewOrigin, validatePreviewMessage } from "@/lib/security/preview-origin";
import { getSectionDefinition } from "@/constants/sections";
import { resolveStoreSections } from "@/lib/sections/resolver";
import { SectionRenderer } from "./sections/SectionRenderer";
import { HeroSections } from "./sections/HeroSections";
import { FooterSection } from "./sections/FooterSection";
import { ThemeAwareHeroGraphic } from "./ThemeAwareHeroGraphic";
import { formatINR } from "@/utils/currency";
import { cn } from "@/utils/cn";

interface AppointmentWebsiteViewProps {
  store: Store;
  services: AppointmentService[];
  providers: AppointmentProvider[];
  template?: Template | null;
  isPreview?: boolean;
}

export function AppointmentWebsiteView({
  store,
  services: initialServices,
  providers: initialProviders,
  template,
  isPreview = false,
}: AppointmentWebsiteViewProps) {
  // Theme & Design Template States (Independent Customization Systems)
  const [activeThemeId, setActiveThemeId] = useState<string>(
    store.themeId || store.templateId || template?.id || "theme_nordic_pine"
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    store.templateId || template?.id || "tmpl_modern_minimal"
  );

  const activeTheme = useMemo(() => getThemeById(activeThemeId), [activeThemeId]);
  const activeDesignTemplate = useMemo(() => getDesignTemplateById(activeTemplateId), [activeTemplateId]);

  const tokens = activeTheme.tokens;

  const [storeName, setStoreName] = useState(store.name);
  const [branding, setBranding] = useState(
    store.branding || {
      primaryColor: tokens.primary,
      secondaryColor: tokens.secondary,
      fontFamily: "Inter, sans-serif",
      heroHeadline: "Professional Advisory & Strategic Consultation",
      heroSubheadline:
        store.description ||
        "Schedule a focused, confidential appointment with our experienced practitioners.",
      aboutText: store.description || "",
      ctaText: "Book Consultation",
      logoUrl: "",
      bannerUrl: "",
    }
  );

  const primaryColor = branding.primaryColor || tokens.primary;

  const [sections, setSections] = useState<SectionInstance[]>(() =>
    resolveStoreSections(store)
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [styling, setStyling] = useState<StoreStylingTokens | undefined>(
    store.styling
  );
  const [enabledSections, setEnabledSections] = useState<string[]>(
    store.enabledSections || ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
  );
  const [orderedSections, setOrderedSections] = useState<string[]>(
    store.orderedSections || ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const buttonRadiusClass =
    styling?.buttonRadius === "sharp"
      ? "rounded-none"
      : styling?.buttonRadius === "pill"
      ? "rounded-full"
      : "rounded-xl";

  const effectiveCardVariation = styling?.cardVariation || styling?.cardStyle;
  const cardRadiusClass =
    effectiveCardVariation === "block_solid"
      ? "rounded-none border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      : effectiveCardVariation === "soft_rounded"
      ? "rounded-3xl border shadow-sm"
      : effectiveCardVariation === "floating"
      ? "rounded-2xl border shadow-2xl hover:-translate-y-1 transition-transform"
      : effectiveCardVariation === "flat"
      ? "rounded-xl border-0 shadow-none"
      : effectiveCardVariation === "bordered"
      ? "rounded-xl border shadow-none"
      : effectiveCardVariation === "elevated"
      ? "rounded-2xl border shadow-xl"
      : "rounded-2xl border shadow-xs";

  const cardClass = cardRadiusClass;

  const headerStickyClass =
    styling?.headerSticky !== false ? "sticky top-0 z-40" : "relative z-40";

  // Live postMessage Listener for Customizer
  useEffect(() => {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "GRIDRETAIL_PREVIEW_READY", slug: store.slug },
        "*"
      );
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedPreviewOrigin(event.origin)) return;
      if (window.parent && window.parent !== window && event.source !== window.parent) return;

      const validation = validatePreviewMessage(event.data);
      if (!validation.valid) return;

      if (validation.type === "GRIDRETAIL_SECTION_SELECT") {
        const secId = validation.sectionId || null;
        setSelectedSectionId(secId);
        if (secId) {
          const el = document.getElementById(`sec-wrapper-${secId}`) || document.querySelector(`[data-section-id="${secId}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      if (validation.type !== "GRIDRETAIL_PREVIEW_UPDATE" || !validation.payload) {
        return;
      }

      const payload: PreviewUpdatePayload = validation.payload;

        if (payload.name !== undefined) {
          setStoreName(payload.name);
        }

        if (payload.themeId) {
          setActiveThemeId(payload.themeId);
        }

        if (payload.templateId) {
          setActiveTemplateId(payload.templateId);
        }

        if (payload.branding) {
          setBranding((prev) => ({
            ...prev,
            ...payload.branding,
            primaryColor: payload.branding?.primaryColor || prev.primaryColor,
            secondaryColor: payload.branding?.secondaryColor || prev.secondaryColor,
            fontFamily: payload.branding?.fontFamily || prev.fontFamily,
            heroHeadline: payload.branding?.heroHeadline ?? prev.heroHeadline,
            heroSubheadline: payload.branding?.heroSubheadline ?? prev.heroSubheadline,
            aboutText: payload.branding?.aboutText ?? prev.aboutText,
            ctaText: payload.branding?.ctaText ?? prev.ctaText,
            logoUrl: payload.branding?.logoUrl ?? prev.logoUrl,
            bannerUrl: payload.branding?.bannerUrl ?? prev.bannerUrl,
          }));
        }

        if (payload.enabledSections) {
          setEnabledSections(payload.enabledSections);
        }

        if (payload.orderedSections && Array.isArray(payload.orderedSections)) {
          setOrderedSections(payload.orderedSections);
        }

        if (payload.sections && Array.isArray(payload.sections)) {
          setSections(payload.sections);
        } else if (payload.orderedSections || payload.enabledSections || payload.branding) {
          setSections((prev) =>
            resolveStoreSections({
              ...store,
              name: payload.name ?? storeName,
              branding: payload.branding ? { ...branding, ...payload.branding } : branding,
              enabledSections: payload.enabledSections ?? enabledSections,
              orderedSections: payload.orderedSections ?? orderedSections,
              sections: prev && prev.length > 0 ? prev : undefined,
            })
          );
        }

        if (payload.styling) {
          setStyling((prev) => ({ ...prev, ...payload.styling }));
        }

        if (event.source && typeof (event.source as Window).postMessage === "function") {
          (event.source as Window).postMessage(
            { type: "GRIDRETAIL_PREVIEW_ACK", timestamp: Date.now() },
            event.origin
          );
        }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [store, storeName, branding, enabledSections, orderedSections]);

  const [services] = useState<AppointmentService[]>(initialServices || []);
  const [providers] = useState<AppointmentProvider[]>(initialProviders || []);

  // Booking Flow State
  const [selectedService, setSelectedService] = useState<AppointmentService | null>(
    services.length > 0 ? services[0] : null
  );
  const [selectedProvider, setSelectedProvider] = useState<AppointmentProvider | null>(
    providers.length > 0 ? providers[0] : null
  );

  // Date selection (default to today + 1 day or today)
  const todayIso = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Slots fetching state
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Customer Contact Form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Confirmation modal state
  interface ConfirmedDetails {
    confirmationNumber: string;
    status: string;
    serviceName: string;
    providerName?: string;
    startUtc: string;
    endUtc: string;
    timezone: string;
    cancellationPath?: string;
    message?: string;
  }
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedDetails | null>(null);

  // My Appointments (Previously Booked) State
  interface PreviouslyBookedAppointment {
    id: string;
    confirmationNumber: string;
    serviceId?: string;
    serviceName: string;
    providerId?: string;
    providerName?: string;
    startUtc: string;
    endUtc: string;
    durationMinutes: number;
    price: number;
    currency: string;
    status: string;
    meetingType?: string;
    timezone: string;
    cancellationDeadlineUtc?: string;
    canCancel: boolean;
    cancelledAtUtc?: string;
    cancellationReason?: string;
    customerNotes?: string;
  }

  const [lookupEmail, setLookupEmail] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchingAppointments, setIsSearchingAppointments] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searchedAppointments, setSearchedAppointments] = useState<PreviouslyBookedAppointment[]>([]);
  const [appointmentTab, setAppointmentTab] = useState<"upcoming" | "past">("upcoming");
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<PreviouslyBookedAppointment | null>(null);

  // Cancellation Modal State
  const [cancelModalAppointment, setCancelModalAppointment] = useState<PreviouslyBookedAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);

  // Fetch slots whenever selectedService, selectedDate, or selectedProvider changes
  useEffect(() => {
    if (!selectedService || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    async function loadSlots() {
      setIsLoadingSlots(true);
      setSlotError(null);
      setSelectedSlot(null);

      try {
        const queryParams = new URLSearchParams({
          serviceId: selectedService!.id,
          date: selectedDate,
        });
        if (selectedProvider) {
          queryParams.set("providerId", selectedProvider.id);
        }

        const res = await fetch(`/api/public/stores/${store.slug}/availability?${queryParams.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load available times.");
        }

        const data = await res.json();
        if (isMounted) {
          setAvailableSlots(data.slots || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setSlotError(msg);
          setAvailableSlots([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedService, selectedDate, selectedProvider, store.slug]);

  // Handle booking submission
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      setBookingError("Please select a service and an available time slot.");
      return;
    }

    setIsSubmittingBooking(true);
    setBookingError(null);

    try {
      const payload = {
        serviceId: selectedService.id,
        providerId: selectedProvider?.id || selectedSlot.providerId,
        startUtc: selectedSlot.startUtc,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
      };

      const res = await fetch(`/api/public/stores/${store.slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule appointment.");
      }

      setConfirmedBooking({
        confirmationNumber: data.appointment.confirmationNumber,
        status: data.appointment.status,
        serviceName: data.appointment.serviceName,
        providerName: data.appointment.providerName,
        startUtc: data.appointment.startUtc,
        endUtc: data.appointment.endUtc,
        timezone: data.appointment.timezone,
        cancellationPath: data.cancellationPath,
        message: data.message,
      });

      const bookedCustomerEmail = customerEmail.trim();
      setLookupEmail(bookedCustomerEmail);

      // Clear slot & form fields
      setSelectedSlot(null);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBookingError(msg);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Customer Appointment Lookup Handler
  const handleLookupAppointments = async (emailOverride?: string) => {
    const emailToQuery = (emailOverride || lookupEmail).trim();
    if (!emailToQuery || !emailToQuery.includes("@") || !emailToQuery.includes(".")) {
      setLookupError("Please enter a valid email address to look up appointments.");
      return;
    }

    setIsSearchingAppointments(true);
    setLookupError(null);
    setCancelSuccessMessage(null);

    try {
      const res = await fetch(
        `/api/public/stores/${store.slug}/appointments?email=${encodeURIComponent(emailToQuery)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retrieve appointments.");
      }
      setSearchedAppointments(data.appointments || []);
      setHasSearched(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLookupError(msg);
      setSearchedAppointments([]);
    } finally {
      setIsSearchingAppointments(false);
    }
  };

  // Appointment Cancellation Handler
  const handleCancelAppointment = async () => {
    if (!cancelModalAppointment) return;

    setIsSubmittingCancel(true);
    try {
      const res = await fetch("/api/public/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: cancelModalAppointment.id,
          customerEmail: lookupEmail.trim(),
          reason: cancelReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel appointment.");
      }

      setSearchedAppointments((prev) =>
        prev.map((a) =>
          a.id === cancelModalAppointment.id
            ? {
                ...a,
                status: "Cancelled",
                canCancel: false,
                cancelledAtUtc: new Date().toISOString(),
                cancellationReason: cancelReason.trim() || "Cancelled by client",
              }
            : a
        )
      );

      setCancelSuccessMessage(
        "Your appointment has been successfully cancelled and the time slot released."
      );
      setCancelModalAppointment(null);
      setCancelReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Date and Time formatting with timezone
  const formatAppointmentDateTime = (startUtc: string, endUtc: string, tz: string) => {
    try {
      const start = new Date(startUtc);
      const end = new Date(endUtc);

      const dateStr = start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: tz || "Asia/Kolkata",
      });

      const startTimeStr = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: tz || "Asia/Kolkata",
      });

      const endTimeStr = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: tz || "Asia/Kolkata",
      });

      return `${dateStr} • ${startTimeStr} – ${endTimeStr} (${tz || "Asia/Kolkata"})`;
    } catch {
      return `${startUtc} – ${endUtc}`;
    }
  };

  const config = store.appointmentConfig;
  const timezone = config?.timezone || "Asia/Kolkata";
  const cancellationPolicyText = config?.cancellationPolicy?.policyText ||
    `Cancellations accepted up to ${config?.cancellationPolicy?.noticeHours || 24} hours prior.`;

  // Meeting icon helper
  const renderMeetingIcon = (type: string) => {
    switch (type) {
      case "in_person":
        return <MapPin className="h-3.5 w-3.5 text-emerald-600" />;
      case "video_call":
        return <Video className="h-3.5 w-3.5 text-blue-600" />;
      case "phone_call":
        return <Phone className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-stone-500" />;
    }
  };

  const getMeetingLabel = (type: string) => {
    switch (type) {
      case "in_person":
        return "In-Person Office";
      case "video_call":
        return "Video Consultation";
      case "phone_call":
        return "Phone Advisory";
      default:
        return "Consultation";
    }
  };

  // -------------------------------------------------------------
  // DISTINCT HEADER RENDERING PER DESIGN TEMPLATE
  // -------------------------------------------------------------
  const renderHeader = () => {
    const layout = activeDesignTemplate.headerLayout;

    // Header Variation 6: Appointment CTA
    if (styling?.headerVariation === "appointment_cta") {
      return (
        <header
          data-header-variation="appointment_cta"
          className={cn(headerStickyClass, "w-full border-b backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-xs")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={branding.logoUrl} alt={storeName} className="h-7 max-w-[120px] object-contain" />
              )}
              <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✦ Direct Booking
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#appointment-booking" className="hover:underline">Advisory Services</a>
              <a href="#about" className="hover:underline">Practitioner Desk</a>
              <a href="#faq" className="hover:underline">Session FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="#appointment-booking"
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Book Consultation</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 px-4 space-y-2 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#services-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Advisory Services</a>
              <a href="#practitioners-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practitioners</a>
              <a href="#booking-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Book Consultation</a>
              <a href="#my-appointments" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">My Appointments</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 7: Lead Inquiry
    if (styling?.headerVariation === "lead_inquiry") {
      return (
        <header
          data-header-variation="lead_inquiry"
          className={cn(headerStickyClass, "w-full border-b backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-xs")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={branding.logoUrl} alt={storeName} className="h-7 max-w-[120px] object-contain" />
              )}
              <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
              <span className="hidden sm:inline-block text-[10px] text-stone-500 font-mono">
                ⚡ Direct Consultation Scheduling
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#services-section" className="hover:underline">Services</a>
              <a href="#practitioners-section" className="hover:underline">Specialists</a>
              <a href="#my-appointments" className="hover:underline">My Appointments</a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="#booking-section"
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Book Consultation</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 px-4 space-y-2 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#services-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Services</a>
              <a href="#practitioners-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practitioners</a>
              <a href="#booking-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Book Consultation</a>
              <a href="#my-appointments" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">My Appointments</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 2: Corporate Multi-Tier
    if (styling?.headerVariation === "corporate") {
      return (
        <header
          data-header-variation="corporate"
          className={cn(headerStickyClass, "w-full border-b shadow-xs transition-colors")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="border-b py-1.5 px-4 sm:px-6 text-[11px] flex items-center justify-between" style={{ backgroundColor: tokens.background, borderColor: tokens.border, color: tokens.textMuted }}>
            <div className="flex items-center gap-4">
              <span>{storeName} — Practice Directory</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Operating Hours: Mon – Sat 09:00 - 18:00 IST</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Realtime Slot Availability
              </span>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={branding.logoUrl} alt={storeName} className="h-7 max-w-[120px] object-contain" />
              )}
              <span className="text-lg font-bold tracking-tight" style={{ color: tokens.text }}>{storeName}</span>
            </div>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#services-section" className="hover:underline">Services</a>
              <a href="#practitioners-section" className="hover:underline">Specialists</a>
              <a href="#booking-section" className="hover:underline">Schedule</a>
              <a href="#my-appointments" className="hover:underline">My Appointments</a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="#booking-section"
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Book Consultation</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t px-4 py-3 space-y-2 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#services-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Services</a>
              <a href="#practitioners-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Specialists</a>
              <a href="#booking-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Schedule Appointment</a>
              <a href="#my-appointments" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">My Appointments</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 3: Centered Logo
    if (styling?.headerVariation === "centered_logo") {
      return (
        <header
          data-header-variation="centered_logo"
          className={cn(headerStickyClass, "w-full border-b backdrop-blur-md py-4 px-4 sm:px-6 transition-colors")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <nav className="hidden md:flex items-center gap-5 text-xs font-serif uppercase tracking-widest" style={{ color: tokens.textMuted }}>
              <a href="#services-section" className="hover:underline">Services</a>
              <a href="#practitioners-section" className="hover:underline">Practitioners</a>
            </nav>
            <div className="text-center mx-auto">
              <span className="text-xl font-serif font-bold tracking-widest uppercase" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#booking-section"
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Book Consultation</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 px-4 space-y-2 text-xs font-serif uppercase tracking-widest" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#services-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Services</a>
              <a href="#practitioners-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practitioners</a>
              <a href="#booking-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Book Consultation</a>
              <a href="#my-appointments" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">My Appointments</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 4: Transparent Glass
    if (styling?.headerVariation === "transparent") {
      return (
        <header
          data-header-variation="transparent"
          className={cn(styling?.headerSticky !== false ? "sticky top-3" : "relative", "z-30 px-4 sm:px-6 max-w-5xl mx-auto w-full mb-3")}
        >
          <div
            className="backdrop-blur-md rounded-2xl border px-6 py-3 flex items-center justify-between shadow-xs"
            style={{ backgroundColor: `${tokens.surface}B3`, borderColor: tokens.border }}
          >
            <span className="text-base font-bold tracking-tight" style={{ color: tokens.text }}>{storeName}</span>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#services-section" className="hover:underline">Services</a>
              <a href="#practitioners-section" className="hover:underline">Practitioners</a>
              <a href="#my-appointments" className="hover:underline">My Appointments</a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="#booking-section"
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Book Consultation</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden rounded-2xl border mt-2 p-3 space-y-2 text-xs font-medium backdrop-blur-md" style={{ backgroundColor: `${tokens.surface}FA`, borderColor: tokens.border }}>
              <a href="#services-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Services</a>
              <a href="#practitioners-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practitioners</a>
              <a href="#booking-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Book Consultation</a>
              <a href="#my-appointments" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">My Appointments</a>
            </div>
          )}
        </header>
      );
    }

    // Header Variation 5: Commerce Cart Header (Fallback for appointments)
    if (styling?.headerVariation === "commerce_cart") {
      return (
        <header
          data-header-variation="commerce_cart"
          className={cn(headerStickyClass, "w-full border-b backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-xs")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={branding.logoUrl} alt={storeName} className="h-7 max-w-[120px] object-contain" />
              )}
              <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#services-section" className="hover:underline">Services</a>
              <a href="#practitioners-section" className="hover:underline">Practitioners</a>
              <a href="#my-appointments" className="hover:underline">My Appointments</a>
            </nav>
            <div className="flex items-center gap-3">
              <a
                href="#booking-section"
                className={cn("px-4 py-2 text-xs font-semibold text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <span>Book Consultation</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="md:hidden p-2 rounded-lg border text-stone-600 dark:text-stone-300"
                style={{ borderColor: tokens.border }}
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isMobileMenuOpen && (
            <div className="md:hidden border-t mt-3 pt-3 px-4 space-y-2 text-xs font-medium" style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <a href="#services-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Services</a>
              <a href="#practitioners-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Practitioners</a>
              <a href="#booking-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">Book Consultation</a>
              <a href="#my-appointments" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">My Appointments</a>
            </div>
          )}
        </header>
      );
    }

    // Header 1: Floating Minimal (Modern Minimal)
    if (styling?.headerVariation === "minimal" || (!styling?.headerVariation && layout === "floating-minimal")) {
      return (
        <header
          data-header-variation="minimal"
          className={cn(styling?.headerSticky !== false ? "sticky top-4" : "relative", "z-30 px-4 sm:px-6 max-w-6xl mx-auto w-full mb-2")}
        >
          <div
            className="backdrop-blur-md rounded-full border px-5 py-3 flex items-center justify-between shadow-sm transition-all"
            style={{
              backgroundColor: `${tokens.surface}E6`,
              borderColor: tokens.border,
            }}
          >
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                {branding.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-7 sm:h-8 max-w-[120px] sm:max-w-[150px] object-contain shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {storeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-base sm:text-lg font-bold tracking-tight" style={{ color: primaryColor }}>
                  {storeName}
                </span>
              </div>
              <nav className="hidden md:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
                <a href="#services-section" className="hover:opacity-100 transition-opacity">
                  Services
                </a>
                {providers.length > 0 && (
                  <a href="#practitioners-section" className="hover:opacity-100 transition-opacity">
                    Practitioners
                  </a>
                )}
                <a href="#my-appointments" className="hover:opacity-100 transition-opacity">
                  My Appointments
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="#booking-section"
                className="min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-transform active:scale-98"
                style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{branding.ctaText || "Book Consultation"}</span>
              </a>
            </div>
          </div>
        </header>
      );
    }

    // Header 2: Centered Luxury (Luxury Editorial)
    if (layout === "centered-luxury") {
      return (
        <header
          data-header-variation="centered_luxury"
          className={cn(headerStickyClass, "border-b backdrop-blur-md py-3.5 sm:py-4 px-4 sm:px-6 transition-colors")}
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-6xl mx-auto flex flex-col items-center justify-center space-y-2.5 text-center">
            {/* Atelier Eyebrow */}
            <span className="text-[10px] tracking-[0.25em] uppercase font-serif" style={{ color: tokens.accent }}>
              ✦ PRIVATE PRACTICE ATELIER ✦
            </span>

            {/* Desktop View (lg: 1024px and up): Classic 3-column balanced editorial layout */}
            <div className="hidden lg:grid lg:grid-cols-3 items-center w-full">
              {/* Left Column: Navigation */}
              <nav className="flex items-center gap-6 text-xs uppercase tracking-widest font-serif justify-start" style={{ color: tokens.textMuted }}>
                <a href="#services-section" className="hover:underline">
                  Consultations
                </a>
                {providers.length > 0 && (
                  <a href="#practitioners-section" className="hover:underline">
                    Specialists
                  </a>
                )}
              </nav>

              {/* Center Column: Prestigious Brand Name */}
              <div className="flex items-center justify-center gap-3">
                {branding.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-9 max-w-[160px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <h1 className="text-xl xl:text-2xl font-serif tracking-widest uppercase font-bold whitespace-nowrap" style={{ color: primaryColor }}>
                  {storeName}
                </h1>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-3 justify-end">
                <a
                  href="#my-appointments"
                  className="inline-flex items-center px-3.5 py-2 text-xs uppercase font-serif tracking-wider border transition-all whitespace-nowrap"
                  style={{ borderColor: tokens.border, color: tokens.text }}
                >
                  Client Archive
                </a>
                <a
                  href="#booking-section"
                  className="min-h-[40px] px-4 py-2 text-xs uppercase font-serif tracking-wider border transition-all shadow-xs inline-flex items-center justify-center whitespace-nowrap font-semibold"
                  style={{ borderColor: tokens.accent, backgroundColor: primaryColor, color: "#FFFFFF" }}
                >
                  {branding.ctaText || "Reserve"}
                </a>
              </div>
            </div>

            {/* Tablet View (md to lg: 768px - 1023px): Dedicated balanced 2-tier layout */}
            <div className="hidden md:flex lg:hidden flex-col items-center w-full space-y-2.5">
              {/* Brand Centerpiece: Full width, prominent, zero line-wrap */}
              <div className="flex items-center justify-center gap-3">
                {branding.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-8 max-w-[140px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <h1 className="text-xl font-serif tracking-widest uppercase font-bold whitespace-nowrap" style={{ color: primaryColor }}>
                  {storeName}
                </h1>
              </div>

              {/* Tablet Action & Utility Bar: Wide spacing, single-line readable buttons */}
              <div className="flex items-center justify-between w-full pt-2 border-t" style={{ borderColor: `${tokens.border}80` }}>
                <nav className="flex items-center gap-6 text-xs uppercase tracking-widest font-serif" style={{ color: tokens.textMuted }}>
                  <a href="#services-section" className="hover:underline">
                    Consultations
                  </a>
                  {providers.length > 0 && (
                    <a href="#practitioners-section" className="hover:underline">
                      Specialists
                    </a>
                  )}
                </nav>
                <div className="flex items-center gap-3">
                  <a
                    href="#my-appointments"
                    className="inline-flex items-center px-3 py-1.5 text-xs uppercase font-serif tracking-wider border transition-all whitespace-nowrap"
                    style={{ borderColor: tokens.border, color: tokens.text }}
                  >
                    Client Archive
                  </a>
                  <a
                    href="#booking-section"
                    className="min-h-[38px] px-4 py-1.5 text-xs uppercase font-serif tracking-wider border transition-all shadow-xs inline-flex items-center justify-center whitespace-nowrap font-semibold"
                    style={{ borderColor: tokens.accent, backgroundColor: primaryColor, color: "#FFFFFF" }}
                  >
                    {branding.ctaText || "Reserve"}
                  </a>
                </div>
              </div>
            </div>

            {/* Mobile View (< md: < 768px): Compact mobile bar with dropdown menu */}
            <div className="flex md:hidden items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0">
                {branding.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-7 max-w-[100px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <h1 className="text-base font-serif tracking-wider uppercase font-bold truncate max-w-[170px]" style={{ color: primaryColor }}>
                  {storeName}
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="#booking-section"
                  className="px-3 py-1.5 text-[11px] uppercase font-serif tracking-wider border shadow-xs inline-flex items-center whitespace-nowrap"
                  style={{ borderColor: tokens.accent, backgroundColor: primaryColor, color: "#FFFFFF" }}
                >
                  {branding.ctaText || "Reserve"}
                </a>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle navigation menu"
                  className="p-1.5 border text-xs"
                  style={{ borderColor: tokens.border, color: tokens.text }}
                >
                  {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
              <div className="md:hidden w-full border-t mt-2 pt-2 space-y-2 text-xs font-serif uppercase tracking-widest text-left" style={{ borderColor: tokens.border }}>
                <a href="#services-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">
                  Consultations
                </a>
                {providers.length > 0 && (
                  <a href="#practitioners-section" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">
                    Specialists
                  </a>
                )}
                <a href="#my-appointments" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:underline">
                  Client Archive
                </a>
              </div>
            )}
          </div>
        </header>
      );
    }

    // Header 3: Bold Announcement (Bold & Vibrant)
    if (layout === "bold-announcement") {
      return (
        <header className={cn(headerStickyClass, "w-full")}>
          {/* Animated Ticker Ribbon */}
          <div
            className="py-1.5 px-4 text-center text-[11px] font-black tracking-wider uppercase flex items-center justify-center gap-3 border-b-2"
            style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: "#000000" }}
          >
            <span>⚡ CONFIDENTIAL ADVISORY</span>
            <span>•</span>
            <span>DIRECT SCHEDULING</span>
            <span>•</span>
            <span>PRACTICE SPECIALISTS</span>
          </div>
          <div
            className="border-b-2 px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_0_0_#000000]"
            style={{ backgroundColor: tokens.surface, borderColor: "#000000" }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {branding.logoUrl && (
                <div className="border-2 border-black bg-white p-1 shadow-[2px_2px_0_0_#000000] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-7 sm:h-8 max-w-[110px] sm:max-w-[140px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                </div>
              )}
              <span className="text-xl sm:text-2xl font-black tracking-tighter uppercase" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#my-appointments"
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black bg-white hover:bg-stone-100 transition-colors"
                style={{ color: tokens.text }}
              >
                My Bookings
              </a>
              <a
                href="#booking-section"
                className="min-h-[44px] px-5 py-2 text-xs font-black uppercase tracking-wider border-2 shadow-[2px_2px_0_0_#000000] cursor-pointer inline-flex items-center gap-2"
                style={{ backgroundColor: tokens.accent, color: "#FFFFFF", borderColor: "#000000" }}
              >
                <span>{branding.ctaText || "Book Consultation"}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </header>
      );
    }

    // Header 4: Multi-tier Utility (Classic Commerce)
    if (layout === "multi-tier-utility") {
      return (
        <header className={cn(headerStickyClass, "w-full border-b shadow-xs")} style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
          {/* Top Utility Bar */}
          <div className="border-b py-1.5 px-4 sm:px-6 text-[11px] flex items-center justify-between" style={{ backgroundColor: tokens.background, borderColor: tokens.border, color: tokens.textMuted }}>
            <div className="flex items-center gap-4">
              <span>{storeName} — Practice Directory</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Operating Hours: Mon – Sat 09:00 - 18:00 IST</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Realtime Slot Availability
              </span>
            </div>
          </div>
          {/* Main Bar */}
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              {branding.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoUrl}
                  alt={storeName}
                  className="h-8 sm:h-9 max-w-[130px] sm:max-w-[160px] object-contain"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              ) : (
                <div
                  className={cn("w-8 h-8 flex items-center justify-center font-bold text-white text-xs shadow-xs", buttonRadiusClass)}
                  style={{ backgroundColor: primaryColor }}
                >
                  {storeName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-xl font-bold tracking-tight block" style={{ color: primaryColor }}>
                  {storeName}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  {store.appointmentIndustry || "Professional Practice"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#my-appointments"
                className={cn("px-3 py-2 text-xs font-semibold border flex items-center gap-1.5", buttonRadiusClass)}
                style={{ borderColor: tokens.border, color: tokens.text }}
              >
                <Clock className="h-3.5 w-3.5 text-stone-500" />
                <span>My Appointments</span>
              </a>
              <a
                href="#booking-section"
                className={cn("min-h-[40px] px-4 py-2 text-xs font-semibold flex items-center gap-2 text-white shadow-xs", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                <CalendarCheck className="h-4 w-4" />
                <span>{branding.ctaText || "Book Consultation"}</span>
              </a>
            </div>
          </div>
          {/* Sub Navigation Bar */}
          <div className="border-t px-4 sm:px-6 py-2 overflow-x-auto flex items-center gap-6 text-xs font-semibold" style={{ borderColor: tokens.border, color: tokens.textMuted }}>
            <a href="#services-section" className="hover:underline cursor-pointer" style={{ color: primaryColor }}>
              Consultation Services
            </a>
            {providers.length > 0 && (
              <a href="#practitioners-section" className="hover:underline cursor-pointer">
                Practitioners
              </a>
            )}
            <a href="#booking-section" className="hover:underline cursor-pointer">
              Schedule Appointment
            </a>
            <a href="#my-appointments" className="hover:underline cursor-pointer">
              Appointment Portal
            </a>
          </div>
        </header>
      );
    }

    // Header 5: Magazine Headline (Editorial Magazine)
    if (layout === "magazine-headline") {
      return (
        <header className={cn(headerStickyClass, "border-b backdrop-blur-md px-4 sm:px-6 py-3")} style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
          <div className="max-w-6xl mx-auto">
            <div className="border-b pb-1 mb-2 flex items-center justify-between text-[10px] tracking-widest uppercase font-serif" style={{ borderColor: tokens.border, color: tokens.textMuted }}>
              <span>THE PRACTICE CHRONICLE</span>
              <span>CONSULTATION DISPATCH • NO. 42</span>
              <span>SPECIALIST DIRECTORY</span>
            </div>
            <div className="flex items-center justify-between py-1 gap-4">
              <div className="flex items-center gap-3">
                {branding.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-8 sm:h-10 max-w-[140px] sm:max-w-[180px] object-contain shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                )}
                <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight" style={{ color: tokens.text }}>
                  {storeName}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="#my-appointments"
                  className="px-3 py-1.5 border text-xs font-serif tracking-wider uppercase hover:underline shrink-0"
                  style={{ borderColor: tokens.border, color: tokens.text }}
                >
                  Client Portal
                </a>
                <a
                  href="#booking-section"
                  className="px-4 py-1.5 border text-xs font-serif tracking-wider uppercase hover:underline shrink-0 cursor-pointer text-white shadow-xs"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                >
                  {branding.ctaText || "Dispatch Briefing"}
                </a>
              </div>
            </div>
          </div>
        </header>
      );
    }

    // Header 6: Organic Soft (Organic & Natural)
    if (layout === "organic-soft") {
      return (
        <header className={cn(styling?.headerSticky !== false ? "sticky top-3" : "relative", "z-30 px-4 sm:px-6 max-w-5xl mx-auto w-full mb-3")}>
          <div
            className="backdrop-blur-md rounded-2xl border px-6 py-3 flex items-center justify-between shadow-xs"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="flex items-center gap-2.5">
              {branding.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoUrl}
                  alt={storeName}
                  className="h-7 sm:h-8 max-w-[120px] sm:max-w-[140px] rounded-lg object-contain shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              ) : (
                <Leaf className="h-4 w-4 shrink-0" style={{ color: tokens.accent }} />
              )}
              <span className="text-lg font-semibold tracking-tight" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <nav className="hidden sm:flex items-center gap-5 text-xs font-medium" style={{ color: tokens.textMuted }}>
              <a href="#services-section" className="cursor-pointer hover:opacity-80">Practice Areas</a>
              {providers.length > 0 && (
                <a href="#practitioners-section" className="cursor-pointer hover:opacity-80">Practitioners</a>
              )}
              <a href="#my-appointments" className="cursor-pointer hover:opacity-80">My Appointments</a>
            </nav>
            <a
              href="#booking-section"
              className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 text-white cursor-pointer shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>{branding.ctaText || "Book Session"}</span>
            </a>
          </div>
        </header>
      );
    }

    // Header 7: Technical HUD (Tech & Futuristic)
    if (layout === "technical-hud") {
      return (
        <header className={cn(headerStickyClass, "border-b backdrop-blur-md px-4 sm:px-6 py-3 font-mono")} style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYS_ONLINE</span>
              </div>
              {branding.logoUrl && (
                <div className="border border-emerald-500/30 bg-black/40 p-1 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={branding.logoUrl}
                    alt={storeName}
                    className="h-6 sm:h-7 max-w-[100px] sm:max-w-[130px] object-contain"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                  />
                </div>
              )}
              <span className="text-lg font-black tracking-widest uppercase" style={{ color: primaryColor }}>
                {storeName}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: tokens.textMuted }}>
              <span>LATENCY: 14ms</span>
              <span>{"//"}</span>
              <span>SLOTS: REALTIME_SYNC</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#my-appointments"
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border hover:bg-white/10 transition-colors"
                style={{ borderColor: tokens.border, color: tokens.badgeText }}
              >
                CLIENT_PORTAL
              </a>
              <a
                href="#booking-section"
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider border rounded-none flex items-center gap-2 cursor-pointer shadow-xs"
                style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>SCHEDULE_SLOT [ACTIVE]</span>
              </a>
            </div>
          </div>
        </header>
      );
    }

    // Header 8: Playful Banner (Playful & Creative)
    return (
      <header
        className={cn(headerStickyClass, "border-b-2 px-4 sm:px-6 py-3.5")}
        style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={branding.logoUrl}
                alt={storeName}
                className="h-8 sm:h-9 max-w-[120px] sm:max-w-[140px] object-contain transform -rotate-2 hover:rotate-0 transition-transform shrink-0"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
            )}
            <span className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: primaryColor }}>
              {storeName}
            </span>
            <span
              className="hidden sm:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full transform -rotate-3 text-white shadow-xs"
              style={{ backgroundColor: tokens.accent }}
            >
              APPOINTMENTS OPEN ✨
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#my-appointments"
              className="hidden sm:inline-block px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border-2 border-black bg-white hover:bg-stone-100 transition-all"
              style={{ color: tokens.text }}
            >
              My Bookings
            </a>
            <a
              href="#booking-section"
              className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-md transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              {branding.ctaText || "Book It! ✨"}
            </a>
          </div>
        </div>
      </header>
    );
  };

  // -------------------------------------------------------------
  // DISTINCT HERO RENDERING PER DESIGN TEMPLATE
  // -------------------------------------------------------------
  const renderHero = () => {
    if (styling?.heroVariation) {
      return (
        <HeroSections
          key="hero"
          instance={{
            id: "hero_appointment",
            type: "hero_full_width",
            order: 0,
            visible: true,
            layoutVariant: styling.heroVariation,
            settings: {
              headline: branding.heroHeadline,
              subheadline: branding.heroSubheadline,
              bannerUrl: branding.bannerUrl,
              ctaText: branding.ctaText || "Book Consultation",
              ctaUrl: "#booking-section",
            },
          }}
          tokens={tokens}
          styling={styling}
          primaryColor={primaryColor}
          activeDesignTemplate={activeDesignTemplate}
          branding={branding}
        />
      );
    }

    const layout = activeDesignTemplate.heroLayout;
    const heroHeadline = branding.heroHeadline || "Professional Advisory & Strategic Consultation";
    const heroSubheadline =
      branding.heroSubheadline ||
      branding.aboutText ||
      store.description ||
      "Schedule a focused, confidential appointment with our experienced practitioners. Select your service, choose an available time slot, and receive instant confirmation.";
    const ctaText = branding.ctaText || "Book Consultation";
    const bannerUrl = branding.bannerUrl || "";

    // Hero 1: Split Showcase (Modern Minimal)
    if (layout === "split-showcase") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
        >
          <div className="space-y-5 text-left">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}
            >
              {store.appointmentIndustry || "Professional Practice"} • {activeDesignTemplate.name}
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight" style={{ color: tokens.text }}>
              {heroHeadline}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.textMuted }}>
              {heroSubheadline}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="#booking-section"
                className="px-6 py-3 rounded-full text-sm font-semibold text-white shadow-md hover:opacity-90 flex items-center gap-2 cursor-pointer transition-transform active:scale-98"
                style={{ backgroundColor: primaryColor }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#services-section"
                className="px-5 py-3 rounded-full text-xs font-semibold border hover:bg-stone-100/50 transition-colors"
                style={{ borderColor: tokens.border, color: tokens.text }}
              >
                Explore Services
              </a>
            </div>
          </div>
          {bannerUrl ? (
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3] border" style={{ borderColor: tokens.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt={storeName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
            </div>
          ) : (
            <ThemeAwareHeroGraphic
              tokens={tokens}
              primaryColor={primaryColor}
              industry={store.appointmentIndustry || store.industry}
              storeName={storeName}
              type="appointments"
              aspectRatio="aspect-[4/3]"
              className="rounded-2xl shadow-inner"
            />
          )}
        </section>
      );
    }

    // Hero 2: Cinematic Framed (Luxury Editorial)
    if (layout === "cinematic-framed") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="pt-10 sm:pt-14 pb-8 sm:pb-10 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6"
        >
          <div className="inline-flex items-center gap-3">
            <span className="h-px w-12" style={{ backgroundColor: tokens.accent }} />
            <span className="text-xs uppercase tracking-[0.3em] font-serif" style={{ color: tokens.accent }}>
              ✦ PRACTICE DIRECTORY &amp; STRATEGIC ADVISORY ✦
            </span>
            <span className="h-px w-12" style={{ backgroundColor: tokens.accent }} />
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-light tracking-wide max-w-3xl mx-auto" style={{ color: tokens.text }}>
            {heroHeadline}
          </h1>
          <p className="text-sm sm:text-base font-serif italic max-w-xl mx-auto opacity-80 leading-relaxed" style={{ color: tokens.textMuted }}>
            {heroSubheadline}
          </p>
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#booking-section"
              className="px-8 py-3 text-xs uppercase tracking-[0.2em] font-serif border hover:bg-white/10 transition-all cursor-pointer text-white shadow-md"
              style={{ borderColor: tokens.accent, backgroundColor: primaryColor }}
            >
              {ctaText}
            </a>
            <a
              href="#services-section"
              className="px-6 py-3 text-xs uppercase tracking-[0.2em] font-serif border hover:bg-white/5 transition-all"
              style={{ borderColor: tokens.border, color: tokens.text }}
            >
              Practice Directory
            </a>
          </div>
          {bannerUrl ? (
            <div
              className="relative rounded-xl overflow-hidden border shadow-xl max-w-4xl mx-auto aspect-[16/7] sm:aspect-[21/9] mt-8 group"
              style={{ borderColor: tokens.accent }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt={storeName}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto mt-6">
              <ThemeAwareHeroGraphic
                tokens={tokens}
                primaryColor={primaryColor}
                industry={store.appointmentIndustry || store.industry}
                storeName={storeName}
                type="appointments"
                aspectRatio="aspect-[16/7] sm:aspect-[21/9]"
                className="rounded-xl border shadow-xl"
              />
            </div>
          )}
        </section>
      );
    }

    // Hero 3: High-Impact Blocks (Bold & Vibrant)
    if (layout === "high-impact-blocks") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto"
        >
          <div
            className="p-8 sm:p-12 border-3 rounded-none shadow-[8px_8px_0_0_#000000] space-y-5"
            style={{ backgroundColor: tokens.cardBg, borderColor: "#000000" }}
          >
            <span
              className="inline-block px-3 py-1 font-black text-xs uppercase tracking-wider border-2 shadow-[2px_2px_0_0_#000000]"
              style={{ backgroundColor: tokens.accent, color: "#FFFFFF", borderColor: "#000000" }}
            >
              ⚡ DIRECT CONSULTATION ACCESS • INSTANT CONFIRMATION
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight" style={{ color: tokens.text }}>
              {heroHeadline}
            </h1>
            <p className="text-sm sm:text-lg font-bold max-w-2xl" style={{ color: tokens.textMuted }}>
              {heroSubheadline}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#booking-section"
                className="px-8 py-3.5 text-sm font-black uppercase tracking-wider border-2 shadow-[4px_4px_0_0_#000000] cursor-pointer inline-flex items-center gap-2"
                style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: "#000000" }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#services-section"
                className="px-6 py-3.5 text-xs font-black uppercase tracking-wider border-2 border-black bg-white hover:bg-stone-100 shadow-[2px_2px_0_0_#000000]"
                style={{ color: tokens.text }}
              >
                View Services
              </a>
            </div>
            {bannerUrl && (
              <div className="border-3 border-black shadow-[4px_4px_0_0_#000000] overflow-hidden aspect-[16/8] sm:aspect-[21/9] max-h-[360px] w-full mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        </section>
      );
    }

    // Hero 4: Commercial Banner (Classic Commerce)
    if (layout === "commercial-banner") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-10 sm:py-14 px-4 sm:px-6 max-w-6xl mx-auto"
        >
          <div
            className="rounded-xl border p-6 sm:p-10 flex flex-col gap-6 shadow-sm"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-4 max-w-xl text-left">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.accent }}>
                  {store.appointmentIndustry || "Professional Practice"} Consultation
                </span>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ color: tokens.text }}>
                  {heroHeadline}
                </h1>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
                  {heroSubheadline}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href="#booking-section"
                    className="px-6 py-2.5 rounded-md text-xs font-bold text-white shadow-xs inline-flex items-center gap-1.5"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <CalendarCheck className="h-4 w-4" />
                    <span>{ctaText}</span>
                  </a>
                  <a
                    href="#services-section"
                    className="px-5 py-2.5 rounded-md text-xs font-semibold border hover:bg-stone-100/50"
                    style={{ borderColor: tokens.border, color: tokens.text }}
                  >
                    View Services
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
                <div className="p-4 rounded-lg border text-center" style={{ backgroundColor: tokens.background, borderColor: tokens.border }}>
                  <Star className="h-5 w-5 mx-auto mb-1 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold block" style={{ color: tokens.text }}>4.9 / 5 Rating</span>
                  <span className="text-[10px]" style={{ color: tokens.textMuted }}>Client Consultations</span>
                </div>
                <div className="p-4 rounded-lg border text-center" style={{ backgroundColor: tokens.background, borderColor: tokens.border }}>
                  <Clock className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                  <span className="text-xs font-bold block" style={{ color: tokens.text }}>Instant Lock</span>
                  <span className="text-[10px]" style={{ color: tokens.textMuted }}>Direct Calendar Sync</span>
                </div>
              </div>
            </div>
            {bannerUrl && (
              <div className="w-full rounded-lg overflow-hidden border shadow-xs aspect-[16/7] sm:aspect-[21/8] max-h-[340px]" style={{ borderColor: tokens.border }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        </section>
      );
    }

    // Hero 5: Magazine Story (Editorial Magazine)
    if (layout === "magazine-story") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto border-b"
          style={{ borderColor: tokens.border }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8 space-y-4">
              <span className="text-xs font-serif uppercase tracking-widest" style={{ color: tokens.accent }}>
                Advisory Perspective • Practice Report
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-black leading-tight tracking-tight" style={{ color: tokens.text }}>
                {heroHeadline}
              </h1>
              <p className="text-base sm:text-lg font-serif opacity-80 leading-relaxed" style={{ color: tokens.textMuted }}>
                {heroSubheadline}
              </p>
            </div>
            <div className="md:col-span-4 border-l pl-6 space-y-4" style={{ borderColor: tokens.border }}>
              <span className="text-xs font-serif uppercase tracking-wider font-bold block" style={{ color: tokens.text }}>
                Senior Advisory Principle
              </span>
              <p className="text-xs font-serif leading-relaxed italic" style={{ color: tokens.textMuted }}>
                &ldquo;Direct, focused consultation delivers outcomes that save months of misdirected effort.&rdquo;
              </p>
              <a
                href="#booking-section"
                className="text-xs font-serif uppercase tracking-wider font-bold underline flex items-center gap-1.5"
                style={{ color: primaryColor }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          {bannerUrl && (
            <div className="mt-8 border overflow-hidden aspect-[16/7] sm:aspect-[21/9] max-h-[400px] relative" style={{ borderColor: tokens.border }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt={storeName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-4 py-1.5 text-[10px] font-serif uppercase tracking-wider backdrop-blur-xs border-t"
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.textMuted }}
              >
                Practice Dispatch • Consultation Facility & Headquarters
              </div>
            </div>
          )}
        </section>
      );
    }

    // Hero 6: Organic Flow (Organic & Natural)
    if (layout === "organic-flow") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto"
        >
          <div
            className="p-8 sm:p-14 rounded-3xl border text-center space-y-5"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}>
              <Leaf className="h-3.5 w-3.5" />
              <span>Professional Practice &amp; Advisory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {heroHeadline}
            </h1>
            <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed" style={{ color: tokens.textMuted }}>
              {heroSubheadline}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#booking-section"
                className="px-6 py-3 rounded-2xl text-xs font-bold text-white shadow-xs inline-flex items-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#services-section"
                className="px-6 py-3 rounded-2xl text-xs font-semibold border hover:bg-stone-100/50"
                style={{ borderColor: tokens.border, color: tokens.text }}
              >
                Explore Services
              </a>
            </div>
            {bannerUrl && (
              <div className="rounded-2xl overflow-hidden border shadow-sm aspect-[16/8] sm:aspect-[21/9] max-h-[360px] mx-auto mt-4" style={{ borderColor: tokens.border }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>
        </section>
      );
    }

    // Hero 7: Cyber Specs (Tech & Futuristic)
    if (layout === "cyber-specs") {
      return (
        <section
          key="hero"
          data-anchor="section.hero"
          className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto font-mono"
        >
          <div
            className="border p-6 sm:p-10 rounded-none space-y-6"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div className="flex items-center justify-between border-b pb-3 text-xs" style={{ borderColor: tokens.border, color: tokens.badgeText }}>
              <span>CONSULTATION_SYSTEM // v4.2</span>
              <span>CALENDAR_SYNC: ACTIVE</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider" style={{ color: primaryColor }}>
              {heroHeadline}
            </h1>
            <p className="text-xs sm:text-sm font-sans max-w-2xl leading-relaxed" style={{ color: tokens.textMuted }}>
              {heroSubheadline}
            </p>
            {bannerUrl && (
              <div className="border overflow-hidden aspect-[16/8] sm:aspect-[21/9] max-h-[340px] relative group" style={{ borderColor: tokens.border }}>
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-black/70 border border-emerald-500/40 text-emerald-400">
                  OPTICAL_FEED // PRACTICE_HEADQUARTERS
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerUrl}
                  alt={storeName}
                  className="w-full h-full object-cover filter contrast-105"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">ENCRYPTION</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>AES-256-GCM</span>
              </div>
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">SYNC_LATENCY</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>&lt; 50ms</span>
              </div>
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">CONCURRENCY</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>MUTEX_LOCKED</span>
              </div>
              <div className="border p-3" style={{ borderColor: tokens.border }}>
                <span className="block opacity-60 text-[10px]">AVAILABILITY</span>
                <span className="font-bold text-sm" style={{ color: tokens.text }}>REALTIME</span>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <a
                href="#booking-section"
                className="px-6 py-3 text-xs font-bold uppercase tracking-wider border rounded-none inline-flex items-center gap-2"
                style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: tokens.border }}
              >
                <span>{ctaText}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>
      );
    }

    // Hero 8: Asymmetric Cards (Playful & Creative)
    return (
      <section
        key="hero"
        data-anchor="section.hero"
        className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-5"
      >
        <div className="inline-block transform -rotate-1 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white shadow-xs" style={{ backgroundColor: tokens.accent }}>
          🎉 Easy Online Scheduling!
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight" style={{ color: tokens.text }}>
          {heroHeadline}
        </h1>
        <p className="text-sm sm:text-base font-medium max-w-xl mx-auto" style={{ color: tokens.textMuted }}>
          {heroSubheadline}
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#booking-section"
            className="px-8 py-3 rounded-full text-sm font-black text-white shadow-lg transform hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <span>{ctaText} ✨</span>
          </a>
          <a
            href="#services-section"
            className="px-6 py-3 rounded-full text-xs font-black border-2 border-black bg-white hover:bg-stone-100 transition-all"
            style={{ color: tokens.text }}
          >
            Explore Services
          </a>
        </div>
        {bannerUrl && (
          <div className="rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000000] overflow-hidden aspect-[16/8] sm:aspect-[21/9] max-h-[360px] max-w-4xl mx-auto mt-6 transform -rotate-1 hover:rotate-0 transition-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerUrl}
              alt={storeName}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
            />
          </div>
        )}
      </section>
    );
  };

  // -------------------------------------------------------------
  // DISTINCT SERVICE CARD RENDERING PER DESIGN TEMPLATE
  // -------------------------------------------------------------
  const renderServiceCard = (svc: AppointmentService) => {
    const cardStyle = activeDesignTemplate.cardLayout;
    const isSelected = selectedService?.id === svc.id;

    // Card 1: Tall Editorial (Luxury Editorial)
    if (cardStyle === "tall-editorial") {
      return (
        <div
          key={svc.id}
          className={cn(
            "group flex flex-col justify-between border p-7 transition-all font-serif",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: isSelected ? tokens.accent : tokens.border,
            // @ts-expect-error ring color
            "--tw-ring-color": tokens.accent,
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.border }}>
              <span className="text-[10px] uppercase tracking-widest" style={{ color: tokens.accent }}>
                {getMeetingLabel(svc.meetingType)}
              </span>
              <span className="text-xs italic" style={{ color: tokens.textMuted }}>
                {svc.durationMinutes} minutes
              </span>
            </div>
            <div>
              <h3 className="font-serif text-xl tracking-wide leading-snug" style={{ color: tokens.text }}>
                {svc.name}
              </h3>
              <p className="font-serif italic text-xs mt-2 leading-relaxed opacity-80" style={{ color: tokens.textMuted }}>
                {svc.description}
              </p>
            </div>
          </div>
          <div className="pt-6 mt-6 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
            <div>
              <span className="text-[9px] uppercase tracking-widest block" style={{ color: tokens.textMuted }}>
                Honourarium
              </span>
              <span className="font-serif text-lg font-light" style={{ color: tokens.text }}>
                {svc.isFreeConsultation || svc.price === 0 ? "Complimentary" : formatINR(svc.price)}
              </span>
            </div>
            <a
              href="#booking-section"
              onClick={() => setSelectedService(svc)}
              className="px-4 py-2 text-xs uppercase font-serif tracking-widest border transition-all hover:bg-white/10"
              style={{ borderColor: tokens.accent, color: tokens.text }}
            >
              {isSelected ? "Selected" : "Reserve"}
            </a>
          </div>
        </div>
      );
    }

    // Card 2: Block Solid (Bold & Vibrant)
    if (cardStyle === "block-solid") {
      return (
        <div
          key={svc.id}
          className={cn(
            "border-3 p-6 flex flex-col justify-between transition-all shadow-[4px_4px_0_0_#000000]",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: "#000000",
            // @ts-expect-error ring color
            "--tw-ring-color": primaryColor,
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black uppercase border-2 border-black bg-yellow-300 text-black shadow-[1px_1px_0_0_#000000]">
                {renderMeetingIcon(svc.meetingType)}
                <span>{getMeetingLabel(svc.meetingType)}</span>
              </span>
              <span className="text-xs font-black px-2 py-0.5 border-2 border-black bg-stone-100 text-black">
                {svc.durationMinutes} MIN
              </span>
            </div>
            <div>
              <h3 className="font-black text-xl uppercase tracking-tight" style={{ color: tokens.text }}>
                {svc.name}
              </h3>
              <p className="text-xs font-bold mt-2 leading-relaxed" style={{ color: tokens.textMuted }}>
                {svc.description}
              </p>
            </div>
          </div>
          <div className="pt-6 mt-6 border-t-2 border-black flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black block" style={{ color: tokens.textMuted }}>
                Fee
              </span>
              <span className="font-black text-xl" style={{ color: tokens.text }}>
                {svc.isFreeConsultation || svc.price === 0 ? "FREE" : formatINR(svc.price)}
              </span>
            </div>
            <a
              href="#booking-section"
              onClick={() => setSelectedService(svc)}
              className="px-5 py-2.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0_0_#000000] cursor-pointer"
              style={{ backgroundColor: primaryColor, color: "#FFFFFF" }}
            >
              {isSelected ? "SELECTED!" : "SELECT & BOOK"}
            </a>
          </div>
        </div>
      );
    }

    // Card 3: Classic Rating (Classic Commerce)
    if (cardStyle === "classic-rating") {
      return (
        <div
          key={svc.id}
          className={cn(
            "rounded-lg border p-6 flex flex-col justify-between shadow-xs transition-all",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: isSelected ? primaryColor : tokens.border,
            // @ts-expect-error ring color
            "--tw-ring-color": primaryColor,
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border" style={{ borderColor: tokens.border, color: tokens.text }}>
                {renderMeetingIcon(svc.meetingType)}
                <span>{getMeetingLabel(svc.meetingType)}</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                {svc.durationMinutes} mins
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-500 text-[10px] mb-1">
                <Star className="h-3 w-3 fill-amber-500" />
                <Star className="h-3 w-3 fill-amber-500" />
                <Star className="h-3 w-3 fill-amber-500" />
                <Star className="h-3 w-3 fill-amber-500" />
                <Star className="h-3 w-3 fill-amber-500" />
                <span className="text-stone-500 ml-1 font-semibold">(Consultation Feedback)</span>
              </div>
              <h3 className="font-bold text-lg leading-snug" style={{ color: tokens.text }}>
                {svc.name}
              </h3>
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: tokens.textMuted }}>
                {svc.description}
              </p>
            </div>
          </div>
          <div className="pt-6 mt-6 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
            <div>
              <span className="text-[10px] uppercase font-semibold block" style={{ color: tokens.textMuted }}>
                Consultation Fee
              </span>
              <span className="font-bold text-lg" style={{ color: tokens.text }}>
                {svc.isFreeConsultation || svc.price === 0 ? "Complimentary" : formatINR(svc.price)}
              </span>
            </div>
            <a
              href="#booking-section"
              onClick={() => setSelectedService(svc)}
              className="px-4 py-2 rounded-md text-xs font-bold text-white shadow-xs transition-transform active:scale-98"
              style={{ backgroundColor: primaryColor }}
            >
              {isSelected ? "Selected" : "Book Slot"}
            </a>
          </div>
        </div>
      );
    }

    // Card 4: Captioned Story (Editorial Magazine)
    if (cardStyle === "captioned-story") {
      return (
        <div
          key={svc.id}
          className={cn(
            "border-b pb-6 flex flex-col justify-between font-serif space-y-4",
            isSelected ? "border-l-4 pl-4" : ""
          )}
          style={{ borderColor: isSelected ? primaryColor : tokens.border }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] tracking-widest uppercase opacity-60">
              <span>DISPATCH // {getMeetingLabel(svc.meetingType)}</span>
              <span>{svc.durationMinutes} MIN SESSION</span>
            </div>
            <h3 className="font-serif text-xl font-bold tracking-tight" style={{ color: tokens.text }}>
              {svc.name}
            </h3>
            <p className="text-xs italic leading-relaxed opacity-80" style={{ color: tokens.textMuted }}>
              &ldquo;{svc.description}&rdquo;
            </p>
          </div>
          <div className="pt-3 flex items-center justify-between border-t border-dashed" style={{ borderColor: tokens.border }}>
            <span className="font-serif text-base font-bold" style={{ color: primaryColor }}>
              {svc.isFreeConsultation || svc.price === 0 ? "Complimentary" : formatINR(svc.price)}
            </span>
            <a
              href="#booking-section"
              onClick={() => setSelectedService(svc)}
              className="text-xs font-serif font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
              style={{ color: primaryColor }}
            >
              <span>{isSelected ? "Selected Dispatch" : "Schedule Dispatch"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      );
    }

    // Card 5: Soft Rounded (Organic & Natural)
    if (cardStyle === "soft-rounded") {
      return (
        <div
          key={svc.id}
          className={cn(
            "rounded-3xl border p-6 flex flex-col justify-between shadow-xs transition-all hover:shadow-md",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: isSelected ? primaryColor : tokens.border,
            // @ts-expect-error ring color
            "--tw-ring-color": primaryColor,
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}>
                <Leaf className="h-3 w-3" />
                <span>{getMeetingLabel(svc.meetingType)}</span>
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {svc.durationMinutes} mins
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug" style={{ color: tokens.text }}>
                {svc.name}
              </h3>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: tokens.textMuted }}>
                {svc.description}
              </p>
            </div>
          </div>
          <div className="pt-6 mt-6 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
            <span className="font-bold text-base" style={{ color: tokens.text }}>
              {svc.isFreeConsultation || svc.price === 0 ? "Complimentary" : formatINR(svc.price)}
            </span>
            <a
              href="#booking-section"
              onClick={() => setSelectedService(svc)}
              className="px-5 py-2 rounded-2xl text-xs font-medium text-white shadow-xs transition-transform active:scale-98"
              style={{ backgroundColor: primaryColor }}
            >
              {isSelected ? "Selected" : "Select Session"}
            </a>
          </div>
        </div>
      );
    }

    // Card 6: Monospaced Grid (Tech & Futuristic)
    if (cardStyle === "monospaced-grid") {
      return (
        <div
          key={svc.id}
          className={cn(
            "border rounded-none font-mono p-5 flex flex-col justify-between transition-all",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: isSelected ? primaryColor : tokens.border,
            // @ts-expect-error ring color
            "--tw-ring-color": primaryColor,
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="px-2 py-0.5 border" style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}>
                FORMAT // {getMeetingLabel(svc.meetingType)}
              </span>
              <span className="opacity-70 font-bold">{svc.durationMinutes}M_DURATION</span>
            </div>
            <div>
              <span className="text-[9px] block opacity-50">[SVC_CODE: {svc.id.slice(0, 8)}]</span>
              <h3 className="font-bold text-sm uppercase tracking-wider mt-0.5" style={{ color: tokens.text }}>
                {svc.name}
              </h3>
              <p className="text-xs font-sans mt-2 leading-relaxed" style={{ color: tokens.textMuted }}>
                {svc.description}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
            <span className="font-bold text-sm" style={{ color: tokens.badgeText }}>
              {svc.isFreeConsultation || svc.price === 0 ? "NO_FEE" : formatINR(svc.price)}
            </span>
            <a
              href="#booking-section"
              onClick={() => setSelectedService(svc)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase border rounded-none"
              style={{ backgroundColor: primaryColor, color: "#FFFFFF", borderColor: tokens.border }}
            >
              {isSelected ? "ACTIVE_SLOT" : "ENGAGE_SLOT"}
            </a>
          </div>
        </div>
      );
    }

    // Card 7: Sticker Playful (Playful & Creative)
    if (cardStyle === "sticker-playful") {
      return (
        <div
          key={svc.id}
          className={cn(
            "rounded-2xl border-2 p-5 flex flex-col justify-between shadow-md transform hover:-translate-y-1 transition-all",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: isSelected ? primaryColor : tokens.border,
            // @ts-expect-error ring color
            "--tw-ring-color": primaryColor,
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full transform -rotate-3 text-white shadow-xs"
                style={{ backgroundColor: tokens.accent }}
              >
                {getMeetingLabel(svc.meetingType)}
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {svc.durationMinutes} mins ⚡
              </span>
            </div>
            <div>
              <h3 className="font-black text-lg leading-snug" style={{ color: tokens.text }}>
                {svc.name}
              </h3>
              <p className="text-xs font-medium mt-1.5 leading-relaxed" style={{ color: tokens.textMuted }}>
                {svc.description}
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t-2 flex items-center justify-between" style={{ borderColor: tokens.border }}>
            <span className="font-black text-base" style={{ color: primaryColor }}>
              {svc.isFreeConsultation || svc.price === 0 ? "Free! 🎉" : formatINR(svc.price)}
            </span>
            <a
              href="#booking-section"
              onClick={() => setSelectedService(svc)}
              className="px-4 py-2 rounded-full text-xs font-black text-white shadow-xs transform hover:scale-105 active:scale-95 transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              {isSelected ? "Picked! ✨" : "Book It! ✨"}
            </a>
          </div>
        </div>
      );
    }

    // Default / Understated (Modern Minimal)
    return (
      <div
        key={svc.id}
        className={cn(
          "rounded-2xl border p-6 flex flex-col justify-between transition-all hover:shadow-md",
          isSelected ? "ring-2" : ""
        )}
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: isSelected ? primaryColor : tokens.border,
          // @ts-expect-error Tailwind ring color custom prop
          "--tw-ring-color": primaryColor,
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border" style={{ borderColor: tokens.border, color: tokens.text }}>
              {renderMeetingIcon(svc.meetingType)}
              <span>{getMeetingLabel(svc.meetingType)}</span>
            </span>

            <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
              {svc.durationMinutes} mins
            </span>
          </div>

          <div>
            <h3 className="font-bold text-lg leading-snug" style={{ color: tokens.text }}>
              {svc.name}
            </h3>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: tokens.textMuted }}>
              {svc.description}
            </p>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
          <div>
            <span className="text-[10px] uppercase font-semibold block" style={{ color: tokens.textMuted }}>
              Fee
            </span>
            <span className="font-black text-base" style={{ color: tokens.text }}>
              {svc.isFreeConsultation || svc.price === 0 ? "Complimentary" : formatINR(svc.price)}
            </span>
          </div>

          <a
            href="#booking-section"
            onClick={() => setSelectedService(svc)}
            className={cn("px-4 py-2 text-xs font-bold text-white shadow-xs transition-transform active:scale-98", buttonRadiusClass)}
            style={{ backgroundColor: primaryColor }}
          >
            {isSelected ? "Selected" : "Select & Book"}
          </a>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // DISTINCT PROVIDER CARD RENDERING PER DESIGN TEMPLATE
  // -------------------------------------------------------------
  const renderProviderCard = (prv: AppointmentProvider) => {
    const cardStyle = activeDesignTemplate.cardLayout;
    const isSelected = selectedProvider?.id === prv.id;

    if (cardStyle === "tall-editorial") {
      return (
        <div
          key={prv.id}
          onClick={() => setSelectedProvider(prv)}
          role="button"
          tabIndex={0}
          className={cn(
            "border p-6 flex flex-col justify-between transition-all cursor-pointer font-serif",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: isSelected ? tokens.accent : tokens.border,
            // @ts-expect-error ring color
            "--tw-ring-color": tokens.accent,
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center font-serif text-lg font-light text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              {prv.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-serif font-bold text-base" style={{ color: tokens.text }}>
                {prv.name}
              </h3>
              <p className="text-xs uppercase tracking-widest italic" style={{ color: tokens.accent }}>
                {prv.role}
              </p>
            </div>
          </div>
          {prv.bio && (
            <p className="text-xs italic leading-relaxed" style={{ color: tokens.textMuted }}>
              &ldquo;{prv.bio}&rdquo;
            </p>
          )}
        </div>
      );
    }

    if (cardStyle === "block-solid") {
      return (
        <div
          key={prv.id}
          onClick={() => setSelectedProvider(prv)}
          role="button"
          tabIndex={0}
          className={cn(
            "border-3 p-5 flex items-start gap-4 transition-all cursor-pointer shadow-[4px_4px_0_0_#000000]",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: "#000000",
            // @ts-expect-error ring color
            "--tw-ring-color": primaryColor,
          }}
        >
          <div
            className="w-12 h-12 shrink-0 border-2 border-black flex items-center justify-center font-black text-white shadow-[2px_2px_0_0_#000000]"
            style={{ backgroundColor: primaryColor }}
          >
            {prv.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="font-black text-sm uppercase truncate" style={{ color: tokens.text }}>
              {prv.name}
            </h3>
            <p className="text-xs font-black uppercase" style={{ color: primaryColor }}>
              {prv.role}
            </p>
            {prv.bio && (
              <p className="text-[11px] font-bold leading-relaxed pt-1" style={{ color: tokens.textMuted }}>
                {prv.bio}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (cardStyle === "monospaced-grid") {
      return (
        <div
          key={prv.id}
          onClick={() => setSelectedProvider(prv)}
          role="button"
          tabIndex={0}
          className={cn(
            "border rounded-none font-mono p-4 flex items-start gap-3 transition-all cursor-pointer",
            isSelected ? "ring-2" : ""
          )}
          style={{
            backgroundColor: tokens.cardBg,
            borderColor: isSelected ? primaryColor : tokens.border,
            // @ts-expect-error ring color
            "--tw-ring-color": primaryColor,
          }}
        >
          <div
            className="w-10 h-10 shrink-0 border flex items-center justify-center font-bold text-xs"
            style={{ backgroundColor: tokens.badgeBg, borderColor: tokens.border, color: tokens.badgeText }}
          >
            {prv.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1 min-w-0 text-xs">
            <span className="text-[9px] block opacity-50">[PRACTITIONER_ID: {prv.id.slice(0, 6)}]</span>
            <h3 className="font-bold truncate uppercase" style={{ color: tokens.text }}>
              {prv.name}
            </h3>
            <p className="font-bold" style={{ color: primaryColor }}>
              {prv.role}
            </p>
            {prv.bio && (
              <p className="text-[10px] font-sans opacity-70 leading-relaxed pt-1" style={{ color: tokens.textMuted }}>
                {prv.bio}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Default / rounded card
    return (
      <div
        key={prv.id}
        onClick={() => setSelectedProvider(prv)}
        role="button"
        tabIndex={0}
        className={cn(
          cardClass,
          "rounded-2xl border p-6 flex items-start gap-4 transition-all cursor-pointer",
          isSelected ? "ring-2" : ""
        )}
        style={{
          backgroundColor: tokens.cardBg,
          borderColor: isSelected ? primaryColor : tokens.border,
          // @ts-expect-error ring color
          "--tw-ring-color": primaryColor,
        }}
      >
        <div
          className={cn("w-12 h-12 shrink-0 flex items-center justify-center font-bold text-white shadow-xs", buttonRadiusClass)}
          style={{ backgroundColor: primaryColor }}
        >
          {prv.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-sm truncate" style={{ color: tokens.text }}>
            {prv.name}
          </h3>
          <p className="text-xs font-medium" style={{ color: primaryColor }}>
            {prv.role}
          </p>
          {prv.bio && (
            <p className="text-[11px] leading-relaxed pt-1" style={{ color: tokens.textMuted }}>
              {prv.bio}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors selection:bg-black/10 w-full max-w-full overflow-x-hidden"
      style={{
        backgroundColor: tokens.background,
        color: tokens.text,
        fontFamily: branding.fontFamily,
        ["--theme-primary" as string]: primaryColor,
        ["--theme-secondary" as string]: tokens.secondary,
        ["--theme-accent" as string]: tokens.accent,
        ["--theme-background" as string]: tokens.background,
        ["--theme-surface" as string]: tokens.surface,
        ["--theme-text" as string]: tokens.text,
        ["--theme-text-muted" as string]: tokens.textMuted,
        ["--theme-border" as string]: tokens.border,
        ["--theme-card-bg" as string]: tokens.cardBg,
        ["--theme-badge-bg" as string]: tokens.badgeBg,
        ["--theme-badge-text" as string]: tokens.badgeText,
      }}
    >
      {isPreview && (
        <div
          className="py-2 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2 border-b"
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.border,
            color: tokens.textMuted,
          }}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="truncate">
            <strong>GridRetail Interactive Preview</strong> — Layout: <em>{activeDesignTemplate.name}</em> • Theme: <em>{activeTheme.name}</em> (Appointment Scheduling Website)
          </span>
        </div>
      )}
      {/* Top Header / Navigation Bar (Template-driven) */}
      {renderHeader()}

      {/* Hero Section (Template-driven) */}
      {renderHero()}

      {/* Services Showcase */}
      <section
        id="services-section"
        className="pt-10 sm:pt-14 pb-14 sm:pb-18 border-b"
        style={{ backgroundColor: tokens.background, borderColor: tokens.border }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: tokens.text }}>
              Consultation Services &amp; Practice Areas
            </h2>
            <p className="text-xs sm:text-sm mt-2" style={{ color: tokens.textMuted }}>
              Transparent durations, structured consultation objectives, and defined consultation formats.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => renderServiceCard(svc))}
          </div>
        </div>
      </section>

      {/* Practitioners & Providers (if configured) */}
      {providers.length > 0 && (
        <section
          id="practitioners-section"
          className="py-16 sm:py-20 border-b"
          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: tokens.text }}>
                Lead Practitioners & Staff
              </h2>
              <p className="text-xs sm:text-sm mt-2" style={{ color: tokens.textMuted }}>
                Meet the qualified professionals responsible for delivering your consultations and advice.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map((prv) => renderProviderCard(prv))}
            </div>
          </div>
        </section>
      )}

      {/* Interactive Booking Section */}
      <section
        id="booking-section"
        className="py-16 sm:py-24 border-b scroll-mt-20"
        style={{ backgroundColor: tokens.background, borderColor: tokens.border }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border text-emerald-800 bg-emerald-50 border-emerald-200">
              Direct Scheduling
            </span>
            <h2 className="text-3xl font-black tracking-tight" style={{ color: tokens.text }}>
              Select an Appointment Time
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
              Times are displayed in your configured practice timezone: <strong>{timezone}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 cols: Service & Slot Picker */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Service Selector */}
              <div
                className={cn(cardClass, "p-6 rounded-2xl border space-y-3")}
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: tokens.text }}>
                  1. Select Consultation Service
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedService(s)}
                      className={cn(
                        "p-3 border text-left transition-all cursor-pointer",
                        buttonRadiusClass,
                        selectedService?.id === s.id ? "border-emerald-600 bg-emerald-50/50 shadow-xs" : "hover:border-stone-400"
                      )}
                      style={{
                        borderColor: selectedService?.id === s.id ? primaryColor : tokens.border,
                      }}
                    >
                      <div className="font-bold text-xs" style={{ color: tokens.text }}>
                        {s.name}
                      </div>
                      <div className="text-[11px] flex items-center justify-between mt-1" style={{ color: tokens.textMuted }}>
                        <span>{s.durationMinutes} mins</span>
                        <span className="font-semibold text-emerald-700">
                          {s.isFreeConsultation || s.price === 0 ? "Free" : formatINR(s.price)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Date Picker */}
              <div
                className={cn(cardClass, "p-6 rounded-2xl border space-y-4")}
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <div className="flex items-center justify-between">
                  <label htmlFor="appointment-date-select" className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.text }}>
                    2. Select Date
                  </label>
                  <span className="text-[11px]" style={{ color: tokens.textMuted }}>
                    Timezone: {timezone}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="appointment-date-select"
                    aria-label="Select appointment date"
                    type="date"
                    min={todayIso}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={cn("px-4 py-2.5 border text-xs font-medium focus:outline-none", buttonRadiusClass)}
                    style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                  />
                  <span className="text-xs" style={{ color: tokens.textMuted }}>
                    Selected: <strong>{selectedDate}</strong>
                  </span>
                </div>
              </div>

              {/* Step 3: Time Slot Picker */}
              <div
                className={cn(cardClass, "p-6 rounded-2xl border space-y-4")}
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.text }}>
                    3. Available Time Slots
                  </label>
                  <span className="text-[11px]" style={{ color: tokens.textMuted }}>
                    {isLoadingSlots ? "Refreshing slots..." : `${availableSlots.length} available`}
                  </span>
                </div>

                {isLoadingSlots ? (
                  <div className="py-8 text-center text-xs" style={{ color: tokens.textMuted }}>
                    Loading real-time availability...
                  </div>
                ) : slotError ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {slotError}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs font-medium" style={{ color: tokens.textMuted }}>
                      No available consultation slots for this date.
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Please pick another weekday within standard business hours.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.startUtc === slot.startUtc;
                      return (
                        <button
                          key={slot.startUtc}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "py-2.5 px-3 border text-xs font-bold text-center transition-all cursor-pointer",
                            buttonRadiusClass,
                            isSelected
                              ? "bg-[#18231E] text-white border-[#18231E] shadow-sm"
                              : "hover:border-stone-400"
                          )}
                          style={{
                            borderColor: isSelected ? primaryColor : tokens.border,
                            backgroundColor: isSelected ? primaryColor : tokens.surface,
                            color: isSelected ? "#FFFFFF" : tokens.text,
                          }}
                        >
                          {slot.formattedTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 cols: Booking Details & Contact Form */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleBookAppointment}
                className={cn(cardClass, "rounded-2xl border p-6 space-y-5 sticky top-24")}
                style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
              >
                <h3 className="font-bold text-base" style={{ color: tokens.text }}>
                  Appointment Summary & Booking
                </h3>

                {/* Summary Box */}
                <div
                  className={cn("p-4 border space-y-2 text-xs", buttonRadiusClass)}
                  style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: tokens.textMuted }}>Service</span>
                    <span className="font-bold" style={{ color: tokens.text }}>
                      {selectedService?.name || "None selected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: tokens.textMuted }}>Duration</span>
                    <span className="font-semibold" style={{ color: tokens.text }}>
                      {selectedService?.durationMinutes || 0} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: tokens.textMuted }}>Date & Time</span>
                    <span className="font-bold text-emerald-700">
                      {selectedSlot ? `${selectedDate} at ${selectedSlot.formattedTime}` : "Select time slot"}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: tokens.border }}>
                    <span style={{ color: tokens.textMuted }}>Consultation Fee</span>
                    <span className="font-black text-sm" style={{ color: primaryColor }}>
                      {selectedService?.isFreeConsultation || selectedService?.price === 0
                        ? "Complimentary"
                        : formatINR(selectedService?.price || 0)}
                    </span>
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1" style={{ color: tokens.text }}>
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Adv. Rajesh Iyer"
                      className={cn("w-full px-3 py-2 border focus:outline-none", buttonRadiusClass)}
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1" style={{ color: tokens.text }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="rajesh@example.in"
                      className={cn("w-full px-3 py-2 border focus:outline-none", buttonRadiusClass)}
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1" style={{ color: tokens.text }}>
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={cn("w-full px-3 py-2 border focus:outline-none", buttonRadiusClass)}
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1" style={{ color: tokens.text }}>
                      Consultation Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Brief topic of discussion (Please do not include confidential case files)"
                      className={cn("w-full px-3 py-2 border focus:outline-none text-xs", buttonRadiusClass)}
                      style={{ borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }}
                    />
                  </div>
                </div>

                {bookingError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {bookingError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedSlot || isSubmittingBooking}
                  className={cn(
                    "w-full py-3.5 font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-40",
                    buttonRadiusClass
                  )}
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmittingBooking ? (
                    <span>Validating Slot & Booking...</span>
                  ) : (
                    <>
                      <span>Confirm Appointment</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Policy Notice */}
                <div className="pt-2 text-[10px] leading-relaxed space-y-1" style={{ color: tokens.textMuted }}>
                  <p>
                    <strong>Cancellation Policy:</strong> {cancellationPolicyText}
                  </p>
                  <p>
                    <strong>Privacy & Confidentiality:</strong> Details provided are used strictly for scheduling your consultation.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Modal */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="max-w-md w-full rounded-2xl border p-6 sm:p-8 space-y-6 shadow-2xl relative"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-emerald-800 bg-emerald-50 border-emerald-200">
                {confirmedBooking.status === "Confirmed" ? "Appointment Confirmed" : "Booking Request Submitted"}
              </span>
              <h3 className="text-xl font-black" style={{ color: tokens.text }}>
                Reference: {confirmedBooking.confirmationNumber}
              </h3>
              <p className="text-xs" style={{ color: tokens.textMuted }}>
                {confirmedBooking.message || "Your appointment has been scheduled in the business calendar."}
              </p>
            </div>

            <div
              className="p-4 rounded-xl border text-xs space-y-2 text-left"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <div className="flex justify-between">
                <span style={{ color: tokens.textMuted }}>Service</span>
                <span className="font-semibold" style={{ color: tokens.text }}>{confirmedBooking.serviceName}</span>
              </div>
              {confirmedBooking.providerName && (
                <div className="flex justify-between">
                  <span style={{ color: tokens.textMuted }}>Practitioner</span>
                  <span className="font-semibold" style={{ color: tokens.text }}>{confirmedBooking.providerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: tokens.textMuted }}>Time</span>
                <span className="font-bold text-emerald-700">
                  {new Date(confirmedBooking.startUtc).toLocaleDateString()} ({confirmedBooking.timezone})
                </span>
              </div>
            </div>

            {confirmedBooking.cancellationPath && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-left">
                <strong>Self-Service Cancellation Link:</strong> You can cancel this appointment up to the policy deadline using your private booking link:
                <div className="mt-1 font-mono text-[10px] break-all text-amber-900 bg-amber-100/70 p-1.5 rounded">
                  {confirmedBooking.cancellationPath}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Close & Return
              </button>
              {confirmedBooking.cancellationPath && (
                <a
                  href={confirmedBooking.cancellationPath}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-xs border text-center hover:bg-stone-100/50 flex items-center justify-center"
                  style={{ borderColor: tokens.border, color: tokens.text }}
                >
                  View Booking Page
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  const email = lookupEmail;
                  setConfirmedBooking(null);
                  if (email) {
                    handleLookupAppointments(email);
                    document.getElementById("my-appointments")?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className={cn("flex-1 py-2.5 font-semibold text-xs border hover:bg-stone-100/50 flex items-center justify-center gap-1.5", buttonRadiusClass)}
                style={{ borderColor: tokens.border, color: tokens.text }}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>View in My Appointments</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configured Modular Sections (FAQ Accordion, Trust & Certification, Benefits Grid, Brand Story, Newsletter, etc.) */}
      {sections
        .filter((sec) => {
          const def = getSectionDefinition(sec.type);
          return (
            sec.visible &&
            def?.category !== "hero" &&
            def?.category !== "footer" &&
            def?.category !== "products" &&
            !sec.type.startsWith("hero_") &&
            sec.type !== "footer_custom"
          );
        })
        .map((sec) => (
          <SectionRenderer
            key={sec.id}
            instance={sec}
            tokens={tokens}
            styling={styling}
            primaryColor={primaryColor}
            storeSlug={store.slug}
            storeName={storeName}
            clientName={store.clientName || storeName}
            products={[]}
            categories={[]}
            onQuickAdd={() => {}}
            addedItems={{}}
            activeDesignTemplate={activeDesignTemplate}
            branding={branding}
            isSelected={selectedSectionId === sec.id}
          />
        ))}

      {/* My Appointments / Manage Appointments Section */}
      <section
        id="my-appointments"
        className="py-16 sm:py-24 border-b scroll-mt-20"
        style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border text-emerald-800 bg-emerald-50 border-emerald-200">
              Client Portal
            </span>
            <h2 className="text-3xl font-black tracking-tight" style={{ color: tokens.text }}>
              My Appointments & Consultations
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: tokens.textMuted }}>
              Review your upcoming and past consultation bookings for {storeName}. Check appointment status, review timing, or cancel an upcoming session.
            </p>
          </div>

          {/* Search Lookup Bar */}
          <div
            className={cn(cardClass, "max-w-xl mx-auto p-4 sm:p-6 rounded-2xl border mb-10 shadow-xs")}
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookupAppointments();
              }}
              className="space-y-3"
            >
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: tokens.text }}>
                Find Your Appointments
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={lookupEmail}
                    onChange={(e) => {
                      setLookupEmail(e.target.value);
                      setLookupError(null);
                    }}
                    placeholder="Enter your customer booking email..."
                    className={cn("w-full pl-9 pr-3.5 py-2 border text-xs focus:outline-hidden", buttonRadiusClass)}
                    style={{
                      borderColor: tokens.border,
                      backgroundColor: tokens.background,
                      color: tokens.text,
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingAppointments}
                  className={cn("px-5 py-2 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-transform active:scale-98 disabled:opacity-60 cursor-pointer", buttonRadiusClass)}
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSearchingAppointments ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      <span>Search Appointments</span>
                    </>
                  )}
                </button>
              </div>

              {lookupError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{lookupError}</span>
                </div>
              )}

              {cancelSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{cancelSuccessMessage}</span>
                </div>
              )}

              <p className="text-[11px]" style={{ color: tokens.textMuted }}>
                Only appointments booked with your email address for this practice will be displayed.
              </p>
            </form>
          </div>

          {/* Results Display */}
          {isSearchingAppointments ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-medium" style={{ color: tokens.textMuted }}>
                Retrieving your appointments from server...
              </p>
            </div>
          ) : !hasSearched ? (
            /* Friendly initial state */
            <div
              className="max-w-md mx-auto text-center py-12 px-6 rounded-2xl border border-dashed"
              style={{ borderColor: tokens.border }}
            >
              <Calendar className="h-10 w-10 mx-auto text-stone-300 mb-3" />
              <h4 className="font-bold text-sm" style={{ color: tokens.text }}>
                No Email Entered Yet
              </h4>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: tokens.textMuted }}>
                Enter the email address you used when booking a consultation above to view your scheduled times, booking references, and cancellation options.
              </p>
            </div>
          ) : searchedAppointments.length === 0 ? (
            /* Empty state when 0 appointments found for that email */
            <div
              className="max-w-md mx-auto text-center py-12 px-6 rounded-2xl border border-dashed"
              style={{ borderColor: tokens.border }}
            >
              <CalendarCheck className="h-10 w-10 mx-auto text-stone-300 mb-3" />
              <h4 className="font-bold text-sm" style={{ color: tokens.text }}>
                No Appointments Found
              </h4>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: tokens.textMuted }}>
                We could not find any appointments associated with <strong>{lookupEmail}</strong> for {storeName}.
              </p>
              <div className="mt-4">
                <a
                  href="#booking-section"
                  className={cn("inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white shadow-xs", buttonRadiusClass)}
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Book Your First Consultation</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ) : (
            /* Found Appointments List */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Upcoming vs Past Tabs */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.border }}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAppointmentTab("upcoming")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      appointmentTab === "upcoming"
                        ? "bg-[#18231E] text-white shadow-xs"
                        : "hover:bg-stone-100 text-stone-600"
                    )}
                    style={
                      appointmentTab === "upcoming"
                        ? { backgroundColor: primaryColor, color: "#FFFFFF" }
                        : {}
                    }
                  >
                    Upcoming Consultations (
                    {
                      searchedAppointments.filter(
                        (a) =>
                          new Date(a.startUtc) > new Date() &&
                          a.status !== "Cancelled" &&
                          a.status !== "Completed"
                      ).length
                    }
                    )
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentTab("past")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      appointmentTab === "past"
                        ? "bg-[#18231E] text-white shadow-xs"
                        : "hover:bg-stone-100 text-stone-600"
                    )}
                    style={
                      appointmentTab === "past"
                        ? { backgroundColor: primaryColor, color: "#FFFFFF" }
                        : {}
                    }
                  >
                    Past & Cancelled (
                    {
                      searchedAppointments.filter(
                        (a) =>
                          new Date(a.startUtc) <= new Date() ||
                          a.status === "Cancelled" ||
                          a.status === "Completed"
                      ).length
                    }
                    )
                  </button>
                </div>

                <span className="text-[11px]" style={{ color: tokens.textMuted }}>
                  Total: {searchedAppointments.length} appointment(s)
                </span>
              </div>

              {/* Appointment Cards */}
              {(() => {
                const isUpcomingTab = appointmentTab === "upcoming";
                const displayed = searchedAppointments.filter((a) => {
                  const isUpcoming =
                    new Date(a.startUtc) > new Date() &&
                    a.status !== "Cancelled" &&
                    a.status !== "Completed";
                  return isUpcomingTab ? isUpcoming : !isUpcoming;
                });

                if (displayed.length === 0) {
                  return (
                    <div className="py-10 text-center text-xs" style={{ color: tokens.textMuted }}>
                      {isUpcomingTab
                        ? "You have no upcoming consultations scheduled."
                        : "No past or cancelled appointments on record."}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {displayed.map((appt) => (
                      <div
                        key={appt.id}
                        className={cn(cardClass, "p-5 sm:p-6 rounded-2xl border transition-all hover:shadow-xs space-y-4")}
                        style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  appt.status === "Confirmed" && "bg-emerald-100 text-emerald-800",
                                  appt.status === "Pending" && "bg-amber-100 text-amber-800",
                                  appt.status === "Cancelled" && "bg-rose-100 text-rose-800",
                                  appt.status === "Completed" && "bg-blue-100 text-blue-800",
                                  appt.status === "No-show" && "bg-stone-200 text-stone-700"
                                )}
                              >
                                {appt.status === "Pending" ? "Pending Confirmation" : appt.status}
                              </span>

                              <span className="text-[11px] font-mono text-stone-400">
                                Ref: {appt.confirmationNumber}
                              </span>
                            </div>

                            <h3 className="font-extrabold text-base leading-snug" style={{ color: tokens.text }}>
                              {appt.serviceName}
                            </h3>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-xs font-black block" style={{ color: primaryColor }}>
                              {appt.price === 0 ? "Complimentary" : formatINR(appt.price)}
                            </span>
                            <span className="text-[11px]" style={{ color: tokens.textMuted }}>
                              {appt.durationMinutes} minutes
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div
                          className="p-3.5 rounded-xl border text-xs grid grid-cols-1 sm:grid-cols-2 gap-3"
                          style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
                        >
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Date & Time
                            </span>
                            <span className="font-semibold" style={{ color: tokens.text }}>
                              {formatAppointmentDateTime(appt.startUtc, appt.endUtc, appt.timezone || timezone)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">
                              Assigned Practitioner
                            </span>
                            <span className="font-semibold" style={{ color: tokens.text }}>
                              {appt.providerName || "Assigned Practice Specialist"}
                            </span>
                          </div>

                          {appt.cancelledAtUtc && (
                            <div className="sm:col-span-2 text-rose-700 bg-rose-50/70 p-2 rounded-lg border border-rose-200/60">
                              <span className="font-bold">Cancelled on:</span>{" "}
                              {new Date(appt.cancelledAtUtc).toLocaleString()}
                              {appt.cancellationReason && (
                                <span className="block mt-0.5 text-[11px]">
                                  Reason: {appt.cancellationReason}
                                </span>
                              )}
                            </div>
                          )}

                          {appt.customerNotes && (
                            <div className="sm:col-span-2">
                              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                                Notes provided at booking
                              </span>
                              <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: tokens.textMuted }}>
                                {appt.customerNotes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedAppointmentDetail(appt)}
                            className="text-xs font-medium underline cursor-pointer hover:text-stone-900"
                            style={{ color: tokens.textMuted }}
                          >
                            View Consultation Policy
                          </button>

                          {appt.canCancel ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalAppointment(appt);
                                setCancelReason("");
                              }}
                              className={cn(
                                "px-3.5 py-1.5 text-xs font-semibold border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer",
                                buttonRadiusClass
                              )}
                            >
                              Cancel Appointment
                            </button>
                          ) : appt.status === "Cancelled" ? (
                            <span className="text-xs text-rose-600 font-medium">
                              Slot released
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">
                              Cancellation notice period has passed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </section>

      {/* Cancel Confirmation Modal */}
      {cancelModalAppointment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="max-w-md w-full rounded-2xl border p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: tokens.border }}>
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-extrabold text-base" style={{ color: tokens.text }}>
                  Cancel Appointment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalAppointment(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: tokens.textMuted }}>
              Are you sure you want to cancel your consultation for{" "}
              <strong>{cancelModalAppointment.serviceName}</strong> on{" "}
              <strong>
                {new Date(cancelModalAppointment.startUtc).toLocaleDateString()}
              </strong>
              ? This action will immediately release your time slot for other clients.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-700 block">
                Reason for cancellation <span className="font-normal text-stone-400">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Scheduling conflict, project rescheduled..."
                className="w-full rounded-xl border p-2.5 text-xs focus:outline-hidden"
                style={{
                  borderColor: tokens.border,
                  backgroundColor: tokens.background,
                  color: tokens.text,
                }}
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setCancelModalAppointment(null)}
                className={cn("flex-1 py-2.5 font-semibold text-xs border cursor-pointer hover:bg-stone-100/50", buttonRadiusClass)}
                style={{ borderColor: tokens.border, color: tokens.text }}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleCancelAppointment}
                className={cn(
                  "flex-1 py-2.5 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60",
                  buttonRadiusClass
                )}
              >
                {isSubmittingCancel ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Policy Details Modal */}
      {selectedAppointmentDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="max-w-md w-full rounded-2xl border p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{ backgroundColor: tokens.cardBg, borderColor: tokens.border }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: tokens.border }}>
              <h3 className="font-extrabold text-base" style={{ color: tokens.text }}>
                Consultation & Practice Policy
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAppointmentDetail(null)}
                aria-label="Close policy details"
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs" style={{ color: tokens.textMuted }}>
              <div>
                <span className="font-bold text-stone-800 block">Cancellation Policy</span>
                <p className="mt-0.5 leading-relaxed">{cancellationPolicyText}</p>
              </div>

              <div>
                <span className="font-bold text-stone-800 block">Meeting Protocol</span>
                <p className="mt-0.5 leading-relaxed">
                  Please arrive or log on 5 minutes prior to scheduled start time. Practitioners will wait up to 15 minutes before marking a consultation as No-Show.
                </p>
              </div>

              <div>
                <span className="font-bold text-stone-800 block">Practice Location</span>
                <p className="mt-0.5 leading-relaxed">
                  {config?.meetingLocation || "Standard practice chambers / Encrypted video conference"}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedAppointmentDetail(null)}
                className={cn("w-full py-2.5 font-bold text-xs text-white", buttonRadiusClass)}
                style={{ backgroundColor: primaryColor }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Hours & Location Info */}
      <section
        className="py-12 border-b text-xs"
        style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-xs" style={{ color: tokens.text }}>
              Office Location & Meetings
            </h4>
            <p style={{ color: tokens.textMuted }}>
              {config?.meetingLocation || "Prime Executive Chambers, Nariman Point, Mumbai 400021."}
            </p>
            <p style={{ color: tokens.textMuted }}>
              Virtual video consultations conducted via encrypted conference links.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-xs" style={{ color: tokens.text }}>
              Standard Operating Hours
            </h4>
            <p style={{ color: tokens.textMuted }}>
              Monday – Friday: 09:00 AM – 06:00 PM ({timezone})
            </p>
            <p style={{ color: tokens.textMuted }}>
              Saturday & Sunday: Closed for in-person advisory.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-xs" style={{ color: tokens.text }}>
              Consultation Policies
            </h4>
            <p style={{ color: tokens.textMuted }}>
              {cancellationPolicyText}
            </p>
            <p style={{ color: tokens.textMuted }}>
              Emergency rescheduling subject to practitioner availability.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      {sections.some((sec) => sec.type === "footer_custom" && sec.visible) ? (
        sections
          .filter((sec) => sec.type === "footer_custom" && sec.visible)
          .map((sec) => (
            <SectionRenderer
              key={sec.id}
              instance={sec}
              tokens={tokens}
              styling={styling}
              primaryColor={primaryColor}
              storeSlug={store.slug}
              storeName={storeName}
              clientName={store.clientName || storeName}
              products={[]}
              categories={[]}
              onQuickAdd={() => {}}
              addedItems={{}}
              activeDesignTemplate={activeDesignTemplate}
              branding={branding}
              isSelected={selectedSectionId === sec.id}
            />
          ))
      ) : (
        <FooterSection
          instance={{
            id: "default_footer",
            type: "footer_custom",
            order: 99,
            visible: true,
            layoutVariant: styling?.footerVariation || "service_practitioner",
            settings: {},
          }}
          tokens={tokens}
          styling={styling}
          primaryColor={primaryColor}
          storeName={storeName}
          clientName={store.clientName}
          storeSlug={store.slug}
          categories={[]}
        />
      )}
    </div>
  );
}
