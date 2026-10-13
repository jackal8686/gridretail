"use client";

import React, { useState } from "react";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { RecentStoresTable } from "@/components/dashboard/RecentStoresTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaceholderModal } from "@/components/shared/PlaceholderModal";
import { MOCK_METRICS, MOCK_STORES, MOCK_ACTIVITIES } from "@/mock";

export default function DashboardPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);

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

        {/* Primary CTA */}
        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          Create New Store
        </Button>
      </PageHeader>

      {showEmptyState ? (
        /* Empty State View */
        <EmptyState
          title="No storefronts created yet"
          description="Your workspace is fresh. Start by creating a customized client store demo or explore our curated retail templates."
          actionLabel="Create New Store"
          onAction={() => setCreateModalOpen(true)}
          secondaryActionLabel="Restore Sample Data"
          onSecondaryAction={() => setShowEmptyState(false)}
        />
      ) : (
        /* Standard Populated View */
        <>
          {/* KPI Cards Row */}
          <section aria-label="Key Performance Indicators">
            <MetricCards metrics={MOCK_METRICS} />
          </section>

          {/* Main Content Grid: Tables & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            {/* Left 2 Cols: Recent Stores Table */}
            <div className="lg:col-span-2 space-y-6">
              <RecentStoresTable stores={MOCK_STORES} />
            </div>

            {/* Right Col: Quick Actions & Recent Activity Feed */}
            <div className="space-y-6">
              <QuickActions />
              <RecentActivityFeed activities={MOCK_ACTIVITIES} />
            </div>
          </div>
        </>
      )}

      {/* Modal explaining upcoming Phase 2 wizard */}
      <PlaceholderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        featureName="Create New Store Wizard"
        description="The multi-step Store Generation Engine (industry selection, catalog importer, design customizer, and demo preview generation) is being built for Phase 2."
      />
    </div>
  );
}
