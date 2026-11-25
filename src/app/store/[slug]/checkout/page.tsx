import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { CheckoutPageClient } from "@/components/storefront/CheckoutPageClient";
import { UnpublishedStoreView } from "@/components/storefront/UnpublishedStoreView";
import { CartProvider } from "@/context/CartContext";
import { serializeStore, serializeTemplate, serializeProducts } from "@/lib/serialization";

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    notFound();
  }

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

  // Load store products
  let prods = await ProductRepository.findByStoreId(store.id);
  if (prods.length === 0 && store.selectedProductIds && store.selectedProductIds.length > 0) {
    prods = await ProductRepository.findByIds(store.selectedProductIds);
  }
  if (prods.length === 0) {
    prods = await ProductRepository.findAll({ category: store.industry });
  }
  if (prods.length === 0) {
    prods = await ProductRepository.findAll();
  }

  if (isPublished && !isStaffAuthorized) {
    prods = prods.filter((p) => (p.status || "active") === "active");
  }

  const template = await TemplateRepository.findById(store.templateId);

  return (
    <CartProvider storeSlug={store.slug}>
      <CheckoutPageClient
        store={serializeStore(store)}
        products={serializeProducts(prods)}
        template={template ? serializeTemplate(template) : null}
        storeSlug={slug}
      />
    </CartProvider>
  );
}
