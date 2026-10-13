import React from "react";
import { notFound } from "next/navigation";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { Product } from "@/types";
import { StorefrontView } from "@/components/storefront/StorefrontView";

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    notFound();
  }

  // Load template metadata
  const template = await TemplateRepository.findById(store.templateId);

  // Load configured products or fallback to industry products
  let products: Product[] = [];
  if (store.selectedProductIds && store.selectedProductIds.length > 0) {
    products = await ProductRepository.findByIds(store.selectedProductIds);
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll({ category: store.industry });
  }
  if (products.length === 0) {
    products = await ProductRepository.findAll();
  }

  return (
    <StorefrontView
      initialStore={store}
      template={template}
      initialProducts={products}
    />
  );
}
