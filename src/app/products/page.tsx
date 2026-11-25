"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PackagePlus, RefreshCw, Eye, Edit2, Trash2, X, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Product } from "@/types";
import { formatINR } from "@/utils/currency";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Form modal state (Add / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("Home & Living");
  const [formStockStatus, setFormStockStatus] = useState<"In Stock" | "Low Stock" | "Out of Stock">("In Stock");
  const [formDescription, setFormDescription] = useState("");
  const [formStoreName, setFormStoreName] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inspect details modal
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  // Delete modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoryOptions = [
    { value: "ALL", label: "All Categories" },
    { value: "Home & Living", label: "Home & Living" },
    { value: "Electronics & Gadgets", label: "Electronics & Gadgets" },
    { value: "Beauty & Cosmetics", label: "Beauty & Cosmetics" },
    { value: "Fashion & Apparel", label: "Fashion & Apparel" },
    { value: "Food & Gourmet", label: "Food & Gourmet" },
    { value: "Sports & Outdoors", label: "Sports & Outdoors" },
  ];

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.storeName && product.storeName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === "ALL" || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormPrice("1999");
    setFormCategory("Home & Living");
    setFormStockStatus("In Stock");
    setFormDescription("");
    setFormStoreName("");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormPrice(String(product.price));
    setFormCategory(product.category);
    setFormStockStatus(product.stockStatus || "In Stock");
    setFormDescription(product.description || "");
    setFormStoreName(product.storeName || "");
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Please enter a valid non-negative price.");
      setFormLoading(false);
      return;
    }

    try {
      if (editingProduct) {
        // Edit existing product
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            sku: formSku.trim().toUpperCase(),
            price: priceNum,
            category: formCategory,
            stockStatus: formStockStatus,
            description: formDescription.trim(),
            storeName: formStoreName.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update product");
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? data.product : p))
        );
      } else {
        // Create new product
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            sku: formSku.trim().toUpperCase(),
            price: priceNum,
            category: formCategory,
            stockStatus: formStockStatus,
            description: formDescription.trim(),
            storeName: formStoreName.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create product");
        setProducts((prev) => [data.product, ...prev]);
      }
      setIsFormModalOpen(false);
    } catch (err: unknown) {
      setFormError((err as Error).message || "Operation failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
        setProductToDelete(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete product");
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
    } finally {
      setIsDeleting(false);
    }
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
          onClick={handleOpenAddModal}
          leftIcon={<PackagePlus className="h-4 w-4" />}
          className="bg-[#176B4D] text-white hover:bg-[#12533B]"
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
      {isLoading ? (
        <div className="py-20 text-center text-xs text-stone-500">
          Loading product catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
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
                            className={`h-10 w-10 rounded-lg ${prod.thumbnailColor || "bg-emerald-100 text-emerald-800"} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
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
                        {formatINR(prod.price)}
                      </td>

                      <td className="px-6 py-4 text-xs text-[#4F5D56]">
                        {prod.storeName || "Unassigned"}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={prod.stockStatus} size="sm" />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInspectProduct(prod)}
                            leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                            title="View product details"
                          >
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(prod)}
                            leftIcon={<Edit2 className="h-3.5 w-3.5 text-blue-600" />}
                            title="Edit product SKU"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProductToDelete(prod)}
                            className="text-rose-600 hover:bg-rose-50"
                            title="Delete product permanently"
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

      {/* Product Form Modal (Add / Edit) */}
      {isFormModalOpen && (
        <div
          data-testid="product-form-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : "Add New Product SKU"}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {editingProduct ? "Modify SKU properties and stock status." : "Create a new catalog item for storefront showcase."}
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

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-800 block">Product Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Nordic Wool Throw Blanket"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">SKU Code *</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    required
                    placeholder="e.g. BLKT-01"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">Unit Price (INR) *</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  >
                    {categoryOptions.filter((c) => c.value !== "ALL").map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 block">Stock Status</label>
                  <select
                    value={formStockStatus}
                    onChange={(e) => setFormStockStatus(e.target.value as "In Stock" | "Low Stock" | "Out of Stock")}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800 block">Assigned Storefront Name (Optional)</label>
                <input
                  type="text"
                  value={formStoreName}
                  onChange={(e) => setFormStoreName(e.target.value)}
                  placeholder="e.g. Aura Minimalist Living"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800 block">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Product specifications, materials, and care..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#176B4D]"
                />
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
                  {formLoading ? "Saving..." : editingProduct ? "Save Changes" : "Create Product SKU"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Details Modal */}
      {inspectProduct && (
        <div
          data-testid="product-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">{inspectProduct.name}</h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">{inspectProduct.sku}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Unit Price</span>
                  <span className="font-bold text-stone-900 text-sm">{formatINR(inspectProduct.price)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Stock Status</span>
                  <div className="mt-1"><StatusBadge status={inspectProduct.stockStatus} size="sm" /></div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Category</span>
                  <span className="font-medium text-stone-800">{inspectProduct.category}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Assigned Store</span>
                  <span className="font-medium text-stone-800">{inspectProduct.storeName || "Unassigned"}</span>
                </div>
              </div>

              {inspectProduct.description && (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Specifications</span>
                  <p className="text-stone-700 leading-relaxed">{inspectProduct.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = inspectProduct;
                  setInspectProduct(null);
                  handleOpenEditModal(p);
                }}
              >
                Edit SKU
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setInspectProduct(null)}
                className="bg-[#176B4D] text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div
          data-testid="delete-product-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-stone-900">Delete Product SKU</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong>{productToDelete.name}</strong> ({productToDelete.sku})? This product will be removed from all demo storefront catalogs.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
