"use client";

import React, { useState } from "react";
import { SectionInstance, SectionType, SectionCategory } from "@/types/section";
import {
  ALL_SECTION_DEFINITIONS,
  getDefaultSectionInstance,
  getSectionDefinition,
} from "@/constants/sections";
import { generateSectionId, deepCloneSectionSettings } from "@/lib/sections/id-generator";
import {
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Settings2,
  Sparkles,
  X,
  Maximize,
  Columns,
  Grid,
  TrendingUp,
  Clock,
  LayoutGrid,
  SlidersHorizontal,
  BookOpen,
  Hammer,
  Image as ImageIcon,
  Camera,
  Shield,
  GitCommit,
  CheckCircle,
  HelpCircle,
  Truck,
  Mail,
  Send,
  Megaphone,
  Award,
  FileText,
  PanelBottom,
  Upload,

  Loader2,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface SectionManagerProps {
  sections: SectionInstance[];
  onChange: (updatedSections: SectionInstance[]) => void;
  industry?: string;
  storeId?: string;
}

export function SectionManager({
  sections,
  onChange,
  industry,
  storeId,
}: SectionManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SectionCategory | "all">("all");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Icon map for section definitions
  const iconMap: Record<string, React.ReactNode> = {
    Maximize: <Maximize className="h-4 w-4" />,
    Columns: <Columns className="h-4 w-4" />,
    Sparkles: <Sparkles className="h-4 w-4" />,
    Minus: <Settings2 className="h-4 w-4" />,
    Film: <ImageIcon className="h-4 w-4" />,
    Tag: <TagIcon className="h-4 w-4" />,
    Sliders: <SlidersHorizontal className="h-4 w-4" />,
    Grid: <Grid className="h-4 w-4" />,
    TrendingUp: <TrendingUp className="h-4 w-4" />,
    Clock: <Clock className="h-4 w-4" />,
    LayoutGrid: <LayoutGrid className="h-4 w-4" />,
    SlidersHorizontal: <SlidersHorizontal className="h-4 w-4" />,
    ArrowRightCircle: <Plus className="h-4 w-4" />,
    BookOpen: <BookOpen className="h-4 w-4" />,
    Hammer: <Hammer className="h-4 w-4" />,
    Image: <ImageIcon className="h-4 w-4" />,
    Camera: <Camera className="h-4 w-4" />,
    Shield: <Shield className="h-4 w-4" />,
    GitCommit: <GitCommit className="h-4 w-4" />,
    CheckCircle: <CheckCircle className="h-4 w-4" />,
    HelpCircle: <HelpCircle className="h-4 w-4" />,
    Truck: <Truck className="h-4 w-4" />,
    Mail: <Mail className="h-4 w-4" />,
    Send: <Send className="h-4 w-4" />,
    Megaphone: <Megaphone className="h-4 w-4" />,
    Award: <Award className="h-4 w-4" />,
    FileText: <FileText className="h-4 w-4" />,
    PanelBottom: <PanelBottom className="h-4 w-4" />,
  };


  // -------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------
  const handleAddSection = (type: SectionType) => {
    const newInstance = getDefaultSectionInstance(type, sections.length);
    const updated = [...sections, newInstance];
    onChange(updated);
    setIsAddModalOpen(false);
    setEditingSectionId(newInstance.id);
  };

  const handleToggleVisibility = (id: string) => {
    const updated = sections.map((sec) =>
      sec.id === id ? { ...sec, visible: !sec.visible } : sec
    );
    onChange(updated);
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    // Re-index order
    const reindexed = copy.map((sec, idx) => ({ ...sec, order: idx }));
    onChange(reindexed);
  };

  const handleDuplicate = (id: string) => {
    const target = sections.find((s) => s.id === id);
    if (!target) return;

    const clone: SectionInstance = {
      ...target,
      id: generateSectionId(target.type),
      customTitle: target.customTitle ? `${target.customTitle} (Copy)` : undefined,
      order: target.order + 1,
      settings: deepCloneSectionSettings(target.settings),
    };

    const targetIdx = sections.findIndex((s) => s.id === id);
    const copy = [...sections];
    copy.splice(targetIdx + 1, 0, clone);
    const reindexed = copy.map((sec, idx) => ({ ...sec, order: idx }));
    onChange(reindexed);
  };

  const handleDelete = (id: string) => {
    const filtered = sections.filter((s) => s.id !== id);
    const reindexed = filtered.map((sec, idx) => ({ ...sec, order: idx }));
    onChange(reindexed);
    setDeleteConfirmId(null);
    if (editingSectionId === id) {
      setEditingSectionId(null);
    }
  };

  const handleResetToDefault = (id: string) => {
    const target = sections.find((s) => s.id === id);
    if (!target) return;

    const def = getSectionDefinition(target.type);
    if (!def) return;

    const updated = sections.map((s) =>
      s.id === id
        ? {
            ...s,
            layoutVariant: def.defaultLayout,
            settings: { ...def.defaultSettings },
          }
        : s
    );
    onChange(updated);
  };

  const handleSettingChange = (id: string, key: string, value: unknown) => {
    const updated = sections.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        settings: {
          ...s.settings,
          [key]: value,
        },
      };
    });
    onChange(updated);
  };

  const handleLayoutChange = (id: string, layoutVariant: string) => {
    const updated = sections.map((s) =>
      s.id === id ? { ...s, layoutVariant } : s
    );
    onChange(updated);
  };

  // Drag and Drop
  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIndex === null || draggedIndex === targetIdx) return;
    const copy = [...sections];
    const [moved] = copy.splice(draggedIndex, 1);
    copy.splice(targetIdx, 0, moved);
    const reindexed = copy.map((sec, idx) => ({ ...sec, order: idx }));
    onChange(reindexed);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-xs text-[#18231E]">Storefront Page Sections</h4>
          <p className="text-[10px] text-[#66736C]">
            Add, reorder, customize, and configure layout variants for every section.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[36px] px-3 py-1.5 bg-[#176B4D] hover:bg-[#12553D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Section</span>
        </button>
      </div>

      {/* Sections List */}
      <div className="space-y-2">
        {sections.map((instance, index) => {
          const def = getSectionDefinition(instance.type);
          const name = instance.customTitle || def?.name || instance.type;
          const isDragging = draggedIndex === index;
          const isEditing = editingSectionId === instance.id;

          return (
            <div
              key={instance.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={cn(
                "rounded-xl border transition-all select-none p-2.5",
                isDragging && "opacity-40 border-dashed border-[#176B4D] bg-[#E2F5E9]",
                instance.visible
                  ? "bg-white border-[#CCD5CE] shadow-2xs hover:border-[#176B4D]"
                  : "bg-[#FAF9F6] border-[#E4E9E5] text-[#8F9D95]",
                isEditing && "ring-2 ring-[#176B4D] border-[#176B4D]"
              )}
            >
              <div className="flex items-center gap-2">
                {/* Drag Handle */}
                <div
                  className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 p-0.5"
                  title="Drag to reorder section"
                >
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Order Index */}
                <span
                  className={cn(
                    "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 border",
                    instance.visible
                      ? "bg-[#E2F5E9] text-[#176B4D] border-[#176B4D]/30"
                      : "bg-stone-100 text-stone-400 border-stone-200"
                  )}
                >
                  {index + 1}
                </span>

                {/* Section Meta Details */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setEditingSectionId(isEditing ? null : instance.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "font-bold text-xs truncate",
                        instance.visible ? "text-[#18231E]" : "text-[#8F9D95]"
                      )}
                    >
                      {name}
                    </span>
                    {!instance.visible && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-stone-200 text-stone-600 font-semibold uppercase">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#66736C]">
                    <span className="capitalize">{def?.category || "custom"}</span>
                    {instance.layoutVariant && (
                      <>
                        <span>•</span>
                        <span className="font-mono">{instance.layoutVariant}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Move Controls */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveSection(index, "up")}
                    className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 transition-colors text-stone-600"
                    title="Move up"
                    aria-label={`Move ${name} up`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === sections.length - 1}
                    onClick={() => handleMoveSection(index, "down")}
                    className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 transition-colors text-stone-600"
                    title="Move down"
                    aria-label={`Move ${name} down`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1 border-l pl-1.5" style={{ borderColor: "#E4E9E5" }}>
                  <button
                    type="button"
                    onClick={() => setEditingSectionId(isEditing ? null : instance.id)}
                    className={cn(
                      "p-1 rounded hover:bg-stone-100 transition-colors text-stone-600",
                      isEditing && "bg-[#E2F5E9] text-[#176B4D]"
                    )}
                    title="Configure Section"
                    aria-label={`Configure ${name}`}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(instance.id)}
                    className="p-1 rounded hover:bg-stone-100 transition-colors text-stone-600"
                    title={instance.visible ? "Hide Section" : "Show Section"}
                    aria-label={`Toggle visibility of ${name}`}
                  >
                    {instance.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-stone-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(instance.id)}
                    className="p-1 rounded hover:bg-stone-100 transition-colors text-stone-600"
                    title="Duplicate Section"
                    aria-label={`Duplicate ${name}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(instance.id)}
                    className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                    title="Delete Section"
                    aria-label={`Delete ${name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline Settings Drawer if Editing */}
              {isEditing && def && (
                <div className="mt-3 pt-3 border-t border-[#E4E9E5] space-y-3 bg-[#FAF9F6] -mx-2.5 -mb-2.5 p-3 rounded-b-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-[#18231E]">Configure {def.name}</span>
                    <button
                      type="button"
                      onClick={() => handleResetToDefault(instance.id)}
                      className="text-[10px] text-[#176B4D] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset Defaults</span>
                    </button>
                  </div>

                  {/* Layout Variant Selector */}
                  {def.availableLayouts.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-bold text-stone-700 uppercase mb-1">
                        Layout Variant
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {def.availableLayouts.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handleLayoutChange(instance.id, l.id)}
                            className={cn(
                              "text-left p-2 rounded-lg border text-xs transition-all cursor-pointer",
                              instance.layoutVariant === l.id
                                ? "bg-white border-[#176B4D] font-bold text-[#176B4D] shadow-2xs"
                                : "bg-white/60 border-stone-200 text-stone-600 hover:bg-white"
                            )}
                          >
                            <span className="block">{l.label}</span>
                            {l.previewHint && (
                              <span className="text-[10px] font-normal text-stone-400 block mt-0.5">
                                {l.previewHint}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Form Fields */}
                  <div className="space-y-2.5">
                    {def.fields.map((f) => {
                      const val = instance.settings[f.key];

                      if (f.type === "text" || f.type === "url") {
                        return (
                          <div key={f.key}>
                            <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                              {f.label}
                            </label>
                            <input
                              type="text"
                              value={(val as string) ?? ""}
                              placeholder={f.placeholder || ""}
                              onChange={(e) => handleSettingChange(instance.id, f.key, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white focus:border-[#176B4D] focus:outline-hidden"
                            />
                          </div>
                        );
                      }

                      if (f.type === "textarea") {
                        return (
                          <div key={f.key}>
                            <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                              {f.label}
                            </label>
                            <textarea
                              rows={2}
                              value={(val as string) ?? ""}
                              placeholder={f.placeholder || ""}
                              onChange={(e) => handleSettingChange(instance.id, f.key, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white focus:border-[#176B4D] focus:outline-hidden"
                            />
                          </div>
                        );
                      }

                      if (f.type === "boolean") {
                        return (
                          <label key={f.key} className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={!!val}
                              onChange={(e) => handleSettingChange(instance.id, f.key, e.target.checked)}
                              className="h-3.5 w-3.5 text-[#176B4D] rounded-sm accent-[#176B4D]"
                            />
                            <span className="text-xs font-medium text-stone-700">{f.label}</span>
                          </label>
                        );
                      }

                      if (f.type === "select" && f.options) {
                        return (
                          <div key={f.key}>
                            <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                              {f.label}
                            </label>
                            <select
                              value={(val as string) || (f.defaultValue as string)}
                              onChange={(e) => handleSettingChange(instance.id, f.key, e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white focus:border-[#176B4D] focus:outline-hidden"
                            >
                              {f.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (f.type === "image") {
                        return (
                          <div key={f.key} className="space-y-1">
                            <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                              {f.label}
                            </label>
                            <div className="flex items-center gap-2">
                              {storeId && (
                                <label className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg cursor-pointer text-xs font-medium hover:bg-stone-50">
                                  {isUploadingImage ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-[#176B4D]" />
                                  ) : (
                                    <Upload className="h-3 w-3 text-[#176B4D]" />
                                  )}
                                  <span>{isUploadingImage ? "Uploading..." : "Upload"}</span>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    className="hidden"
                                    disabled={isUploadingImage}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setIsUploadingImage(true);
                                      try {
                                        const formData = new FormData();
                                        formData.append("file", file);
                                        formData.append("purpose", "general");
                                        const res = await fetch(`/api/stores/${storeId}/media`, {
                                          method: "POST",
                                          body: formData,
                                        });
                                        if (res.ok) {
                                          const data = await res.json();
                                          handleSettingChange(instance.id, f.key, data.asset.url);
                                        }
                                      } catch (err) {
                                        console.error("Upload failed", err);
                                      } finally {
                                        setIsUploadingImage(false);
                                      }
                                    }}
                                  />
                                </label>
                              )}
                              <input
                                type="url"
                                value={(val as string) ?? ""}
                                placeholder="or paste image URL..."
                                onChange={(e) => handleSettingChange(instance.id, f.key, e.target.value)}
                                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white focus:border-[#176B4D] focus:outline-hidden"
                              />
                            </div>
                            {val ? (
                              <div className="p-1 bg-white border rounded flex items-center justify-between">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={val as string} alt="Thumbnail preview" className="h-6 max-w-[120px] object-contain" />
                                <button
                                  type="button"
                                  onClick={() => handleSettingChange(instance.id, f.key, "")}
                                  className="text-[10px] text-red-600 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      }

                      if (f.type === "items_list" && f.itemSchema) {
                        const items = (Array.isArray(val) ? val : []) as Record<string, unknown>[];
                        const schemaKeys = Object.keys(f.itemSchema);

                        const handleItemChange = (itemIdx: number, subKey: string, subVal: unknown) => {
                          const newItems = items.map((item, i) =>
                            i === itemIdx ? { ...item, [subKey]: subVal } : item
                          );
                          handleSettingChange(instance.id, f.key, newItems);
                        };

                        const handleAddItem = () => {
                          const newItem: Record<string, unknown> = {};
                          for (const k of schemaKeys) {
                            newItem[k] = "";
                          }
                          handleSettingChange(instance.id, f.key, [...items, newItem]);
                        };

                        const handleDeleteItem = (itemIdx: number) => {
                          const newItems = items.filter((_, i) => i !== itemIdx);
                          handleSettingChange(instance.id, f.key, newItems);
                        };

                        return (
                          <div key={f.key} className="space-y-2 pt-1 border-t border-stone-100">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-bold text-stone-700 uppercase">
                                {f.label} ({items.length})
                              </label>
                              <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-[10px] font-semibold text-[#176B4D] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Item</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {items.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="p-2.5 rounded-lg border border-stone-200 bg-[#FAF9F6] space-y-2 relative group"
                                >
                                  <div className="flex items-center justify-between pb-1 border-b border-stone-200/60">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                      Item #{itemIdx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(itemIdx)}
                                      className="text-stone-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                                      title="Delete item"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>

                                  {schemaKeys.map((subKey) => {
                                    const subField = f.itemSchema![subKey];
                                    const subVal = item[subKey];

                                    if (subField.type === "textarea") {
                                      return (
                                        <div key={subKey}>
                                          <label className="block text-[9px] font-semibold text-stone-600 mb-0.5">
                                            {subField.label}
                                          </label>
                                          <textarea
                                            rows={2}
                                            value={(subVal as string) ?? ""}
                                            onChange={(e) => handleItemChange(itemIdx, subKey, e.target.value)}
                                            className="w-full text-xs px-2 py-1 rounded border border-stone-200 bg-white focus:border-[#176B4D] focus:outline-hidden"
                                          />
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={subKey}>
                                        <label className="block text-[9px] font-semibold text-stone-600 mb-0.5">
                                          {subField.label}
                                        </label>
                                        <input
                                          type="text"
                                          value={(subVal as string) ?? ""}
                                          onChange={(e) => handleItemChange(itemIdx, subKey, e.target.value)}
                                          className="w-full text-xs px-2 py-1 rounded border border-stone-200 bg-white focus:border-[#176B4D] focus:outline-hidden"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-stone-200">
            <h3 className="font-bold text-sm text-[#18231E]">Delete Section?</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to remove this section from the storefront? All custom content and layout settings in this block will be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs cursor-pointer"
              >
                Delete Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal / Drawer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#18231E]">Add Section to Storefront</h3>
                <p className="text-xs text-stone-500">
                  Select from over 20+ responsive components with distinct layout variants.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-stone-100 overflow-x-auto">
              {[
                { id: "all", label: "All Sections" },
                { id: "hero", label: "Hero & Promo" },
                { id: "products", label: "Products & Collections" },
                { id: "editorial", label: "Brand & Editorial" },
                { id: "info", label: "Info & Conversion" },
                { id: "footer", label: "Footer" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id as SectionCategory | "all")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap cursor-pointer",
                    selectedCategory === tab.id
                      ? "text-[#176B4D] border-b-2 border-[#176B4D]"
                      : "text-stone-500 hover:text-stone-800"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Section Cards Grid */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_SECTION_DEFINITIONS.filter(
                (def) => selectedCategory === "all" || def.category === selectedCategory
              ).map((def) => {
                const isRecommended =
                  industry && def.recommendedIndustries?.includes(industry);

                return (
                  <div
                    key={def.type}
                    onClick={() => handleAddSection(def.type)}
                    className="group p-4 rounded-2xl border border-stone-200 hover:border-[#176B4D] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 bg-[#FAF9F6] hover:bg-white"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#176B4D] shadow-2xs group-hover:bg-[#E2F5E9]">
                          {iconMap[def.icon] || <Sparkles className="h-4 w-4" />}
                        </div>
                        {isRecommended && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Recommended
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-[#18231E] group-hover:text-[#176B4D]">
                        {def.name}
                      </h4>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                        {def.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                      <span>{def.availableLayouts.length} layout variants</span>
                      <span className="font-semibold text-[#176B4D] group-hover:underline flex items-center gap-1">
                        <span>Add</span>
                        <Plus className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}
