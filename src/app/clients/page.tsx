"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { UserPlus, Mail, Phone, Building2, Store, Clock, RefreshCw, Eye, Edit2, Trash2, X, AlertTriangle, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Client, Store as StoreType } from "@/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Form Modal State (Add / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formCompany, setFormCompany] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIndustry, setFormIndustry] = useState("Home & Living");
  const [formStatus, setFormStatus] = useState<"Active" | "Prospect" | "Archived">("Active");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Client Details Modal (with linked stores)
  const [inspectClient, setInspectClient] = useState<Client | null>(null);
  const [inspectStores, setInspectStores] = useState<StoreType[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Delete Client Modal
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusOptions = [
    { value: "ALL", label: "All Statuses" },
    { value: "Active", label: "Active" },
    { value: "Prospect", label: "Prospect" },
    { value: "Archived", label: "Archived" },
  ];

  const industryOptions = [
    "Fashion & Apparel",
    "Electronics & Gadgets",
    "Home & Living",
    "Beauty & Cosmetics",
    "Food & Gourmet",
    "Health & Wellness",
    "Sports & Outdoors",
    "Legal & Advisory",
    "Professional Services",
  ];

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to load clients:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.industry.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
  };

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setFormCompany("");
    setFormName("");
    setFormEmail("");
    setFormPhone("+1 (555) 234-5678");
    setFormIndustry("Home & Living");
    setFormStatus("Active");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setFormCompany(client.company);
    setFormName(client.name);
    setFormEmail(client.contactEmail);
    setFormPhone(client.contactPhone);
    setFormIndustry(client.industry);
    setFormStatus(client.status);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const companyTrimmed = formCompany.trim();
    if (!companyTrimmed) {
      setFormError("Company name is required.");
      setFormLoading(false);
      return;
    }

    try {
      if (editingClient) {
        // Edit existing client
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: companyTrimmed,
            name: formName.trim() || "Primary Lead",
            contactEmail: formEmail.trim(),
            contactPhone: formPhone.trim(),
            industry: formIndustry,
            status: formStatus,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update client");
        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? data.client : c))
        );
      } else {
        // Create new client
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: companyTrimmed,
            name: formName.trim() || "Primary Lead",
            contactEmail: formEmail.trim(),
            contactPhone: formPhone.trim(),
            industry: formIndustry,
            status: formStatus,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create client");
        setClients((prev) => [data.client, ...prev]);
      }
      setIsFormModalOpen(false);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to save client");
    } finally {
      setFormLoading(false);
    }
  };

  const handleInspect = async (client: Client) => {
    setInspectClient(client);
    setInspectLoading(true);
    setInspectStores([]);
    try {
      const res = await fetch(`/api/clients/${client.id}`);
      if (res.ok) {
        const data = await res.json();
        setInspectStores(data.stores || []);
      }
    } catch (err) {
      console.warn("Failed to fetch client stores:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleConfirmDelete = async (detachStores: boolean = false) => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const url = detachStores
        ? `/api/clients/${clientToDelete.id}?detachStores=true`
        : `/api/clients/${clientToDelete.id}`;
      const res = await fetch(url, {
        method: "DELETE",
      });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
        setClientToDelete(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete client");
      }
    } catch (err) {
      console.error("Failed to delete client:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveClient = async (clientId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}?action=archive`, {
        method: "DELETE",
      });
      if (res.ok) {
        await res.json();
        setClients((prev) =>
          prev.map((c) => (c.id === clientId ? { ...c, status: "Archived" } : c))
        );
        setClientToDelete(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to archive client");
      }
    } catch (err) {
      console.error("Failed to archive client:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Client Accounts"
        description="Manage enterprise client accounts, monitor demo stores associated with each client, and review assigned account managers."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            {filteredClients.length} {filteredClients.length === 1 ? "Client" : "Clients"}
          </span>
        }
      >
        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAddModal}
          leftIcon={<UserPlus className="h-4 w-4" />}
          className="bg-[#176B4D] text-white hover:bg-[#12533B]"
        >
          Add Client Account
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9E5]">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Search by client name, company, email, or industry..."
          wrapperClassName="max-w-md w-full"
        />

        <div className="flex items-center gap-2">
          <FilterSelect
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />

          {(searchQuery || statusFilter !== "ALL") && (
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

      {/* Client List / Cards */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-stone-500">
          Loading client accounts...
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="We couldn't find any client matching your search keywords or filter settings."
          actionLabel="Clear Filters"
          onAction={resetFilters}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#F0F4F1] bg-[#FAF9F6] text-[11px] font-semibold text-[#66736C] uppercase tracking-wider">
                    <th className="px-6 py-3.5">Company & Lead</th>
                    <th className="px-6 py-3.5">Safe Contact Data</th>
                    <th className="px-6 py-3.5">Industry</th>
                    <th className="px-6 py-3.5">Demo Stores</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Last Activity</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F1]">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-[#FAF9F6]/60 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] text-[#176B4D] flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#18231E] truncate group-hover:text-[#176B4D] transition-colors">
                              {client.company}
                            </p>
                            <p className="text-xs text-[#66736C] truncate">
                              Primary contact: {client.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[#4F5D56]">
                          <Mail className="h-3 w-3 text-[#66736C]" />
                          <span>{client.contactEmail}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#909D96]">
                          <Phone className="h-3 w-3 text-[#66736C]" />
                          <span>{client.contactPhone}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-[#4F5D56] bg-[#F0F4F1] px-2.5 py-1 rounded-md">
                          {client.industry}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-[#18231E]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E4E9E5]">
                          <Store className="h-3 w-3 text-[#176B4D]" />
                          <span>{client.storeCount}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={client.status} size="sm" />
                      </td>

                      <td className="px-6 py-4 text-xs text-[#66736C]">
                        <div className="flex items-center gap-1 text-[#66736C]">
                          <Clock className="h-3 w-3" />
                          <span>{client.lastActive}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspect(client)}
                            leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                            title="View client dossier and linked stores"
                          >
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(client)}
                            leftIcon={<Edit2 className="h-3.5 w-3.5 text-blue-600" />}
                            title="Edit client account"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClientToDelete(client)}
                            className="text-rose-600 hover:bg-rose-50"
                            title="Delete client account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Client Form Modal (Add / Edit) */}
      {isFormModalOpen && (
        <div
          data-testid="client-form-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingClient ? `Edit Client: ${editingClient.company}` : "Add Client Account"}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {editingClient ? "Update account contacts and industry tier." : "Onboard a new business client account."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-800 block">Company / Business Name *</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  required
                  placeholder="e.g. Apex Strategic Growth Corp"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">Primary Contact Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">Contact Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. elena@apexgrowth.demo"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">Industry</label>
                  <select
                    value={formIndustry}
                    onChange={(e) => setFormIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  >
                    {industryOptions.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800 block">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as "Active" | "Prospect" | "Archived")}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                >
                  <option value="Active">Active</option>
                  <option value="Prospect">Prospect</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={formLoading}
                  className="bg-[#176B4D] hover:bg-[#12533B] text-white"
                >
                  {formLoading ? "Saving..." : editingClient ? "Save Changes" : "Onboard Client"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Dossier & Linked Stores Modal */}
      {inspectClient && (
        <div
          data-testid="client-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">{inspectClient.company}</h3>
                <p className="text-xs text-stone-500 mt-0.5">Primary Contact: {inspectClient.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectClient(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Email</span>
                <span className="font-semibold text-stone-800">{inspectClient.contactEmail}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Phone</span>
                <span className="font-semibold text-stone-800">{inspectClient.contactPhone}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Industry</span>
                <span className="font-semibold text-stone-800">{inspectClient.industry}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Status</span>
                <div className="mt-0.5"><StatusBadge status={inspectClient.status} size="sm" /></div>
              </div>
            </div>

            {/* Linked Storefronts Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-stone-900">
                  Associated Storefronts ({inspectStores.length})
                </h4>
                <Link href={`/stores/new?clientId=${inspectClient.id}`}>
                  <Button variant="ghost" size="sm" className="text-emerald-700 text-xs">
                    + Generate New Store
                  </Button>
                </Link>
              </div>

              {inspectLoading ? (
                <div className="py-6 text-center text-xs text-stone-500">
                  Loading linked storefronts...
                </div>
              ) : inspectStores.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400 border border-dashed rounded-xl">
                  No storefronts linked to this client account yet.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden text-xs">
                  {inspectStores.map((st) => (
                    <div key={st.id} className="p-3 flex items-center justify-between hover:bg-stone-50">
                      <div>
                        <div className="font-bold text-stone-900">{st.name}</div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {st.slug} &bull; {st.templateName || st.templateId} &bull; {st.status}
                        </div>
                      </div>
                      <Link href={`/stores/${st.id}/preview`}>
                        <Button variant="outline" size="sm" className="text-xs" rightIcon={<ExternalLink className="h-3 w-3" />}>
                          Open Store
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const c = inspectClient;
                  setInspectClient(null);
                  handleOpenEditModal(c);
                }}
              >
                Edit Account
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setInspectClient(null)}
                className="bg-[#176B4D] text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {clientToDelete && (
        <div
          data-testid="delete-client-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-stone-900">
                  {clientToDelete.storeCount > 0 ? "Manage Linked Client Account" : "Delete Client Account"}
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {clientToDelete.storeCount > 0 ? (
                    <>
                      <strong>{clientToDelete.company}</strong> is currently linked to{" "}
                      <span className="font-semibold text-stone-800">{clientToDelete.storeCount} demo store(s)</span>.
                      To preserve catalog integrity, you can safely archive the client or detach stores before deletion.
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete <strong>{clientToDelete.company}</strong>? This action cannot be undone.
                    </>
                  )}
                </p>
              </div>
            </div>

            {clientToDelete.storeCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-1.5">
                <p className="font-semibold">Recommended Actions:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px]">
                  <li><strong>Archive Client (Safe):</strong> Keeps all demo stores linked and marks client as inactive.</li>
                  <li><strong>Detach & Delete:</strong> Reassigns linked stores to &ldquo;Unassigned Client&rdquo; and removes the client record.</li>
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClientToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>

              {clientToDelete.storeCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchiveClient(clientToDelete.id)}
                  disabled={isDeleting}
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  Archive Client
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConfirmDelete(clientToDelete.storeCount > 0)}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting
                  ? "Processing..."
                  : clientToDelete.storeCount > 0
                  ? "Detach & Delete"
                  : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
