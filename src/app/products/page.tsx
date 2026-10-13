"use client";

import React, { useState, useMemo } from "react";
import { PackagePlus, RefreshCw, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { PlaceholderModal } from "@/components/shared/PlaceholderModal";
import { MOCK_PRODUCTS } from "@/mock";
import { Product } from "@/types";

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  const categoryOptions = [
    { value: "ALL", label: "All Categories" },
    { value: "Home & Living", label: "Home & Living" },
    { value: "Electronics & Gadgets", label: "Electronics & Gadgets" },
    { value: "Beauty & Cosmetics", label: "Beauty & Cosmetics" },
    { value: "Fashion & Apparel", label: "Fashion & Apparel" },
    { value: "Food & Gourmet", label: "Food & Gourmet" },
    { value: "Sports & Outdoors", label: "Sports & Outdoors" },
  ];

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.storeName && product.storeName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === "ALL" || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
  };

  const handleInspect = (product: Product) => {
    setSelectedProduct(product);
    setInspectModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Product Catalog"
        description="Demo inventory catalog for storefront population, product attribute modeling, and retail mockups."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            {filteredProducts.length} Demo SKUs
          </span>
        }
      >
        <Button
          variant="primary"
          size="md"
          onClick={() => setAddProductModalOpen(true)}
          leftIcon={<PackagePlus className="h-4 w-4" />}
        >
          Add Product SKU
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E4E9E5]">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Search by product title, SKU, or assigned store..."
          wrapperClassName="max-w-md w-full"
        />

        <div className="flex items-center gap-2">
          <FilterSelect
            label="Category"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          />

          {(searchQuery || categoryFilter !== "ALL") && (
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

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try modifying your category filter or searching for another SKU term."
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
                    <th className="px-6 py-3.5">Product & SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Unit Price</th>
                    <th className="px-6 py-3.5">Assigned Store</th>
                    <th className="px-6 py-3.5">Stock Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F1]">
                  {filteredProducts.map((prod) => (
                    <tr
                      key={prod.id}
                      className="hover:bg-[#FAF9F6]/60 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg ${prod.thumbnailColor} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                          >
                            {prod.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#18231E] truncate group-hover:text-[#176B4D] transition-colors">
                              {prod.name}
                            </p>
                            <p className="text-xs text-[#66736C] font-mono">
                              {prod.sku}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-[#4F5D56] bg-[#F0F4F1] px-2.5 py-1 rounded-md">
                          {prod.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-[#18231E]">
                        ${prod.price.toFixed(2)}{" "}
                        <span className="text-[10px] text-[#66736C] font-normal">
                          {prod.currency}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-[#4F5D56]">
                        {prod.storeName || "Unassigned"}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={prod.stockStatus} size="sm" />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInspect(prod)}
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
        isOpen={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        featureName="Add Product / CSV Import"
        description="Catalog creation, CSV/Excel spreadsheet bulk upload, and cloud image persistence will be implemented in later phases."
      />

      {selectedProduct && (
        <PlaceholderModal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          featureName={`Product Detail: ${selectedProduct.name}`}
          targetPhase="Phase 2 (Product Catalog Engine)"
          description={`SKU: ${selectedProduct.sku} | Price: $${selectedProduct.price.toFixed(2)} | Category: ${selectedProduct.category}. ${selectedProduct.description}`}
        />
      )}
    </div>
  );
}
