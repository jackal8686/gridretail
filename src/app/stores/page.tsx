"use client";

import React, { useState, useMemo } from "react";
import { PlusCircle, Store as StoreIcon, Eye, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { PlaceholderModal } from "@/components/shared/PlaceholderModal";
import { MOCK_STORES } from "@/mock";
import { Store } from "@/types";

export default function StoresPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [industryFilter, setIndustryFilter] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  const statusOptions = [
    { value: "ALL", label: "All Statuses" },
    { value: "Published", label: "Published" },
    { value: "In Progress", label: "In Progress" },
    { value: "Pending Review", label: "Pending Review" },
    { value: "Draft", label: "Draft" },
  ];

  const industryOptions = [
    { value: "ALL", label: "All Industries" },
    { value: "Home & Living", label: "Home & Living" },
    { value: "Electronics & Gadgets", label: "Electronics & Gadgets" },
    { value: "Beauty & Cosmetics", label: "Beauty & Cosmetics" },
    { value: "Fashion & Apparel", label: "Fashion & Apparel" },
    { value: "Food & Gourmet", label: "Food & Gourmet" },
    { value: "Sports & Outdoors", label: "Sports & Outdoors" },
  ];

  const filteredStores = useMemo(() => {
    return MOCK_STORES.filter((store) => {
      const matchesSearch =
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.templateName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || store.status === statusFilter;

      const matchesIndustry =
        industryFilter === "ALL" || store.industry === industryFilter;

      return matchesSearch && matchesStatus && matchesIndustry;
    });
  }, [searchQuery, statusFilter, industryFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setIndustryFilter("ALL");
  };

  const handleInspect = (store: Store) => {
    setSelectedStore(store);
    setInspectModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Store Management"
        description="Oversee and configure personalized client demo storefronts, manage preview URLs, and review generation statuses."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            {filteredStores.length} {filteredStores.length === 1 ? "Store" : "Stores"}
          </span>
        }
      >
        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          Create New Store
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9E5]">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Search by store name, client, or template..."
          wrapperClassName="max-w-md w-full"
        />

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />

          <FilterSelect
            label="Industry"
            options={industryOptions}
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          />

          {(searchQuery || statusFilter !== "ALL" || industryFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Stores List / Table */}
      {filteredStores.length === 0 ? (
        <EmptyState
          title="No storefronts match your filters"
          description="Try broadening your search criteria or resetting applied status and industry filters."
          actionLabel="Clear All Filters"
          onAction={resetFilters}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#F0F4F1] bg-[#FAF9F6] text-[11px] font-semibold text-[#66736C] uppercase tracking-wider">
                    <th className="px-6 py-3.5">Store Details</th>
                    <th className="px-6 py-3.5">Client & Industry</th>
                    <th className="px-6 py-3.5">Template</th>
                    <th className="px-6 py-3.5">Products</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Last Updated</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F1]">
                  {filteredStores.map((store) => (
                    <tr
                      key={store.id}
                      className="hover:bg-[#FAF9F6]/60 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] text-[#176B4D] flex items-center justify-center shrink-0">
                            <StoreIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#18231E] truncate group-hover:text-[#176B4D] transition-colors">
                              {store.name}
                            </p>
                            <p className="text-xs text-[#66736C] truncate font-mono">
                              /{store.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-medium text-[#18231E]">{store.clientName}</p>
                        <p className="text-xs text-[#66736C]">{store.industry}</p>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-[#18231E]">
                        {store.templateName}
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-[#4F5D56]">
                        {store.productCount} SKUs
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={store.status} size="sm" />
                      </td>

                      <td className="px-6 py-4 text-xs text-[#66736C]">
                        {new Date(store.lastUpdated).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspect(store)}
                            leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                          >
                            Inspect
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Dialogs */}
      <PlaceholderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        featureName="Create Store Wizard"
        description="Store creation workflow will allow selecting a template, importing product data, and setting branding."
      />

      {selectedStore && (
        <PlaceholderModal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          featureName={`Store Inspector: ${selectedStore.name}`}
          targetPhase="Phase 2 (Store Engine & Live Preview)"
          description={`Slug: /${selectedStore.slug} | Client: ${selectedStore.clientName} | Template: ${selectedStore.templateName}. Full interactive live preview and client sharing controls will be enabled in Phase 2.`}
        />
      )}
    </div>
  );
}
