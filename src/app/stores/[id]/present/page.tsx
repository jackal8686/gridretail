"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  X,
  StickyNote,
  Maximize2,
  Minimize2,
  Package,
  Share2,
  ArrowRight,
  ShoppingBag,
  Truck,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Calendar,
  Clock,
  ShieldCheck,
  Award,
  Briefcase,
  UserCheck,
  FileText,
} from "lucide-react";
import { Store, Template, Product } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeliveryModal } from "@/components/shared/DeliveryModal";
import { ShareModal } from "@/components/shared/ShareModal";
import { cn } from "@/utils/cn";
import { formatINR } from "@/utils/currency";

const TOTAL_SLIDES = 6;

export default function ClientPresentationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Presentation State
  const [currentSlide, setCurrentSlide] = useState(1);
  const [showNotes, setShowNotes] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Modals
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Load Store Data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/stores/${id}`);
        if (!res.ok) throw new Error("Store not found");
        const data = await res.json();
        const s: Store = data.store;
        setStore(s);

        // Fetch template and products concurrently
        const [tRes, pRes] = await Promise.all([
          s.templateId ? fetch(`/api/templates`) : Promise.resolve(null),
          fetch(`/api/products?limit=6`),
        ]);

        if (tRes && tRes.ok) {
          const tData = await tRes.json();
          const foundT = (tData.templates || []).find((t: Template) => t.id === s.templateId);
          if (foundT) setTemplate(foundT);
        }

        if (pRes && pRes.ok) {
          const pData = await pRes.json();
          setProducts(pData.products || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load store");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  // Keyboard Navigation
  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 1));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture inputs if typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        router.push(`/stores/${id}/preview`);
      } else if (e.key.toLowerCase() === "n") {
        setShowNotes((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [id, router, handleNext, handlePrev]);

  // Fullscreen toggle helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0F172A] text-white flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-8 w-8 border-3 border-emerald-400 border-t-transparent rounded-full" />
        <p className="text-sm font-medium tracking-wide text-slate-300">
          Preparing Client Presentation Deck...
        </p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="fixed inset-0 bg-[#0F172A] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-bold">Presentation Deck Unavailable</h2>
        <p className="text-slate-400 text-sm max-w-md">{error || "Could not resolve store"}</p>
        <Link
          href={`/stores/${id}/preview`}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors"
        >
          Return to Customizer
        </Link>
      </div>
    );
  }

  const isAppointments = store.websiteType === "appointments";
  const isLeadGen = (store.websiteType as string) === "lead_gen" || (store.websiteType as string) === "lead-generation";

  const branding = store.branding || {
    primaryColor: template?.colorPalette.primary || "#176B4D",
    secondaryColor: template?.colorPalette.secondary || "#FAF9F6",
    fontFamily: "Inter, sans-serif",
    heroHeadline: isAppointments
      ? `Executive Practice for ${store.name}`
      : isLeadGen
      ? `Strategic Client Solutions for ${store.name}`
      : `Welcome to ${store.name}`,
    heroSubheadline: isAppointments
      ? `Dedicated ${store.industry} consultation and professional advisory services.`
      : isLeadGen
      ? `High-impact ${store.industry} solutions designed for enterprise growth.`
      : `Curated ${store.industry} collection designed for modern living.`,
    aboutText: store.description,
    ctaText: isAppointments ? "Schedule Consultation" : isLeadGen ? "Request Proposal" : "Explore Catalog",
  };

  const slideTitles = isAppointments
    ? [
        "Executive Vision & Practice Positioning",
        "Curated Professional Services Directory",
        "Client Trust & Practice Blueprint",
        "Calendar Integration & Booking Workflow",
        "Live Interactive Practice Simulator",
        "Commercial Next Steps & Delivery",
      ]
    : isLeadGen
    ? [
        "Executive Vision & Market Strategy",
        "Inquiry Architecture & Capture Flow",
        "Enterprise Credibility & Governance",
        "Lead Pipeline Progression & Qualification",
        "Live Interactive Lead Portal Simulator",
        "Commercial Next Steps & Delivery",
      ]
    : [
        "Executive Vision & Brand Identity",
        "Curated E-Commerce Catalog",
        "Brand Narrative & Trust Signals",
        "Audience Engagement & Conversion",
        "Live Interactive Storefront Simulation",
        "Commercial Next Steps & Delivery",
      ];

  const presenterNotes: Record<number, string[]> = isAppointments
    ? {
        1: [
          `Introduce ${store.clientName} as the focal client for this tailored professional appointment practice.`,
          `Highlight how the chosen typography (${branding.fontFamily}) and primary palette (${branding.primaryColor}) elevate their executive standing.`,
          `Emphasize that the booking website was generated in under 3 minutes using GridRetail's generative engine.`,
        ],
        2: [
          `Walk through the structured professional services directory and fee structure.`,
          `Point out multi-practitioner assignment, automated buffer times, and service duration rules.`,
          `Explain that services and practitioner schedules can be customized through the operator schedule dashboard.`,
        ],
        3: [
          `Review the practice trust framework designed specifically for ${store.clientName}.`,
          `Emphasize client confidentiality, verified practitioner credentials, and seamless appointment management.`,
          `Explain how transparent booking policies increase conversion and eliminate scheduling friction.`,
        ],
        4: [
          `Highlight two-way calendar synchronization and automated booking confirmations.`,
          `Explain that confirmed bookings generate downloadable .ics calendar invites and email reminders.`,
          `Showcase self-service customer cancellation and rescheduling capabilities.`,
        ],
        5: [
          `Demonstrate real-time responsiveness by switching between Desktop, Tablet, and Mobile views.`,
          `Invite the client to click elements live or share the preview link for their executive team.`,
          `Highlight sub-second booking responsiveness and frictionless mobile usability.`,
        ],
        6: [
          `Summarize current proposal status: ${store.status}.`,
          `Offer to export the turnkey production archive (.zip) right now or share a secure client review link.`,
          `Close with next-step timeline: Instant handoff upon client approval.`,
        ],
      }
    : isLeadGen
    ? {
        1: [
          `Introduce ${store.clientName} as the focal client for this enterprise lead acquisition portal.`,
          `Highlight how the chosen typography (${branding.fontFamily}) and primary palette (${branding.primaryColor}) reinforce strategic credibility.`,
          `Emphasize that the lead generation portal was generated in under 3 minutes using GridRetail's generative engine.`,
        ],
        2: [
          `Walk through the high-conversion inquiry architecture and customizable intake fields.`,
          `Point out client qualification criteria, required project scope prompts, and anti-spam honeypot protection.`,
          `Explain that submitted inquiries instantly route to the operator CRM pipeline.`,
        ],
        3: [
          `Walk through enterprise credibility signals crafted specifically for ${store.clientName}.`,
          `Emphasize strict data privacy compliance, dedicated response SLAs, and custom scope alignment.`,
          `Demonstrate how high-trust conversion elements generate higher quality qualified inbound inquiries.`,
        ],
        4: [
          `Focus on real-time pipeline acceleration and automated lead scoring (0–100).`,
          `Explain that inbound leads advance through a 5-stage Kanban CRM (New, Contacted, Qualified, Proposal, Won).`,
          `Highlight CSV import/export capabilities and CRM integration readiness.`,
        ],
        5: [
          `Demonstrate real-time responsiveness by switching between Desktop, Tablet, and Mobile views.`,
          `Invite the client to test the live lead intake form and view submission routing.`,
          `Highlight frictionless form completion across all device sizes.`,
        ],
        6: [
          `Summarize current proposal status: ${store.status}.`,
          `Offer to export the turnkey production archive (.zip) right now or share a secure client review link.`,
          `Close with next-step timeline: Instant handoff upon client approval.`,
        ],
      }
    : {
        1: [
          `Introduce ${store.clientName} as the focal client for this tailored e-commerce deployment.`,
          `Highlight how the chosen typography (${branding.fontFamily}) and primary palette (${branding.primaryColor}) elevate their brand positioning.`,
          `Emphasize that the storefront was generated in under 3 minutes using GridRetail's generative engine.`,
        ],
        2: [
          `Showcase the ${products.length} curated demonstration catalog items.`,
          `Point out multi-currency support, clear price hierarchies, and high-conversion quick-add cards.`,
          `Mention that client inventory can be ingested via CSV, Shopify sync, or ERP REST API.`,
        ],
        3: [
          `Walk through the customized brand story written specifically for ${store.clientName}.`,
          `Emphasize consumer trust elements: Complimentary Courier Delivery, Verified Authenticity, and 30-Day Returns.`,
          `Demonstrate how trust signals reduce cart abandonment by an estimated 18-24%.`,
        ],
        4: [
          `Focus on long-term client audience retention via the Newsletter VIP subscriber channel.`,
          `Explain that client leads can flow directly into their CRM or marketing automation suite.`,
          `Note that custom promotional callouts can be tailored for seasonal sales and campaigns.`,
        ],
        5: [
          `Demonstrate real-time responsiveness by switching between Desktop, Tablet, and Mobile views.`,
          `Invite the client to click elements live or share the preview link for their executive team.`,
          `Highlight sub-second page performance and zero layout shifts.`,
        ],
        6: [
          `Summarize current proposal status: ${store.status}.`,
          `Offer to export the turnkey production archive (.zip) right now or share a secure client review link.`,
          `Close with next-step timeline: Instant handoff upon client approval.`,
        ],
      };

  return (
    <div className="fixed inset-0 bg-[#0B1120] text-slate-100 flex flex-col select-none overflow-hidden font-sans">
      {/* Top Presentation Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between z-40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href={`/stores/${id}/preview`}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            title="Exit Presentation (Esc)"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Exit</span>
          </Link>

          <div className="h-4 w-px bg-slate-700" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">{store.name}</span>
              <span className="text-[11px] text-slate-400">&bull; Pitch for {store.clientName}</span>
              <StatusBadge status={store.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Center Progress & Slide Title */}
        <div className="hidden md:flex flex-col items-center">
          <span className="text-xs font-semibold text-slate-200">
            Slide {currentSlide} of {TOTAL_SLIDES}: {slideTitles[currentSlide - 1]}
          </span>
          <div className="w-48 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${(currentSlide / TOTAL_SLIDES) * 100}%` }}
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              showNotes ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
            title="Toggle Presenter Notes (N)"
          >
            <StickyNote className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notes</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 1}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlide === TOTAL_SLIDES}
            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next Slide (Right Arrow / Space)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Slide Workspace + Presenter Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide Stage */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
          {/* SLIDE 1: Executive Vision */}
          {currentSlide === 1 && (
            <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Executive Storefront Proposal</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                  {branding.heroHeadline || `Bespoke E-Commerce for ${store.clientName}`}
                </h1>
                <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  {branding.heroSubheadline ||
                    `Tailored demonstration storefront engineered to reflect ${store.clientName}'s heritage and market potential.`}
                </p>
              </div>

              {/* Identity Highlights Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-2xl mx-auto">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Target Industry
                  </span>
                  <span className="text-sm font-bold text-white mt-1 block">{store.industry}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Primary Accent
                  </span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: branding.primaryColor }}
                    />
                    <span className="text-sm font-bold text-white font-mono">{branding.primaryColor}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Architectural Style
                  </span>
                  <span className="text-sm font-bold text-white mt-1 block">
                    {template?.style || "Contemporary"}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-emerald-500/20 inline-flex items-center gap-2"
                >
                  <span>
                    {isAppointments
                      ? "Explore Service Portfolio"
                      : isLeadGen
                      ? "Explore Inquiry Pipeline"
                      : "Explore Curated Catalog"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* SLIDE 2: Catalog / Services / Forms Architecture */}
          {currentSlide === 2 && (
            <div className="max-w-5xl w-full space-y-6 animate-in fade-in duration-200">
              <div className="flex items-end justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    {isAppointments
                      ? "Practice Offerings"
                      : isLeadGen
                      ? "Lead Intake Architecture"
                      : "Product Architecture"}
                  </span>
                  <h2 className="text-3xl font-extrabold text-white mt-1">
                    {isAppointments
                      ? "Curated Professional Services"
                      : isLeadGen
                      ? "High-Conversion Inquiry Capture"
                      : "Curated Demonstration Catalog"}
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  {isAppointments
                    ? "Multi-Provider Booking Ready"
                    : isLeadGen
                    ? "Automated Pipeline Integration"
                    : `${products.length} Active High-Resolution Pieces`}
                </span>
              </div>

              {isAppointments ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <div className="h-28 rounded-xl bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center text-emerald-400 mb-3">
                        <Briefcase className="h-10 w-10" />
                      </div>
                      <h3 className="font-bold text-base text-white">Initial Consultation</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Comprehensive discovery session, requirements intake, and preliminary advisory roadmap.
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> 45 Mins
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold">
                        Video / Office
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <div className="h-28 rounded-xl bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400 mb-3">
                        <Calendar className="h-10 w-10" />
                      </div>
                      <h3 className="font-bold text-base text-white">Strategic Advisory Session</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        In-depth operational audit, risk evaluation, and customized executive brief delivery.
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> 60 Mins
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-semibold">
                        Senior Partner
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <div className="h-28 rounded-xl bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-purple-400 mb-3">
                        <Award className="h-10 w-10" />
                      </div>
                      <h3 className="font-bold text-base text-white">Retainer Strategy Review</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Quarterly compliance checkpoint, progress review, and multi-team governance alignment.
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> 90 Mins
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 font-semibold">
                        Executive Board
                      </span>
                    </div>
                  </div>
                </div>
              ) : isLeadGen ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <div className="h-28 rounded-xl bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center text-emerald-400 mb-3">
                        <FileText className="h-10 w-10" />
                      </div>
                      <h3 className="font-bold text-base text-white">Custom Intake Capture</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Tailored business inquiries collecting corporate contact, service interest, and project requirements.
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                      <span>Smart Validation</span>
                      <span>Honeypot Protected</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <div className="h-28 rounded-xl bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400 mb-3">
                        <Award className="h-10 w-10" />
                      </div>
                      <h3 className="font-bold text-base text-white">Automated Lead Scoring</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Immediate scoring algorithm evaluates inquiry completeness, timeline urgency, and budget criteria (0–100).
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-blue-400 font-semibold">
                      <span>Real-Time Scoring</span>
                      <span>Priority Routing</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                    <div>
                      <div className="h-28 rounded-xl bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-purple-400 mb-3">
                        <UserCheck className="h-10 w-10" />
                      </div>
                      <h3 className="font-bold text-base text-white">5-Stage CRM Pipeline</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Inquiries advance through Kanban stages with notes, task reminders, and RFC-4180 CSV export.
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-purple-400 font-semibold">
                      <span>Pipeline Kanban</span>
                      <span>CSV Export Ready</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div
                          className={cn(
                            "h-36 rounded-xl flex items-center justify-center font-bold text-xl tracking-wider text-slate-800 relative overflow-hidden mb-3",
                            prod.thumbnailColor
                          )}
                        >
                          <span>{prod.name.slice(0, 2).toUpperCase()}</span>
                          <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-white">
                            {prod.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-white">{prod.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-base font-extrabold text-white">
                          {formatINR(prod.price)}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3" />
                          <span>Available</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SLIDE 3: Brand Narrative & Trust */}
          {currentSlide === 3 && (
            <div className="max-w-4xl w-full text-center space-y-8 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {isAppointments ? "Practice Trust Framework" : isLeadGen ? "Enterprise Credibility" : "Heritage & Trust Blueprint"}
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Designed for {store.clientName}
              </h2>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {branding.aboutText ||
                  store.description ||
                  `Every element of this custom showcase is aligned with ${store.clientName}'s strategic brand values, audience expectations, and operational ambitions.`}
              </p>

              {/* Trust Indicators Showcase */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-left">
                {isAppointments ? (
                  <>
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Confidential Advisory</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Strict practitioner confidentiality protocols and encrypted communication channels.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Award className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Verified Credentials</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Accredited senior practitioners with proven track records in commercial advisory.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Clock className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Flexible Scheduling</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Frictionless online booking, self-service adjustments, and automated calendar conflict mitigation.
                      </p>
                    </div>
                  </>
                ) : isLeadGen ? (
                  <>
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Data Governance &amp; Privacy</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Enterprise-grade data handling compliant with strict organizational security requirements.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Clock className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Dedicated Response SLA</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Automated routing ensures every inbound commercial inquiry receives leadership review within 1 business day.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Tailored Scope Discovery</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Context-rich intake questions ensure client discovery begins with structured requirements already in hand.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <Truck className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Courier Logistics</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Complimentary white-glove shipping on domestic retail orders.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Authenticity Guarantee</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Direct provenance certificate accompanying every purchase.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <RotateCcw className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-sm text-white">Effortless Returns</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Seamless 30-day return policy for peace of mind.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 4: Audience Capture / Booking Sync / CRM Acceleration */}
          {currentSlide === 4 && (
            <div className="max-w-2xl w-full text-center space-y-6 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {isAppointments
                  ? "Practice Automation"
                  : isLeadGen
                  ? "Pipeline Acceleration"
                  : "Audience Retention & Conversion"}
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                {isAppointments
                  ? "Two-Way Calendar Synchronization"
                  : isLeadGen
                  ? "Real-Time Pipeline Progression"
                  : "VIP Subscriber Acquisition"}
              </h2>

              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                {isAppointments
                  ? "Prevent missed consultations with automated ICS calendar invites, booking receipts, and timely reminder notifications."
                  : isLeadGen
                  ? "Transform qualified inbound website traffic into active commercial opportunities with automated stage routing."
                  : "Turn casual visitors into loyal repeat customers with an integrated newsletter channel."}
              </p>

              <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-white">
                  {isAppointments
                    ? "Automated Booking Confirmation"
                    : isLeadGen
                    ? "Lead Stage Management"
                    : "Exclusive Showroom Access"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAppointments
                    ? "Clients receive immediate booking reference codes, calendar attachments, and self-service cancellation links."
                    : isLeadGen
                    ? "Inquiries immediately trigger operator alerts and appear in the CRM pipeline with computed lead scores."
                    : "Subscribers receive private lookbook releases and priority product allocations."}
                </p>

                {isAppointments ? (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Google &amp; Outlook (.ics)
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Email &amp; SMS Alerts
                    </span>
                  </div>
                ) : isLeadGen ? (
                  <div className="flex items-center justify-center gap-2 pt-2 text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium">New</span>
                    <span className="text-slate-600">&rarr;</span>
                    <span className="px-2.5 py-1 rounded-md bg-blue-900/60 text-blue-300 font-medium">Contacted</span>
                    <span className="text-slate-600">&rarr;</span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-900/60 text-emerald-300 font-bold">Qualified</span>
                  </div>
                ) : (
                  <div className="flex gap-2 max-w-md mx-auto pt-2">
                    <input
                      type="email"
                      disabled
                      placeholder="client.executive@company.com"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-400"
                    />
                    <button
                      type="button"
                      disabled
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs whitespace-nowrap opacity-90"
                    >
                      Subscribe Demo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SLIDE 5: Live Interactive Storefront */}
          {currentSlide === 5 && (
            <div className="w-full max-w-6xl h-full flex flex-col space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Live Simulator
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Interactive Responsive Storefront
                  </h2>
                </div>

                {/* Viewport Presets */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                      previewDevice === "desktop"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("tablet")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                      previewDevice === "tablet"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Tablet className="h-3.5 w-3.5" />
                    <span>Tablet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors",
                      previewDevice === "mobile"
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {/* Viewport Container */}
              <div className="flex-1 bg-slate-900/60 rounded-2xl border border-slate-800 flex justify-center items-center overflow-hidden p-3 min-h-[460px]">
                <div
                  className={cn(
                    "h-full w-full bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300 border border-slate-700",
                    previewDevice === "desktop"
                      ? "max-w-full"
                      : previewDevice === "tablet"
                      ? "max-w-[768px]"
                      : "max-w-[375px]"
                  )}
                >
                  <iframe
                    src={`/store/${store.slug}`}
                    title={`${store.name} Live Demo`}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 6: Commercial Next Steps & Delivery */}
          {currentSlide === 6 && (
            <div className="max-w-3xl w-full text-center space-y-8 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Commercial Next Steps
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
                Ready for Client Handoff
              </h2>

              <p className="text-slate-300 text-base max-w-xl mx-auto">
                Review status is currently{" "}
                <strong className="text-white underline">{store.status}</strong>. Package the deliverables
                now or send the direct client preview link for final sign-off.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(true)}
                  className="p-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-102 cursor-pointer"
                >
                  <Package className="h-5 w-5" />
                  <span>Export Production (.zip)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-102 cursor-pointer"
                >
                  <Share2 className="h-5 w-5 text-emerald-400" />
                  <span>Share Preview Link</span>
                </button>
              </div>

              <div className="pt-6">
                <a
                  href={`/store/${store.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-emerald-400 underline inline-flex items-center gap-1"
                >
                  <span>Open standalone storefront tab</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </main>

        {/* Collapsible Presenter Notes Drawer */}
        {showNotes && (
          <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col h-full z-30 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                  Presenter Talking Points
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-slate-400 hover:text-white p-1"
                title="Hide Notes"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-300">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-300">
                <p className="font-semibold mb-1">Slide {currentSlide} Objective:</p>
                <p className="text-[11px] text-emerald-400 leading-relaxed">
                  {slideTitles[currentSlide - 1]}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-200 block mb-2 uppercase text-[10px] tracking-wider">
                  Recommended Discussion Points:
                </span>
                <ul className="space-y-2.5">
                  {(presenterNotes[currentSlide] || []).map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                <p>
                  <strong>Hotkeys:</strong> Next: <kbd className="px-1 bg-slate-800 rounded">Right</kbd> /{" "}
                  <kbd className="px-1 bg-slate-800 rounded">Space</kbd> | Prev:{" "}
                  <kbd className="px-1 bg-slate-800 rounded">Left</kbd> | Notes:{" "}
                  <kbd className="px-1 bg-slate-800 rounded">N</kbd> | Exit:{" "}
                  <kbd className="px-1 bg-slate-800 rounded">Esc</kbd>
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modals */}
      <DeliveryModal
        store={store}
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        storeId={store.id}
        storeName={store.name}
        clientName={store.clientName}
      />
    </div>
  );
}
