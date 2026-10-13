"use client";

import React, { useState, useMemo } from "react";
import { UserPlus, Mail, Phone, Building2, Store, Clock, RefreshCw, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { PlaceholderModal } from "@/components/shared/PlaceholderModal";
import { MOCK_CLIENTS } from "@/mock";
import { Client } from "@/types";

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  const statusOptions = [
    { value: "ALL", label: "All Statuses" },
    { value: "Active", label: "Active" },
    { value: "Prospect", label: "Prospect" },
    { value: "Archived", label: "Archived" },
  ];

  const filteredClients = useMemo(() => {
    return MOCK_CLIENTS.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.industry.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
  };

  const handleInspect = (client: Client) => {
    setSelectedClient(client);
    setInspectModalOpen(true);
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
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<UserPlus className="h-4 w-4" />}
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
      {filteredClients.length === 0 ? (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInspect(client)}
                          leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placeholders */}
      <PlaceholderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        featureName="Add Client Account"
        description="Client creation form, brand asset upload, and MongoDB account record synchronization will be enabled in future phases."
      />

      {selectedClient && (
        <PlaceholderModal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          featureName={`Client Dossier: ${selectedClient.company}`}
          targetPhase="Phase 2 (Client Relationship & Store Linking)"
          description={`Assigned Account Manager: ${selectedClient.assignedAccountManager} | Industry: ${selectedClient.industry} | Associated Stores: ${selectedClient.storeCount}. Full client store history and CRM linkage will be provided in Phase 2.`}
        />
      )}
    </div>
  );
}
