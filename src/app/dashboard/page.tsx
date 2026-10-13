"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { RecentStoresTable } from "@/components/dashboard/RecentStoresTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { EmptyState } from "@/components/ui/EmptyState";
import { MOCK_METRICS, MOCK_ACTIVITIES } from "@/mock";
import { Store } from "@/types";

export default function DashboardPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [showEmptyState, setShowEmptyState] = useState(false);

  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch("/api/stores");
        if (res.ok) {
          const data = await res.json();
          setStores(data.stores || []);
        }
      } catch (err) {
        console.error("Failed to load stores on dashboard:", err);
      }
    }
    loadStores();
  }, []);

  const dynamicMetrics = {
    ...MOCK_METRICS,
    totalStores: stores.length,
    inProgress: stores.filter((s) => s.status === "In Progress" || s.status === "Draft").length,
    published: stores.filter((s) => s.status === "Published").length,
    pendingReview: stores.filter((s) => s.status === "Pending Review").length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title="Store Workspace"
        description="Generate, configure, and manage high-converting e-commerce demo storefronts tailored for client pitch meetings."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            Live Workspace
          </span>
        }
      >
        {/* State Toggle for reviewing empty state design */}
        <Button
          variant="outline"
          size="md"
          onClick={() => setShowEmptyState(!showEmptyState)}
          leftIcon={<SlidersHorizontal className="h-4 w-4 text-[#66736C]" />}
        >
          {showEmptyState ? "Show Populated Workspace" : "Preview Empty State"}
        </Button>

        {/* Primary CTA linked to the Wizard */}
        <Link href="/stores/new">
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusCircle className="h-4 w-4" />}
          >
            Create New Store
          </Button>
        </Link>
      </PageHeader>

      {showEmptyState ? (
        /* Empty State View */
        <EmptyState
          title="No storefronts created yet"
          description="Your workspace is fresh. Start by creating a customized client store demo or explore our curated retail templates."
          actionLabel="Create New Store"
          onAction={() => setShowEmptyState(false)}
          secondaryActionLabel="Restore Workspace Data"
          onSecondaryAction={() => setShowEmptyState(false)}
        />
      ) : (
        /* Standard Populated View */
        <>
          {/* KPI Cards Row */}
          <section aria-label="Key Performance Indicators">
            <MetricCards metrics={dynamicMetrics} />
          </section>

          {/* Main Content Grid: Tables & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            {/* Left 2 Cols: Recent Stores Table */}
            <div className="lg:col-span-2 space-y-6">
              <RecentStoresTable stores={stores} />
            </div>

            {/* Right Col: Quick Actions & Recent Activity Feed */}
            <div className="space-y-6">
              <QuickActions />
              <RecentActivityFeed activities={MOCK_ACTIVITIES} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
