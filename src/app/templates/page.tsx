"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, Eye, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlaceholderModal } from "@/components/shared/PlaceholderModal";
import { MOCK_TEMPLATES } from "@/mock";
import { Template } from "@/types";

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const industryOptions = [
    { value: "ALL", label: "All Industries" },
    { value: "Home & Living", label: "Home & Living" },
    { value: "Electronics & Gadgets", label: "Electronics & Gadgets" },
    { value: "Fashion & Apparel", label: "Fashion & Apparel" },
    { value: "Beauty & Cosmetics", label: "Beauty & Cosmetics" },
    { value: "Food & Gourmet", label: "Food & Gourmet" },
    { value: "Sports & Outdoors", label: "Sports & Outdoors" },
    { value: "Health & Wellness", label: "Health & Wellness" },
    { value: "Luxury Goods", label: "Luxury Goods" },
  ];

  const filteredTemplates = useMemo(() => {
    return MOCK_TEMPLATES.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.industry.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesIndustry =
        industryFilter === "ALL" ||
        tpl.industry === industryFilter ||
        tpl.compatibleIndustries.includes(industryFilter);

      return matchesSearch && matchesIndustry;
    });
  }, [searchQuery, industryFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setIndustryFilter("ALL");
  };

  const handlePreview = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Template Library"
        description="Curated high-converting storefront architectures engineered for rapid demo generation across diverse retail verticals."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            8 Architectures
          </span>
        }
      >
        <div className="text-xs text-[#66736C] bg-white px-3 py-1.5 rounded-lg border border-[#E4E9E5] flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#176B4D]" />
          <span>Full 8-template storefront rendering engine unlocks in Phase 2</span>
        </div>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9E5]">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Search by template name, style, or industry..."
          wrapperClassName="max-w-md w-full"
        />

        <div className="flex items-center gap-2">
          <FilterSelect
            label="Industry"
            options={industryOptions}
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          />

          {(searchQuery || industryFilter !== "ALL") && (
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

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          title="No storefront templates match criteria"
          description="Try resetting your industry filter or clearing the search keyword."
          actionLabel="Clear Filters"
          onAction={resetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              hoverEffect
              className="flex flex-col overflow-hidden group border-[#E4E9E5]"
            >
              {/* CSS Composition Visual Preview */}
              <div
                className={`h-40 w-full bg-gradient-to-br ${template.thumbnailGradient} p-4 flex flex-col justify-between relative border-b border-[#E4E9E5] overflow-hidden`}
              >
                {/* Visual Wireframe Mockup Simulation */}
                <div className="absolute inset-0 opacity-15 flex flex-col p-3 gap-2 pointer-events-none">
                  <div className="h-3 w-1/3 bg-current rounded-xs" />
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div className="bg-current rounded-xs" />
                    <div className="bg-current rounded-xs" />
                    <div className="bg-current rounded-xs" />
                  </div>
                </div>

                <div className="flex items-center justify-between z-10">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-[#18231E] shadow-2xs">
                    {template.layoutType}
                  </span>
                  {template.featured && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#176B4D] text-white shadow-2xs">
                      Popular
                    </span>
                  )}
                </div>

                {/* Color swatches */}
                <div className="flex items-center gap-1.5 z-10 bg-white/80 backdrop-blur-xs p-1.5 rounded-md w-fit shadow-2xs">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: template.colorPalette.primary }}
                    title={`Primary: ${template.colorPalette.primary}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: template.colorPalette.secondary }}
                    title={`Secondary: ${template.colorPalette.secondary}`}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: template.colorPalette.accent }}
                    title={`Accent: ${template.colorPalette.accent}`}
                  />
                </div>
              </div>

              {/* Template Content */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base text-[#18231E] group-hover:text-[#176B4D] transition-colors">
                      {template.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] bg-[#E2F5E9] text-[#176B4D] font-medium px-2 py-0.5 rounded">
                      {template.style}
                    </span>
                    <span className="text-[10px] bg-[#FAF9F6] text-[#66736C] font-medium px-2 py-0.5 rounded border border-[#E4E9E5]">
                      {template.industry}
                    </span>
                  </div>

                  <p className="text-xs text-[#66736C] mt-3 line-clamp-3 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F0F4F1] flex items-center justify-between text-[11px] text-[#66736C]">
                  <span>Compatible with:</span>
                  <span className="font-medium text-[#18231E]">
                    {template.compatibleIndustries.length} industries
                  </span>
                </div>
              </CardContent>

              {/* Card Footer Action */}
              <CardFooter className="p-3 bg-[#FAF9F6] border-t border-[#F0F4F1]">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handlePreview(template)}
                  leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                >
                  Preview Layout Specs
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {selectedTemplate && (
        <PlaceholderModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          featureName={`Template Architecture: ${selectedTemplate.name}`}
          targetPhase="Phase 2 (Store Engine)"
          description={`Layout: ${selectedTemplate.layoutType} | Style: ${selectedTemplate.style} | Primary Sector: ${selectedTemplate.industry}. The dynamic live storefront iframe renderer and customizable design tokens will be available when the store generator is implemented in Phase 2.`}
        />
      )}
    </div>
  );
}
