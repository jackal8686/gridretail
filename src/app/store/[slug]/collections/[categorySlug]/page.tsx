import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { UnpublishedStoreView } from "@/components/storefront/UnpublishedStoreView";
import { CollectionsClient } from "@/components/storefront/CollectionsClient";
import { CartProvider } from "@/context/CartContext";
import {
  serializeStore,
  serializeTemplate,
  serializeProducts,
} from "@/lib/serialization";

interface CategoryPageProps {
  params: Promise<{ slug: string; categorySlug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug, categorySlug } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    return { title: "Category Not Found | GridRetail" };
  }

  const catObj = store.categories?.find(
    (c) => c.slug === categorySlug || c.name.toLowerCase().replace(/\s+/g, "-") === categorySlug
  );
  const catName = catObj?.name || categorySlug.replace(/-/g, " ").toUpperCase();

  const title = `${catName} | ${store.name}`;
  const description =
    catObj?.description ||
    `Browse the ${catName} collection from ${store.name}. High quality, fast delivery, and secure shopping.`;

  return {
    title,
    description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug, categorySlug } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    notFound();
  }

  // Security guard for publication status
  const isPublished = store.status === "Published";
  const session = await auth();
  const isStaffAuthorized = !!session?.user;

  if (!isPublished && !isStaffAuthorized) {
    return (
      <UnpublishedStoreView
        storeName={store.name}
        status={store.status}
        slug={store.slug}
      />
    );
  }

  // Load products for this store
  let products = await ProductRepository.findByStoreId(store.id);
  if (products.length === 0 && store.selectedProductIds && store.selectedProductIds.length > 0) {
    products = await ProductRepository.findByIds(store.selectedProductIds);
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll({ category: store.industry });
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll();
  }

  // Filter out draft products for public visitors
  if (isPublished && !isStaffAuthorized) {
    products = products.filter((p) => (p.status || "active") === "active");
  }

  // Derive categories
  const categories = store.categories && store.categories.length > 0
    ? store.categories
    : Array.from(new Set(products.map((p) => p.category))).map((cat) => ({
        id: cat.toLowerCase().replace(/\s+/g, "-"),
        name: cat,
        slug: cat.toLowerCase().replace(/\s+/g, "-"),
      }));

  const template = await TemplateRepository.findById(store.templateId);

  return (
    <CartProvider storeSlug={store.slug}>
      <CollectionsClient
        store={serializeStore(store)}
        products={serializeProducts(products)}
        categories={categories}
        currentCategorySlug={categorySlug}
        template={serializeTemplate(template)}
        storeSlug={store.slug}
      />
    </CartProvider>
  );
}
