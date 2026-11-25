"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowLeft,
  Plus,
  RefreshCw,
  List,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/ui/Modal";
import { Store } from "@/types/store";
import { Appointment, AppointmentService, AppointmentProvider, AppointmentStatus } from "@/types/appointment";
import { formatINR } from "@/utils/currency";
import { cn } from "@/utils/cn";

export default function StoreSchedulePage() {
  const params = useParams();
  const id = params?.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [providers, setProviders] = useState<AppointmentProvider[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & View Mode
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Selected appointment for detail inspection/actions
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotesInput, setAdminNotesInput] = useState("");

  // Manual booking modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualServiceId, setManualServiceId] = useState("");
  const [manualProviderId, setManualProviderId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualTime, setManualTime] = useState("10:00");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerEmail, setManualCustomerEmail] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleProviderId, setRescheduleProviderId] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storeRes, srvRes, prvRes, aptRes] = await Promise.all([
        fetch(`/api/stores/${id}`),
        fetch(`/api/stores/${id}/services`),
        fetch(`/api/stores/${id}/providers`),
        fetch(`/api/stores/${id}/appointments`),
      ]);

      if (storeRes.ok) {
        const storeData = await storeRes.json();
        setStore(storeData.store);
      }
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        setServices(srvData.services || []);
        if (srvData.services?.length > 0) {
          setManualServiceId((prev) => prev || srvData.services[0].id);
        }
      }
      if (prvRes.ok) {
        const prvData = await prvRes.json();
        setProviders(prvData.providers || []);
      }
      if (aptRes.ok) {
        const aptData = await aptRes.json();
        setAppointments(aptData.appointments || []);
      }
    } catch (err) {
      console.error("Failed to load schedule data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  // Status badge helper
  const renderStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "Confirmed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Confirmed</span>;
      case "Pending":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Pending Approval</span>;
      case "Cancelled":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Cancelled</span>;
      case "Completed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Completed</span>;
      case "No-show":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700">No-Show</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100">{status}</span>;
    }
  };

  // Status updates
  const handleUpdateStatus = async (appointmentId: string, newStatus: AppointmentStatus, cancellationReason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/stores/${id}/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          cancellationReason,
          adminNotes: adminNotesInput || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? data.appointment : a))
        );
        setSelectedAppointment(data.appointment);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Reschedule handlers
  const handleOpenReschedule = (appt: Appointment) => {
    setRescheduleAppointment(appt);
    const d = new Date(appt.startUtc);
    setRescheduleDate(d.toISOString().split("T")[0]);
    setRescheduleTime(d.toISOString().substring(11, 16));
    setRescheduleProviderId(appt.providerId || (providers[0]?.id || ""));
    setRescheduleError(null);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAppointment) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const combinedUtc = new Date(`${rescheduleDate}T${rescheduleTime}:00.000Z`).toISOString();
      const res = await fetch(`/api/stores/${id}/appointments/${rescheduleAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUtc: combinedUtc,
          providerId: rescheduleProviderId || undefined,
          slotStartTime: rescheduleTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || "Failed to reschedule appointment");
        return;
      }
      setAppointments((prev) =>
        prev.map((a) => (a.id === data.appointment.id ? data.appointment : a))
      );
      if (selectedAppointment?.id === data.appointment.id) {
        setSelectedAppointment(data.appointment);
      }
      setRescheduleAppointment(null);
    } catch (err: unknown) {
      setRescheduleError((err as Error)?.message || "Failed to reschedule appointment");
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Manual booking submission
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    setActionLoading(true);

    try {
      const startUtc = new Date(`${manualDate}T${manualTime}:00`).toISOString();
      const payload = {
        serviceId: manualServiceId,
        providerId: manualProviderId || undefined,
        startUtc,
        customerName: manualCustomerName.trim(),
        customerEmail: manualCustomerEmail.trim(),
        customerPhone: manualCustomerPhone.trim() || undefined,
        customerNotes: manualNotes.trim() || undefined,
        status: "Confirmed",
      };

      const res = await fetch(`/api/stores/${id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create manual appointment.");
      }

      setAppointments((prev) => [data.appointment, ...prev]);
      setShowManualModal(false);
      setManualCustomerName("");
      setManualCustomerEmail("");
      setManualCustomerPhone("");
      setManualNotes("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setManualError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (providerFilter !== "ALL" && a.providerId !== providerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.customerName.toLowerCase().includes(q);
        const matchEmail = a.customerEmail.toLowerCase().includes(q);
        const matchCode = a.confirmationNumber.toLowerCase().includes(q);
        const matchService = a.serviceName.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCode && !matchService) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, providerFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/stores/${id}/preview`}
              className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Customizer</span>
            </Link>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Appointment Scheduling
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900">
            {store?.name || "Store"} — Master Schedule
          </h1>
          <p className="text-xs text-stone-500">
            Manage incoming consultations, review client details, and update practitioner availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 bg-[#176B4D] text-white hover:bg-[#12533B]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Appointment</span>
          </Button>
        </div>
      </div>

      {/* Filter and View Controls */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="w-full sm:w-64">
              <SearchInput
                placeholder="Search by client, code, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "Confirmed", label: "Confirmed" },
                { value: "Pending", label: "Pending Approval" },
                { value: "Cancelled", label: "Cancelled" },
                { value: "Completed", label: "Completed" },
                { value: "No-show", label: "No-show" },
              ]}
            />

            {providers.length > 0 && (
              <FilterSelect
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Practitioners" },
                  ...providers.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            )}
          </div>

          <div className="flex items-center gap-1 border rounded-lg p-1 shrink-0 bg-stone-50">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "list" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>List ({filteredAppointments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "calendar" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Main List / Table View */}
      {viewMode === "list" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Practitioner</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Fee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No appointments found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => (
                    <tr
                      key={appt.id}
                      onClick={() => {
                        setSelectedAppointment(appt);
                        setAdminNotesInput(appt.adminNotes || "");
                      }}
                      className="hover:bg-stone-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        {appt.confirmationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">{appt.customerName}</div>
                        <div className="text-[11px] text-stone-400">{appt.customerEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-800">
                        {appt.serviceName}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {appt.providerName || "Solo Practitioner"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">
                          {new Date(appt.startUtc).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {new Date(appt.startUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({appt.durationMinutes}m)
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-stone-800">
                        {appt.price === 0 ? "Complimentary" : formatINR(appt.price)}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(appt.status)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {appt.status !== "Cancelled" && appt.status !== "Completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenReschedule(appt);
                            }}
                            className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs font-semibold"
                          >
                            Reschedule
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-700 hover:text-emerald-800 text-xs font-semibold"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Calendar View (Simple Date Grouping) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAppointments.map((appt) => (
            <Card
              key={appt.id}
              className="hover:shadow-md transition-shadow cursor-pointer border"
              onClick={() => {
                setSelectedAppointment(appt);
                setAdminNotesInput(appt.adminNotes || "");
              }}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-stone-700">
                    {appt.confirmationNumber}
                  </span>
                  {renderStatusBadge(appt.status)}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-stone-900">{appt.serviceName}</h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Client: {appt.customerName}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5 text-stone-400" />
                    <span>{new Date(appt.startUtc).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-stone-800">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    <span>{new Date(appt.startUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Appointment Details & Actions Modal */}
      {selectedAppointment && (
        <Modal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          title={`Booking ${selectedAppointment.confirmationNumber}`}
        >
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                  Status
                </span>
                <div className="mt-1">{renderStatusBadge(selectedAppointment.status)}</div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
                  Fee
                </span>
                <span className="font-black text-sm text-stone-900 mt-1 block">
                  {selectedAppointment.price === 0 ? "Complimentary" : formatINR(selectedAppointment.price)}
                </span>
              </div>
            </div>

            {/* Details Box */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">Service:</span>
                <span className="font-bold text-stone-800">{selectedAppointment.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Practitioner:</span>
                <span className="font-semibold text-stone-800">{selectedAppointment.providerName || "Solo Practitioner"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Scheduled Date & Time:</span>
                <span className="font-bold text-emerald-800">
                  {new Date(selectedAppointment.startUtc).toLocaleDateString()} at {new Date(selectedAppointment.startUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Duration:</span>
                <span className="font-semibold text-stone-800">{selectedAppointment.durationMinutes} mins</span>
              </div>
            </div>

            {/* Client Info */}
            <div className="space-y-1.5 border-t pt-3">
              <h4 className="font-bold text-stone-900">Client Information</h4>
              <div className="grid grid-cols-2 gap-2 text-stone-600">
                <div>
                  <span className="text-stone-400 block text-[10px]">Name</span>
                  <span className="font-semibold text-stone-800">{selectedAppointment.customerName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Email</span>
                  <span className="font-semibold text-stone-800">{selectedAppointment.customerEmail}</span>
                </div>
                {selectedAppointment.customerPhone && (
                  <div>
                    <span className="text-stone-400 block text-[10px]">Phone</span>
                    <span className="font-semibold text-stone-800">{selectedAppointment.customerPhone}</span>
                  </div>
                )}
              </div>
              {selectedAppointment.customerNotes && (
                <div className="mt-2 p-2.5 rounded-lg bg-stone-100/70 border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500 block">Client Notes:</span>
                  <p className="text-stone-700 mt-0.5">{selectedAppointment.customerNotes}</p>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            <div className="space-y-1.5 border-t pt-3">
              <label className="font-bold text-stone-900 block">
                Internal Staff Notes
              </label>
              <textarea
                rows={2}
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                placeholder="Add private staff notes or preparation instructions..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-4 flex flex-wrap gap-2 justify-end">
              {selectedAppointment.status === "Pending" && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedAppointment.id, "Confirmed")}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Booking
                </Button>
              )}

              {selectedAppointment.status === "Confirmed" && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedAppointment.id, "Completed")}
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Mark Completed
                </Button>
              )}

              {selectedAppointment.status !== "Cancelled" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedAppointment.id, "Cancelled", "Cancelled by administrator")}
                  disabled={actionLoading}
                  className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  Cancel Booking
                </Button>
              )}

              {selectedAppointment.status !== "Cancelled" && selectedAppointment.status !== "Completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenReschedule(selectedAppointment)}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
                >
                  Reschedule
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleAppointment && (
        <Modal
          isOpen={!!rescheduleAppointment}
          onClose={() => setRescheduleAppointment(null)}
          title={`Reschedule Booking ${rescheduleAppointment.confirmationNumber}`}
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
            {rescheduleError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {rescheduleError}
              </div>
            )}
            <div>
              <label className="font-bold text-stone-900 block mb-1">Service</label>
              <div className="p-2.5 rounded-lg bg-stone-100 text-stone-800 font-semibold">
                {rescheduleAppointment.serviceName} ({rescheduleAppointment.durationMinutes} min)
              </div>
            </div>
            <div>
              <label className="font-bold text-stone-900 block mb-1">Staff / Provider</label>
              <select
                value={rescheduleProviderId}
                onChange={(e) => setRescheduleProviderId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-900 block mb-1">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-stone-900 block mb-1">New Time (UTC)</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:outline-none"
                />
              </div>
            </div>
            <div className="border-t pt-4 flex gap-2 justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRescheduleAppointment(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={rescheduleLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {rescheduleLoading ? "Rescheduling..." : "Save New Schedule"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manual Booking Modal */}
      {showManualModal && (
        <Modal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          title="Create Manual Appointment"
        >
          <form onSubmit={handleCreateManualBooking} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Service *</label>
              <select
                required
                value={manualServiceId}
                onChange={(e) => setManualServiceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes}m) - {s.isFreeConsultation ? "Free" : formatINR(s.price)}
                  </option>
                ))}
              </select>
            </div>

            {providers.length > 0 && (
              <div>
                <label className="font-semibold block mb-1">Practitioner</label>
                <select
                  value={manualProviderId}
                  onChange={(e) => setManualProviderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none"
                >
                  <option value="">Any Available</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Time *</label>
                <input
                  type="time"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Client Full Name *</label>
              <input
                type="text"
                required
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                placeholder="Client name"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Client Email *</label>
              <input
                type="email"
                required
                value={manualCustomerEmail}
                onChange={(e) => setManualCustomerEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Client Phone</label>
              <input
                type="tel"
                value={manualCustomerPhone}
                onChange={(e) => setManualCustomerPhone(e.target.value)}
                placeholder="+91..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Consultation Notes</label>
              <textarea
                rows={2}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Topic or reason for consultation..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:outline-none text-xs"
              />
            </div>

            {manualError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {manualError}
              </div>
            )}

            <div className="pt-2 flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowManualModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="bg-[#176B4D] text-white hover:bg-[#12533B]"
              >
                {actionLoading ? "Scheduling..." : "Create Appointment"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
