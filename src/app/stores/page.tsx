"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Store as StoreIcon,
  Eye,
  RefreshCw,
  Globe,
  Calendar as CalendarIcon,
  Send,
  Trash2,
  Archive,
  ArchiveRestore,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { getStoreLocalSubdomainUrl } from "@/lib/urls";
import { MOCK_STORES } from "@/mock";
import { Store } from "@/types";
import {
  getWebsiteTypeLabel,
  getWebsiteTypeBadgeClass,
  getWebsiteTypeFilterOptions,
  normalizeWebsiteType,
} from "@/utils/store-types";

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>(MOCK_STORES);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [industryFilter, setIndustryFilter] = useState<string>("ALL");
  const [websiteTypeFilter, setWebsiteTypeFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Store Lifecycle Action Modals
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [storeToArchive, setStoreToArchive] = useState<Store | null>(null);
  const [storeToUnpublish, setStoreToUnpublish] = useState<Store | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStores() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/stores");
        if (res.ok) {
          const data = await res.json();
          if (data.stores?.length > 0) {
            setStores(data.stores);
          }
        }
      } catch (err) {
        console.error("Failed to fetch stores:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStores();
  }, []);

  const statusOptions = [
    { value: "ALL", label: "Active Stores" },
    { value: "Published", label: "Published" },
    { value: "In Progress", label: "In Progress" },
    { value: "Pending Review", label: "Pending Review" },
    { value: "Draft", label: "Draft" },
    { value: "Archived", label: "Archived" },
  ];

  const industryOptions = [
    { value: "ALL", label: "All Industries" },
    { value: "Home & Living", label: "Home & Living" },
    { value: "Electronics & Gadgets", label: "Electronics & Gadgets" },
    { value: "Beauty & Cosmetics", label: "Beauty & Cosmetics" },
    { value: "Fashion & Apparel", label: "Fashion & Apparel" },
    { value: "Food & Gourmet", label: "Food & Gourmet" },
    { value: "Health & Wellness", label: "Health & Wellness" },
    { value: "Luxury Goods", label: "Luxury Goods" },
    { value: "Sports & Outdoors", label: "Sports & Outdoors" },
    { value: "Legal & Advisory", label: "Legal & Advisory" },
    { value: "Professional Services", label: "Professional Services" },
  ];

  const websiteTypeOptions = getWebsiteTypeFilterOptions();

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch =
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.templateName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL"
          ? store.status !== "Archived"
          : store.status === statusFilter;

      const matchesIndustry =
        industryFilter === "ALL" ||
        store.industry === industryFilter ||
        (industryFilter === "Legal & Advisory" &&
          (store.industry === "Legal & Advisory" ||
            store.appointmentIndustry?.includes("Legal") ||
            store.industry?.includes("Legal"))) ||
        (industryFilter === "Professional Services" &&
          (store.industry === "Professional Services" ||
            store.appointmentIndustry?.includes("Services") ||
            store.appointmentIndustry?.includes("Consulting") ||
            store.industry?.includes("Services")));

      const matchesType =
        websiteTypeFilter === "ALL" ||
        normalizeWebsiteType(store.websiteType) === websiteTypeFilter;

      return matchesSearch && matchesStatus && matchesIndustry && matchesType;
    });
  }, [stores, searchQuery, statusFilter, industryFilter, websiteTypeFilter]);

  // Actions
  const confirmDelete = async () => {
    if (!storeToDelete) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/stores/${storeToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete store");
      }
      setStores((prev) => prev.filter((s) => s.id !== storeToDelete.id));
      setStoreToDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete store");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmArchive = async () => {
    if (!storeToArchive) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const newStatus = storeToArchive.status === "Archived" ? "Draft" : "Archived";
      const res = await fetch(`/api/stores/${storeToArchive.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update store status");
      }
      setStores((prev) =>
        prev.map((s) => (s.id === storeToArchive.id ? { ...s, status: newStatus } : s))
      );
      setStoreToArchive(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update store");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmUnpublish = async () => {
    if (!storeToUnpublish) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/stores/${storeToUnpublish.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Draft" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to unpublish store");
      }
      setStores((prev) =>
        prev.map((s) => (s.id === storeToUnpublish.id ? { ...s, status: "Draft" } : s))
      );
      setStoreToUnpublish(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to unpublish store");
    } finally {
      setActionLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setIndustryFilter("ALL");
    setWebsiteTypeFilter("ALL");
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

          <FilterSelect
            label="Type"
            options={websiteTypeOptions}
            value={websiteTypeFilter}
            onChange={(e) => setWebsiteTypeFilter(e.target.value)}
          />

          {(searchQuery || statusFilter !== "ALL" || industryFilter !== "ALL" || websiteTypeFilter !== "ALL") && (
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
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-[#66736C]">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#176B4D]" />
            Loading storefront projects...
          </CardContent>
        </Card>
      ) : filteredStores.length === 0 ? (
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
              <table className="w-full text-left border-collapse text-sm min-w-[960px]">
                <thead>
                  <tr className="border-b border-[#F0F4F1] bg-[#FAF9F6] text-[11px] font-semibold text-[#66736C] uppercase tracking-wider">
                    <th className="px-6 py-3.5 min-w-[260px]">Store Details</th>
                    <th className="px-6 py-3.5 min-w-[180px]">Client & Industry</th>
                    <th className="px-6 py-3.5 min-w-[140px]">Template</th>
                    <th className="px-6 py-3.5 min-w-[130px] whitespace-nowrap">Products / Focus</th>
                    <th className="px-6 py-3.5 min-w-[120px] whitespace-nowrap">Status</th>
                    <th className="px-6 py-3.5 min-w-[130px] whitespace-nowrap">Last Updated</th>
                    <th className="px-6 py-3.5 text-right min-w-[160px] whitespace-nowrap">Actions</th>
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
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-[#18231E] truncate group-hover:text-[#176B4D] transition-colors">
                                {store.name}
                              </p>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getWebsiteTypeBadgeClass(
                                  store.websiteType
                                )}`}
                              >
                                {getWebsiteTypeLabel(store.websiteType)}
                              </span>
                            </div>
                            <a
                              href={getStoreLocalSubdomainUrl(store.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[#176B4D] hover:underline font-mono truncate block"
                              title="Open local store subdomain in new tab"
                            >
                              http://{store.slug}.localhost:3000
                            </a>
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
                        {normalizeWebsiteType(store.websiteType) === "appointments"
                          ? "Services & Slots"
                          : normalizeWebsiteType(store.websiteType) === "lead_gen"
                          ? "Forms & Leads"
                          : `${store.productCount || 0} SKUs`}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={store.status} size="sm" />
                      </td>

                      <td className="px-6 py-4 text-xs text-[#66736C] whitespace-nowrap">
                        {new Date(store.lastUpdated).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {normalizeWebsiteType(store.websiteType) === "appointments" && (
                            <Link href={`/stores/${store.id}/schedule`}>
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<CalendarIcon className="h-3.5 w-3.5 text-emerald-600" />}
                                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              >
                                Schedule
                              </Button>
                            </Link>
                          )}
                          {normalizeWebsiteType(store.websiteType) === "lead_gen" && (
                            <Link href={`/stores/${store.id}/leads`}>
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Send className="h-3.5 w-3.5 text-purple-600" />}
                                className="text-purple-700 border-purple-200 hover:bg-purple-50"
                              >
                                Leads
                              </Button>
                            </Link>
                          )}
                          <a
                            href={getStoreLocalSubdomainUrl(store.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Globe className="h-3.5 w-3.5 text-[#176B4D]" />}
                              title="Open local subdomain in new tab"
                            >
                              Subdomain
                            </Button>
                          </a>
                          <Link href={`/stores/${store.id}/preview`}>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                            >
                              Live Preview
                            </Button>
                          </Link>

                          {/* Unpublish Action for Published stores */}
                          {store.status === "Published" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStoreToUnpublish(store)}
                              leftIcon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
                              className="text-amber-700 hover:bg-amber-50"
                              title="Unpublish storefront to draft"
                            >
                              Unpublish
                            </Button>
                          )}

                          {/* Archive / Restore Action */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStoreToArchive(store)}
                            leftIcon={
                              store.status === "Archived" ? (
                                <ArchiveRestore className="h-3.5 w-3.5 text-blue-600" />
                              ) : (
                                <Archive className="h-3.5 w-3.5 text-stone-600" />
                              )
                            }
                            className={
                              store.status === "Archived"
                                ? "text-blue-700 hover:bg-blue-50"
                                : "text-stone-600 hover:bg-stone-100"
                            }
                            title={store.status === "Archived" ? "Restore to active drafts" : "Archive store"}
                          >
                            {store.status === "Archived" ? "Restore" : "Archive"}
                          </Button>

                          {/* Delete Store Action */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStoreToDelete(store)}
                            leftIcon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                            className="text-red-600 hover:bg-red-50"
                            title="Delete store permanently"
                          >
                            Delete
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

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div
          data-testid="delete-store-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-stone-900">Delete Storefront Project</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong>{storeToDelete.name}</strong>?
                  This will remove the store configuration, sections, and associated staging records. This operation cannot be undone.
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStoreToDelete(null);
                  setActionError(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmDelete}
                isLoading={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive / Restore Confirmation Modal */}
      {storeToArchive && (
        <div
          data-testid="archive-store-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Archive className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-stone-900">
                  {storeToArchive.status === "Archived" ? "Restore Storefront" : "Archive Storefront"}
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {storeToArchive.status === "Archived"
                    ? `Restore "${storeToArchive.name}" back to active workspace drafts? It will reappear in the default active stores directory.`
                    : `Archive "${storeToArchive.name}"? It will be excluded from the active workspace directory, but its data, sections, and history will be fully preserved.`}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStoreToArchive(null);
                  setActionError(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmArchive}
                isLoading={actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {storeToArchive.status === "Archived" ? "Restore Store" : "Archive Store"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Confirmation Modal */}
      {storeToUnpublish && (
        <div
          data-testid="unpublish-store-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-stone-900">Unpublish Storefront</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Transition <strong>{storeToUnpublish.name}</strong> back to Draft status? Public visitors will see an unpublished draft placeholder until it is republished.
                </p>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStoreToUnpublish(null);
                  setActionError(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmUnpublish}
                isLoading={actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Unpublish Store
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
