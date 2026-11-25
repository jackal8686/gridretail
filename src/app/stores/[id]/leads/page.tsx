"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Search,
  Download,
  Upload,
  ArrowLeft,
  Columns,
  Table as TableIcon,
  Phone,
  Mail,
  Building,
  Trash2,
  Sliders,
  Plus,
  MoveUp,
  MoveDown,
  Edit2,
  Save,
  Send,
  CheckCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Lead,
  LeadStatus,
  LeadSubmission,
  LeadReminder,
  LeadActivity,
  LeadForm,
  FormStep,
  FormField,
  FormFieldType,
  FormSettings,
} from "@/types/lead";

const STATUS_COLUMNS: { status: LeadStatus; label: string; badgeColor: string }[] = [
  { status: "New", label: "New", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { status: "Contacted", label: "Contacted", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { status: "Qualified", label: "Qualified", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { status: "Converted", label: "Converted", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { status: "Lost", label: "Lost", badgeColor: "bg-stone-100 text-stone-600 border-stone-200" },
];

export default function LeadCrmDashboard() {
  const params = useParams();
  const storeId = params?.id as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "builder">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Lead Form Builder State
  const [leadForm, setLeadForm] = useState<LeadForm | null>(null);
  const [formSteps, setFormSteps] = useState<FormStep[]>([]);
  const [formSettings, setFormSettings] = useState<FormSettings>({
    presentationMode: "embedded",
    layout: "single_column",
    submitButtonText: "Submit Inquiry",
    postSubmissionAction: "message",
    successMessage: "Thank you for reaching out! Our team will get back to you shortly.",
  });
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [isFormPublishing, setIsFormPublishing] = useState(false);
  const [formToast, setFormToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Field Edit/Add Modal State
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldFormData, setFieldFormData] = useState<{
    id: string;
    type: FormFieldType;
    label: string;
    placeholder: string;
    required: boolean;
    optionsText: string;
    width: "full" | "half";
  }>({
    id: "",
    type: "text",
    label: "",
    placeholder: "",
    required: false,
    optionsText: "",
    width: "full",
  });

  // Selected Lead Drawer / Modal state
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [leadDetail, setLeadDetail] = useState<{
    submissions: LeadSubmission[];
    reminders: LeadReminder[];
    activities: LeadActivity[];
  } | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDueAt, setNewReminderDueAt] = useState("");

  // Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvInputText, setCsvInputText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Load leads
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`/api/stores/${storeId}/leads`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      fetchLeads();
    }
  }, [storeId, fetchLeads]);

  // Load Lead Form
  const fetchForm = useCallback(async () => {
    setIsFormLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/forms`);
      if (res.ok) {
        const data = await res.json();
        if (data.form) {
          setLeadForm(data.form);
          const initialSteps =
            data.form.currentDraft?.steps || data.form.publishedSteps || [];
          setFormSteps(initialSteps);
          const initialSettings =
            data.form.currentDraft?.settings ||
            data.form.publishedSettings || {
              presentationMode: "embedded",
              layout: "single_column",
              submitButtonText: "Submit Inquiry",
              postSubmissionAction: "message",
              successMessage: "Thank you for reaching out! Our team will get back to you shortly.",
            };
          setFormSettings(initialSettings);
        }
      }
    } catch (err) {
      console.error("Failed to load lead form:", err);
    } finally {
      setIsFormLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (viewMode === "builder" && !leadForm) {
      fetchForm();
    }
  }, [viewMode, leadForm, fetchForm]);

  const handleSaveDraft = async () => {
    setIsFormSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/forms`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: leadForm?.id,
          steps: formSteps,
          settings: formSettings,
        }),
      });
      const data = await res.json();
      if (res.ok && data.form) {
        setLeadForm(data.form);
        setFormToast({ message: "Draft saved successfully.", type: "success" });
        setTimeout(() => setFormToast(null), 3000);
      } else {
        setFormToast({ message: data.error || "Failed to save draft.", type: "error" });
      }
    } catch {
      setFormToast({ message: "Network error saving draft.", type: "error" });
    } finally {
      setIsFormSaving(false);
    }
  };

  const handlePublishForm = async () => {
    setIsFormPublishing(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/forms`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: leadForm?.id,
          steps: formSteps,
          settings: formSettings,
          publish: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.form) {
        setLeadForm(data.form);
        setFormToast({
          message: `Published v${data.form.publishedVersion || 1} live to storefront!`,
          type: "success",
        });
        setTimeout(() => setFormToast(null), 4000);
      } else {
        setFormToast({ message: data.error || "Failed to publish form.", type: "error" });
      }
    } catch {
      setFormToast({ message: "Network error publishing form.", type: "error" });
    } finally {
      setIsFormPublishing(false);
    }
  };

  // Field manipulation helpers
  const handleOpenAddField = () => {
    setEditingFieldIndex(null);
    setFieldFormData({
      id: `field-${Date.now()}`,
      type: "text",
      label: "",
      placeholder: "",
      required: false,
      optionsText: "",
      width: "full",
    });
    setFieldModalOpen(true);
  };

  const handleOpenEditField = (index: number) => {
    const currentStep = formSteps[activeStepIndex];
    if (!currentStep || !currentStep.fields[index]) return;
    const f = currentStep.fields[index];
    setEditingFieldIndex(index);
    setFieldFormData({
      id: f.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder || "",
      required: !!f.validation?.required,
      optionsText: f.options ? f.options.map((o) => `${o.label}:${o.value}`).join("\n") : "",
      width: f.width || "full",
    });
    setFieldModalOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldFormData.label.trim()) return;
    const currentStep = formSteps[activeStepIndex];
    if (!currentStep) return;

    let parsedOptions: Array<{ label: string; value: string }> | undefined = undefined;
    if (["select", "radio"].includes(fieldFormData.type) && fieldFormData.optionsText.trim()) {
      parsedOptions = fieldFormData.optionsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(":");
          return {
            label: parts[0]?.trim() || line,
            value: parts[1]?.trim() || parts[0]?.trim().toLowerCase().replace(/\s+/g, "_") || line,
          };
        });
    }

    const newField: FormField = {
      id: fieldFormData.id || `field-${Date.now()}`,
      type: fieldFormData.type,
      label: fieldFormData.label.trim(),
      placeholder: fieldFormData.placeholder.trim() || undefined,
      validation: {
        required: fieldFormData.required,
      },
      options: parsedOptions,
      width: fieldFormData.width,
    };

    setFormSteps((prev) => {
      const copy = [...prev];
      const step = { ...copy[activeStepIndex] };
      const fields = [...step.fields];
      if (editingFieldIndex !== null) {
        fields[editingFieldIndex] = newField;
      } else {
        fields.push(newField);
      }
      step.fields = fields;
      copy[activeStepIndex] = step;
      return copy;
    });

    setFieldModalOpen(false);
  };

  const handleDeleteField = (index: number) => {
    setFormSteps((prev) => {
      const copy = [...prev];
      const step = { ...copy[activeStepIndex] };
      step.fields = step.fields.filter((_, i) => i !== index);
      copy[activeStepIndex] = step;
      return copy;
    });
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    setFormSteps((prev) => {
      const copy = [...prev];
      const step = { ...copy[activeStepIndex] };
      const fields = [...step.fields];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= fields.length) return prev;
      const temp = fields[index];
      fields[index] = fields[targetIndex];
      fields[targetIndex] = temp;
      step.fields = fields;
      copy[activeStepIndex] = step;
      return copy;
    });
  };

  // Load active lead details
  const openLeadDetail = async (lead: Lead) => {
    setActiveLead(lead);
    try {
      const res = await fetch(`/api/stores/${storeId}/leads/${lead.id}`);
      if (res.ok) {
        const data = await res.json();
        setLeadDetail({
          submissions: data.submissions || [],
          reminders: data.reminders || [],
          activities: data.activities || [],
        });
      }
    } catch (err) {
      console.error("Failed to load lead details:", err);
    }
  };

  // Status transition handler
  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/stores/${storeId}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        if (activeLead && activeLead.id === leadId) {
          setActiveLead({ ...activeLead, status: newStatus });
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Add Note handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !newNoteContent.trim()) return;

    try {
      const res = await fetch(`/api/stores/${storeId}/leads/${activeLead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveLead((prev) =>
          prev ? { ...prev, notes: [...(prev.notes || []), data.note] } : null
        );
        setNewNoteContent("");
        openLeadDetail(activeLead); // refresh activities
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    }
  };

  // Add Reminder handler
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead || !newReminderTitle.trim() || !newReminderDueAt) return;

    try {
      const res = await fetch(`/api/stores/${storeId}/leads/${activeLead.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newReminderTitle.trim(),
          dueAt: new Date(newReminderDueAt).toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeadDetail((prev) =>
          prev ? { ...prev, reminders: [...prev.reminders, data.reminder] } : null
        );
        setNewReminderTitle("");
        setNewReminderDueAt("");
      }
    } catch (err) {
      console.error("Failed to add reminder:", err);
    }
  };

  // Permanent Deletion handler
  const handleDeleteLead = async (leadId: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this lead? All associated submissions, notes, and activity records will be irreversibly erased in compliance with GDPR."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/stores/${storeId}/leads/${leadId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        setActiveLead(null);
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  // Handle CSV Import
  const handleImportCsv = async () => {
    if (!csvInputText.trim()) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await fetch(`/api/stores/${storeId}/leads/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: csvInputText }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(
          `Import complete: ${data.result.imported} created, ${data.result.merged} merged, ${data.result.errors.length} skipped.`
        );
        fetchLeads();
      } else {
        setImportResult(data.error || "Failed to process import.");
      }
    } catch {
      setImportResult("Network error during CSV import.");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesStatus = selectedStatus === "ALL" || l.status === selectedStatus;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        l.fullName.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.company?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [leads, selectedStatus, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/stores/${storeId}/preview`}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Customizer
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#18231E]">Lead CRM Dashboard</h1>
            <p className="text-xs text-[#66736C]">
              Manage multi-stage lead lifecycles, customer submissions, notes, and reminders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-[#E4E9E5] rounded-lg p-0.5 text-xs mr-2 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                viewMode === "kanban" ? "bg-[#176B4D] text-white" : "text-[#66736C]"
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                viewMode === "table" ? "bg-[#176B4D] text-white" : "text-[#66736C]"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("builder")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                viewMode === "builder" ? "bg-[#176B4D] text-white" : "text-[#66736C]"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Form Builder</span>
            </button>
          </div>

          {viewMode !== "builder" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                leftIcon={<Upload className="h-3.5 w-3.5" />}
              >
                Import CSV
              </Button>

              <a href={`/api/stores/${storeId}/leads/export`} download>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                >
                  Export CSV
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar (only for kanban/table) */}
      {viewMode !== "builder" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9E5] shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#909D96]" />
            <input
              type="text"
              placeholder="Search leads by name, email, phone, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E4E9E5] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#66736C] font-semibold whitespace-nowrap">Filter Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs rounded-lg border border-[#E4E9E5] px-2.5 py-1.5 bg-white text-[#18231E] focus:outline-hidden"
            >
              <option value="ALL">All Statuses ({leads.length})</option>
              {STATUS_COLUMNS.map((col) => (
                <option key={col.status} value={col.status}>
                  {col.label} ({leads.filter((l) => l.status === col.status).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => {
            const colLeads = filteredLeads.filter((l) => l.status === col.status);
            return (
              <div
                key={col.status}
                className="bg-[#FAF9F6] rounded-xl border border-[#E4E9E5] p-3.5 flex flex-col min-w-[240px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E9E5] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#18231E]">{col.label}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white border border-[#E4E9E5] text-[#66736C]">
                      {colLeads.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => openLeadDetail(lead)}
                      className="bg-white p-3.5 rounded-lg border border-[#E4E9E5] hover:border-[#176B4D] hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#18231E] group-hover:text-[#176B4D] truncate">
                          {lead.fullName}
                        </h4>
                        <span className="text-[9px] font-mono text-[#909D96] shrink-0">
                          {new Date(lead.lastSubmissionAt).toLocaleDateString()}
                        </span>
                      </div>

                      {lead.company && (
                        <p className="text-[11px] text-[#66736C] flex items-center gap-1 truncate">
                          <Building className="h-3 w-3 shrink-0 text-[#909D96]" />
                          <span>{lead.company}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-[#909D96] pt-1 border-t border-[#F0F4F1]">
                        <span>{lead.source}</span>
                        <span>{lead.submissionCount || 1} sub</span>
                      </div>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className="p-4 text-center text-xs text-[#909D96] border border-dashed border-[#E4E9E5] rounded-lg">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-[#E4E9E5] shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-[#18231E]">
            <thead className="bg-[#FAF9F6] border-b border-[#E4E9E5] text-[#66736C] font-semibold">
              <tr>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E9E5]">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => openLeadDetail(lead)}
                  className="hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-[#18231E]">{lead.fullName}</td>
                  <td className="py-3 px-4 text-[#4F5D56]">{lead.email || "—"}</td>
                  <td className="py-3 px-4 text-[#4F5D56]">{lead.phone || "—"}</td>
                  <td className="py-3 px-4 text-[#4F5D56]">{lead.company || "—"}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        STATUS_COLUMNS.find((c) => c.status === lead.status)?.badgeColor ||
                        "bg-stone-50"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#66736C]">{lead.source}</td>
                  <td className="py-3 px-4 text-[#66736C] text-[11px]">
                    {new Date(lead.lastSubmissionAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLead(lead.id);
                      }}
                      className="text-[#C43D3D] hover:bg-[#FDEAEA]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#909D96]">
                    No leads match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VISUAL LEAD FORM BUILDER */}
      {viewMode === "builder" && (
        <div className="space-y-6">
          {/* Builder Toolbar & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E4E9E5] shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#E2F5E9] text-[#176B4D] flex items-center justify-center font-bold">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#18231E]">
                    {leadForm?.name || "Consultation Assessment Form"}
                  </h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live v{leadForm?.publishedVersion || 1}
                  </span>
                </div>
                <p className="text-xs text-[#66736C]">
                  {leadForm?.description || "Multi-step capture form rendered on published storefront."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {formToast && (
                <div
                  className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                    formToast.type === "success"
                      ? "bg-[#E2F5E9] text-[#176B4D] border-[#C8E8D5]"
                      : "bg-[#FDEAEA] text-[#C43D3D] border-[#F7BCBC]"
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{formToast.message}</span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                isLoading={isFormSaving}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePublishForm}
                isLoading={isFormPublishing}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                Publish Form
              </Button>
            </div>
          </div>

          {/* Builder Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Step & Field Editor */}
            <div className="lg:col-span-7 space-y-4">
              {/* Step Navigation Tabs */}
              <div className="bg-white p-3 rounded-xl border border-[#E4E9E5] shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {formSteps.map((step, idx) => (
                    <button
                      key={step.id || idx}
                      type="button"
                      onClick={() => setActiveStepIndex(idx)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        activeStepIndex === idx
                          ? "bg-[#176B4D] text-white"
                          : "bg-[#F0F4F1] text-[#4F5D56] hover:bg-[#E4E9E5]"
                      }`}
                    >
                      Step {idx + 1}: {step.title}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newStep: FormStep = {
                      id: `step-${Date.now()}`,
                      title: `Additional Step ${formSteps.length + 1}`,
                      description: "Please provide secondary consultation requirements.",
                      fields: [],
                    };
                    setFormSteps((prev) => [...prev, newStep]);
                    setActiveStepIndex(formSteps.length);
                  }}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  className="text-xs shrink-0"
                >
                  Add Step
                </Button>
              </div>

              {/* Active Step Details */}
              {formSteps[activeStepIndex] ? (
                <div className="bg-white p-5 rounded-xl border border-[#E4E9E5] shadow-2xs space-y-5">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F0F4F1]">
                    <div className="space-y-1 flex-1">
                      <label className="text-[11px] font-bold text-[#66736C] uppercase tracking-wider">
                        Step Title
                      </label>
                      <input
                        type="text"
                        value={formSteps[activeStepIndex].title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSteps((prev) => {
                            const copy = [...prev];
                            copy[activeStepIndex] = { ...copy[activeStepIndex], title: val };
                            return copy;
                          });
                        }}
                        className="w-full text-sm font-bold text-[#18231E] rounded-lg border border-[#E4E9E5] px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                      />
                    </div>
                    {formSteps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this entire step and its fields?")) {
                            setFormSteps((prev) => prev.filter((_, i) => i !== activeStepIndex));
                            setActiveStepIndex((prev) => Math.max(0, prev - 1));
                          }
                        }}
                        className="text-[#C43D3D] hover:bg-[#FDEAEA] text-xs mt-5"
                      >
                        Delete Step
                      </Button>
                    )}
                  </div>

                  {/* Fields list in active step */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#18231E] flex items-center gap-1.5">
                        <span>Form Fields</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-[#F0F4F1] text-[#66736C]">
                          {formSteps[activeStepIndex].fields.length}
                        </span>
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenAddField}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        className="text-xs"
                      >
                        Add Field
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {formSteps[activeStepIndex].fields.map((field, fIdx) => (
                        <div
                          key={field.id || fIdx}
                          className="flex items-center justify-between p-3.5 rounded-lg border border-[#E4E9E5] bg-[#FAF9F6] hover:bg-white hover:border-[#CBD6D0] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-bold text-[#909D96] w-4">
                              {fIdx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#18231E]">
                                  {field.label}
                                </span>
                                {field.validation?.required && (
                                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                    Required
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#66736C] mt-0.5">
                                <span className="font-mono bg-[#EAEFEA] px-1.5 py-0.2 rounded text-[10px]">
                                  {field.type}
                                </span>
                                {field.placeholder && (
                                  <span className="truncate max-w-[200px]">
                                    Placeholder: &quot;{field.placeholder}&quot;
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={fIdx === 0}
                              onClick={() => handleMoveField(fIdx, "up")}
                              className="p-1 h-7 w-7 text-[#66736C] hover:text-[#18231E]"
                            >
                              <MoveUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={fIdx === formSteps[activeStepIndex].fields.length - 1}
                              onClick={() => handleMoveField(fIdx, "down")}
                              className="p-1 h-7 w-7 text-[#66736C] hover:text-[#18231E]"
                            >
                              <MoveDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditField(fIdx)}
                              className="p-1 h-7 w-7 text-[#176B4D] hover:bg-[#E2F5E9]"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteField(fIdx)}
                              className="p-1 h-7 w-7 text-[#C43D3D] hover:bg-[#FDEAEA]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {formSteps[activeStepIndex].fields.length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed border-[#E4E9E5] rounded-xl text-xs text-[#909D96]">
                          No fields in this step yet. Click &quot;Add Field&quot; to configure input fields.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center bg-white rounded-xl border border-[#E4E9E5] text-xs text-[#909D96]">
                  {isFormLoading ? "Loading lead form..." : "No steps configured."}
                </div>
              )}
            </div>

            {/* Right 5 Columns: Settings & Live Preview */}
            <div className="lg:col-span-5 space-y-4">
              {/* Form Settings */}
              <div className="bg-white p-5 rounded-xl border border-[#E4E9E5] shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-[#18231E] uppercase tracking-wider">
                  Form Settings
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#4F5D56] mb-1">
                      Submit Button Text
                    </label>
                    <input
                      type="text"
                      value={formSettings.submitButtonText || "Submit Inquiry"}
                      onChange={(e) =>
                        setFormSettings((prev) => ({ ...prev, submitButtonText: e.target.value }))
                      }
                      className="w-full text-xs rounded-lg border border-[#E4E9E5] px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#4F5D56] mb-1">
                      Success Message
                    </label>
                    <textarea
                      rows={2}
                      value={formSettings.successMessage || ""}
                      onChange={(e) =>
                        setFormSettings((prev) => ({ ...prev, successMessage: e.target.value }))
                      }
                      className="w-full text-xs rounded-lg border border-[#E4E9E5] p-2.5 focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#4F5D56] mb-1">
                        Presentation Mode
                      </label>
                      <select
                        value={formSettings.presentationMode || "embedded"}
                        onChange={(e) =>
                          setFormSettings((prev) => ({
                            ...prev,
                            presentationMode: e.target.value as FormSettings["presentationMode"],
                          }))
                        }
                        className="w-full text-xs rounded-lg border border-[#E4E9E5] px-2.5 py-1.5 bg-white text-[#18231E]"
                      >
                        <option value="embedded">Embedded Inline</option>
                        <option value="modal">Popup Modal</option>
                        <option value="page">Standalone Page</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#4F5D56] mb-1">
                        Column Layout
                      </label>
                      <select
                        value={formSettings.layout || "single_column"}
                        onChange={(e) =>
                          setFormSettings((prev) => ({
                            ...prev,
                            layout: e.target.value as FormSettings["layout"],
                          }))
                        }
                        className="w-full text-xs rounded-lg border border-[#E4E9E5] px-2.5 py-1.5 bg-white text-[#18231E]"
                      >
                        <option value="single_column">Single Column</option>
                        <option value="two_column">Two Columns</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Form Preview Card */}
              <div className="bg-white p-5 rounded-xl border border-[#E4E9E5] shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F4F1]">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-[#176B4D]" />
                    <h4 className="text-xs font-bold text-[#18231E]">Interactive Preview</h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#909D96]">Live Client Rendering</span>
                </div>

                <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-[#18231E]">
                      {formSteps[activeStepIndex]?.title || "Step Preview"}
                    </h5>
                    {formSteps[activeStepIndex]?.description && (
                      <p className="text-[11px] text-[#66736C]">
                        {formSteps[activeStepIndex].description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {formSteps[activeStepIndex]?.fields.map((fld) => (
                      <div key={fld.id} className="space-y-1">
                        <label className="text-[11px] font-semibold text-[#4F5D56] flex items-center justify-between">
                          <span>{fld.label}</span>
                          {fld.validation?.required && (
                            <span className="text-rose-500 font-bold">*</span>
                          )}
                        </label>
                        {fld.type === "textarea" ? (
                          <textarea
                            rows={2}
                            placeholder={fld.placeholder}
                            disabled
                            className="w-full text-xs rounded-md border border-[#D5DDD8] bg-white p-2 text-[#909D96]"
                          />
                        ) : fld.type === "select" ? (
                          <select
                            disabled
                            className="w-full text-xs rounded-md border border-[#D5DDD8] bg-white px-2 py-1.5 text-[#909D96]"
                          >
                            <option>{fld.placeholder || "Select option..."}</option>
                            {fld.options?.map((opt, oIdx) => (
                              <option key={oIdx}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={fld.type === "number" ? "number" : "text"}
                            placeholder={fld.placeholder}
                            disabled
                            className="w-full text-xs rounded-md border border-[#D5DDD8] bg-white px-2 py-1.5 text-[#909D96]"
                          />
                        )}
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full mt-2"
                      disabled
                    >
                      {formSettings.submitButtonText || "Submit Inquiry"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEAD DETAIL DRAWER / MODAL */}
      {activeLead && (
        <Modal
          isOpen={!!activeLead}
          onClose={() => setActiveLead(null)}
          title={`Lead Profile: ${activeLead.fullName}`}
        >
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Header info & Status control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E9E5]">
              <div>
                <h3 className="text-base font-bold text-[#18231E]">{activeLead.fullName}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#66736C] mt-1">
                  {activeLead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {activeLead.email}
                    </span>
                  )}
                  {activeLead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {activeLead.phone}
                    </span>
                  )}
                  {activeLead.company && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      {activeLead.company}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#66736C]">Status:</span>
                <select
                  value={activeLead.status}
                  onChange={(e) => handleUpdateStatus(activeLead.id, e.target.value as LeadStatus)}
                  className="text-xs rounded-lg border border-[#E4E9E5] px-2.5 py-1.5 bg-white font-bold text-[#18231E]"
                >
                  {STATUS_COLUMNS.map((col) => (
                    <option key={col.status} value={col.status}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submissions Section */}
            <div>
              <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider mb-2">
                Form Submissions ({leadDetail?.submissions.length || 0})
              </h4>
              <div className="space-y-3">
                {leadDetail?.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-lg border border-[#E4E9E5] bg-[#FAF9F6] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[#66736C] text-[11px]">
                      <span className="font-semibold text-[#18231E]">{sub.formName || "Form Submission"}</span>
                      <span>{new Date(sub.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E4E9E5]">
                      {Object.entries(sub.data || {}).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-[10px] text-[#909D96] font-mono block uppercase">
                            {key}
                          </span>
                          <span className="text-xs text-[#18231E] font-medium">
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(!leadDetail || leadDetail.submissions.length === 0) && (
                  <p className="text-xs text-[#909D96] italic">No submissions recorded.</p>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider mb-2">
                Internal Notes & Remarks
              </h4>
              <form onSubmit={handleAddNote} className="space-y-2 mb-3">
                <textarea
                  rows={2}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Add confidential team note or consultation summary..."
                  className="w-full text-xs rounded-lg border border-[#E4E9E5] p-2.5 focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" disabled={!newNoteContent.trim()}>
                    Add Note
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                {activeLead.notes?.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-lg border border-[#E4E9E5] bg-white space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#909D96]">
                      <span className="font-semibold text-[#18231E]">{n.authorName}</span>
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[#4F5D56]">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reminders Section */}
            <div>
              <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider mb-2">
                Follow-up Reminders
              </h4>
              <form
                onSubmit={handleAddReminder}
                className="flex flex-col sm:flex-row items-center gap-2 mb-3"
              >
                <input
                  type="text"
                  value={newReminderTitle}
                  onChange={(e) => setNewReminderTitle(e.target.value)}
                  placeholder="Reminder: e.g. Send engagement proposal"
                  className="flex-1 text-xs rounded-lg border border-[#E4E9E5] px-3 py-1.5 focus:outline-hidden"
                />
                <input
                  type="datetime-local"
                  value={newReminderDueAt}
                  onChange={(e) => setNewReminderDueAt(e.target.value)}
                  className="text-xs rounded-lg border border-[#E4E9E5] px-2 py-1.5 bg-white"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={!newReminderTitle.trim() || !newReminderDueAt}
                >
                  Set Reminder
                </Button>
              </form>

              <div className="space-y-2">
                {leadDetail?.reminders.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg border border-[#E4E9E5] bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#18231E]">{r.title}</p>
                      <p className="text-[11px] text-[#66736C]">
                        Due: {new Date(r.dueAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity History */}
            <div>
              <h4 className="text-xs font-bold text-[#18231E] uppercase tracking-wider mb-2">
                Audit Timeline
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {leadDetail?.activities.map((act) => (
                  <div key={act.id} className="text-xs text-[#66736C] flex items-center gap-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#176B4D]" />
                    <span className="font-semibold text-[#18231E]">{act.type}:</span>
                    <span>{act.description}</span>
                    <span className="text-[10px] text-[#909D96] ml-auto">
                      {new Date(act.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permanent Deletion Button */}
            <div className="pt-4 border-t border-[#F0F4F1] flex justify-between items-center">
              <span className="text-[11px] text-[#909D96]">Permanent GDPR Cleanup</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDeleteLead(activeLead.id)}
                className="text-[#C43D3D] hover:bg-[#FDEAEA] border-[#F7BCBC]"
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Permanently Delete Lead
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV IMPORT MODAL */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Leads from CSV"
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#66736C]">
            Paste your CSV text below. Standard columns supported: <strong>Name, Email, Phone, Company, Status</strong>.
            Duplicate detection will automatically merge records within this store while strictly protecting cross-store privacy.
          </p>

          <textarea
            rows={8}
            value={csvInputText}
            onChange={(e) => setCsvInputText(e.target.value)}
            placeholder="Full Name,Email,Phone,Company,Status&#10;Alice Walker,alice@example.com,+15551234567,Acme Corp,New"
            className="w-full text-xs font-mono rounded-lg border border-[#E4E9E5] p-3 focus:outline-hidden"
          />

          {importResult && (
            <div className="p-3 rounded-lg bg-[#E2F5E9] border border-[#C8E8D5] text-xs text-[#176B4D]">
              {importResult}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isImporting}
              onClick={handleImportCsv}
            >
              Process Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* FIELD ADD / EDIT MODAL */}
      <Modal
        isOpen={fieldModalOpen}
        onClose={() => setFieldModalOpen(false)}
        title={editingFieldIndex !== null ? "Edit Form Field" : "Add Form Field"}
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#4F5D56] mb-1">
              Field Label *
            </label>
            <input
              type="text"
              value={fieldFormData.label}
              onChange={(e) => setFieldFormData((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="e.g. Work Email, Consultation Budget"
              className="w-full text-xs rounded-lg border border-[#E4E9E5] px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#4F5D56] mb-1">
                Field Type
              </label>
              <select
                value={fieldFormData.type}
                onChange={(e) =>
                  setFieldFormData((prev) => ({ ...prev, type: e.target.value as FormFieldType }))
                }
                className="w-full text-xs rounded-lg border border-[#E4E9E5] px-2.5 py-2 bg-white text-[#18231E]"
              >
                <option value="text">Single Line Text</option>
                <option value="email">Email Address</option>
                <option value="phone">Phone Number</option>
                <option value="textarea">Paragraph Textarea</option>
                <option value="select">Dropdown Select</option>
                <option value="radio">Radio Options</option>
                <option value="checkbox">Checkbox Confirmation</option>
                <option value="number">Numeric</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4F5D56] mb-1">
                Field Width
              </label>
              <select
                value={fieldFormData.width}
                onChange={(e) =>
                  setFieldFormData((prev) => ({ ...prev, width: e.target.value as "full" | "half" }))
                }
                className="w-full text-xs rounded-lg border border-[#E4E9E5] px-2.5 py-2 bg-white text-[#18231E]"
              >
                <option value="full">Full Width</option>
                <option value="half">Half Width (2 cols)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4F5D56] mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={fieldFormData.placeholder}
              onChange={(e) =>
                setFieldFormData((prev) => ({ ...prev, placeholder: e.target.value }))
              }
              placeholder="e.g. Enter your work email..."
              className="w-full text-xs rounded-lg border border-[#E4E9E5] px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          {["select", "radio"].includes(fieldFormData.type) && (
            <div>
              <label className="block text-xs font-semibold text-[#4F5D56] mb-1">
                Dropdown Options (One per line, or Label:value)
              </label>
              <textarea
                rows={3}
                value={fieldFormData.optionsText}
                onChange={(e) =>
                  setFieldFormData((prev) => ({ ...prev, optionsText: e.target.value }))
                }
                placeholder={"Option 1:opt_1\nOption 2:opt_2"}
                className="w-full text-xs rounded-lg border border-[#E4E9E5] p-2.5 font-mono focus:outline-hidden"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="field-required-toggle"
              checked={fieldFormData.required}
              onChange={(e) =>
                setFieldFormData((prev) => ({ ...prev, required: e.target.checked }))
              }
              className="rounded border-[#CBD6D0] text-[#176B4D] focus:ring-[#176B4D]"
            />
            <label htmlFor="field-required-toggle" className="text-xs text-[#18231E] font-medium">
              Mandatory field (requires valid user entry before submission)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#F0F4F1]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFieldModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveField}
            >
              Save Field
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
