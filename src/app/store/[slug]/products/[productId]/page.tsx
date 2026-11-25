import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { UnpublishedStoreView } from "@/components/storefront/UnpublishedStoreView";
import { ProductDetailClient } from "@/components/storefront/ProductDetailClient";
import { CartProvider } from "@/context/CartContext";
import {
  serializeStore,
  serializeTemplate,
  serializeProduct,
  serializeProducts,
} from "@/lib/serialization";

interface ProductPageProps {
  params: Promise<{ slug: string; productId: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug, productId } = await params;
  const [store, product] = await Promise.all([
    StoreRepository.findBySlug(slug),
    ProductRepository.findById(productId),
  ]);

  if (!store || !product) {
    return { title: "Product Not Found | GridRetail" };
  }

  const title = `${product.name} | ${store.name}`;
  const description =
    product.description ||
    `Explore ${product.name} at ${store.name}. High quality, fast delivery, and secure shopping.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug, productId } = await params;
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

  // Load product and verify ownership / tenant isolation
  const product = await ProductRepository.findById(productId);
  if (!product) {
    notFound();
  }

  // If product belongs to a different store and isn't in store's selectedProductIds, block access
  if (
    product.storeId &&
    product.storeId !== store.id &&
    !(store.selectedProductIds && store.selectedProductIds.includes(product.id))
  ) {
    notFound();
  }

  // If public visitor, do not show draft product
  if (isPublished && !isStaffAuthorized && (product.status || "active") === "draft") {
    notFound();
  }

  // Load related products & template
  let storeProducts = await ProductRepository.findByStoreId(store.id);
  if (storeProducts.length === 0 && store.selectedProductIds && store.selectedProductIds.length > 0) {
    storeProducts = await ProductRepository.findByIds(store.selectedProductIds);
  }
  if (storeProducts.length === 0) {
    storeProducts = await ProductRepository.findAll({ category: product.category });
  }

  // Filter out current product and draft products for public
  const related = storeProducts
    .filter((p) => p.id !== product.id)
    .filter((p) => (!isPublished || isStaffAuthorized ? true : (p.status || "active") === "active"))
    .slice(0, 4);

  const template = await TemplateRepository.findById(store.templateId);

  return (
    <CartProvider storeSlug={store.slug}>
      <ProductDetailClient
        store={serializeStore(store)}
        product={serializeProduct(product)}
        relatedProducts={serializeProducts(related)}
        template={serializeTemplate(template)}
        storeSlug={store.slug}
      />
    </CartProvider>
  );
}
