"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  ShoppingBag,
  Send,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  user?: {
    name: string;
    avatarInitial: string;
  };
  targetName?: string;
  targetId?: string;
  read?: boolean;
}

const DEFAULT_ACTIVITIES: ActivityFeedItem[] = [
  {
    id: "act_01",
    type: "store_published",
    title: "Storefront Deployed to Live Preview",
    description: "Aura Minimalist Living preview deployed to internal CDN",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    relativeTime: "45 minutes ago",
    user: { name: "Alex Mercer", avatarInitial: "A" },
    targetName: "Aura Minimalist Living",
    targetId: "str_01",
    read: false,
  },
  {
    id: "act_02",
    type: "appointment_booked",
    title: "New Consultation Booked",
    description: "Marcus Vance reserved Strategic IP Review with Summit Legal Practice",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    relativeTime: "2 hours ago",
    user: { name: "Client Self-Serve", avatarInitial: "C" },
    targetName: "Summit Legal Practice",
    targetId: "str_07",
    read: false,
  },
  {
    id: "act_03",
    type: "lead_received",
    title: "Lead Generation Inquiry Received",
    description: "Inquiry from Enterprise SaaS prospect received on Apex Growth Advisory",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    relativeTime: "5 hours ago",
    user: { name: "Lead Capture", avatarInitial: "L" },
    targetName: "Apex Growth Advisory",
    targetId: "str_08",
    read: true,
  },
  {
    id: "act_04",
    type: "store_updated",
    title: "Store Configuration Updated",
    description: "Updated typography tokens and audio showcase sections for Volt Audio Dynamics",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    relativeTime: "Yesterday",
    user: { name: "Sarah Chen", avatarInitial: "S" },
    targetName: "Volt Audio Dynamics",
    targetId: "str_02",
    read: true,
  },
  {
    id: "act_05",
    type: "template_assigned",
    title: "Design Template Paired",
    description: "Warm Organic design template paired with Botanica Apothecary",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    relativeTime: "2 days ago",
    user: { name: "Alex Mercer", avatarInitial: "A" },
    targetName: "Botanica Apothecary",
    targetId: "str_03",
    read: true,
  },
];

interface ActivityDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityDrawerModal({ isOpen, onClose }: ActivityDrawerModalProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>(DEFAULT_ACTIVITIES);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "stores" | "leads" | "appointments">("all");
  const [dismissedUntil, setDismissedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("gridretail_activities_dismissed_until");
      if (stored) setDismissedUntil(stored);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadActivities();
    }
  }, [isOpen]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/activities?limit=20");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setActivities(json.data);
        }
      }
    } catch {
      // Keep DEFAULT_ACTIVITIES
    } finally {
      setIsLoading(false);
    }
  };

  const markAllRead = () => {
    setActivities((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const handleClearActivityView = () => {
    const now = new Date().toISOString();
    if (typeof window !== "undefined") {
      localStorage.setItem("gridretail_activities_dismissed_until", now);
    }
    setDismissedUntil(now);
  };

  const handleRestoreActivityView = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gridretail_activities_dismissed_until");
    }
    setDismissedUntil(null);
  };

  const visibleActivities = activities.filter((act) => {
    if (dismissedUntil) {
      const actTime = new Date(act.timestamp).getTime();
      const cursorTime = new Date(dismissedUntil).getTime();
      if (!isNaN(actTime) && !isNaN(cursorTime) && actTime <= cursorTime) {
        return false;
      }
    }
    return true;
  });

  const filtered = visibleActivities.filter((act) => {
    if (filter === "stores") return act.type.includes("store");
    if (filter === "leads") return act.type.includes("lead");
    if (filter === "appointments") return act.type.includes("appointment");
    return true;
  });

  const getIcon = (type: string) => {
    if (type.includes("store")) return ShoppingBag;
    if (type.includes("appointment")) return Calendar;
    if (type.includes("lead")) return Send;
    return Activity;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Platform Activity & Audit Feed"
      description="Live audit record of generated stores, deployments, and client interactions"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark All Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearActivityView}
              className="text-stone-600 hover:text-stone-900"
            >
              Clear View
            </Button>
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Dismissed banner */}
        {dismissedUntil ? (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span>Browser-Scoped Filter Active</span>
              <button
                type="button"
                onClick={handleRestoreActivityView}
                className="font-bold underline hover:text-amber-950 ml-2 cursor-pointer"
              >
                Restore All ({activities.length} total)
              </button>
            </div>
            <p className="text-[11px] text-amber-700 leading-normal">
              Events prior to {new Date(dismissedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} are hidden from this browser session. All underlying audit log entries remain immutably preserved in the database.
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-stone-500 italic">
            Audit logs are immutable. Clearing this view filters events for your local session without deleting database audit records.
          </p>
        )}

        {/* Filters and Refresh */}
        <div className="flex items-center justify-between gap-2 border-b border-[#F0F4F1] pb-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-[#176B4D] text-white"
                  : "bg-[#FAF9F6] text-[#66736C] hover:text-[#18231E]"
              }`}
            >
              All Events ({visibleActivities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("stores")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === "stores"
                  ? "bg-[#176B4D] text-white"
                  : "bg-[#FAF9F6] text-[#66736C] hover:text-[#18231E]"
              }`}
            >
              Stores
            </button>
            <button
              type="button"
              onClick={() => setFilter("appointments")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === "appointments"
                  ? "bg-[#176B4D] text-white"
                  : "bg-[#FAF9F6] text-[#66736C] hover:text-[#18231E]"
              }`}
            >
              Appointments
            </button>
            <button
              type="button"
              onClick={() => setFilter("leads")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === "leads"
                  ? "bg-[#176B4D] text-white"
                  : "bg-[#FAF9F6] text-[#66736C] hover:text-[#18231E]"
              }`}
            >
              Leads
            </button>
          </div>

          <button
            type="button"
            onClick={loadActivities}
            className="p-1.5 rounded-lg text-[#66736C] hover:text-[#18231E] hover:bg-[#FAF9F6]"
            title="Refresh feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-[#176B4D]" : ""}`} />
          </button>
        </div>

        {/* Activity Items List */}
        <div className="divide-y divide-[#F0F4F1] max-h-96 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#66736C]">
              No activity records matching this filter.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = getIcon(item.type);
              return (
                <div key={item.id} className="py-3 flex items-start gap-3 text-xs group">
                  <div className="h-8 w-8 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] text-[#176B4D] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#18231E]">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#909D96] shrink-0 font-mono">
                        {item.relativeTime}
                      </span>
                    </div>
                    <p className="text-[#66736C] text-[11px] mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#909D96]">
                      {item.user && (
                        <span>Initiated by <strong>{item.user.name}</strong></span>
                      )}
                      {item.targetName && (
                        <>
                          <span>•</span>
                          <span className="text-[#176B4D] font-medium">{item.targetName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
