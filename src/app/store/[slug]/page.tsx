import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { AppointmentWebsiteView } from "@/components/storefront/AppointmentWebsiteView";
import { LeadGenWebsiteView } from "@/components/storefront/LeadGenWebsiteView";
import { LeadFormRepository } from "@/lib/repositories/lead-form.repository";

import { UnpublishedStoreView } from "@/components/storefront/UnpublishedStoreView";
import { ExternalLink, ShieldCheck } from "lucide-react";
import {
  serializeStore,
  serializeTemplate,
  serializeProducts,
} from "@/lib/serialization";

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const store = await StoreRepository.findBySlug(slug);

  if (!store) {
    notFound();
  }

  // Publication Security Guard (Section 6: A hostname is not an authorization mechanism)
  // Unpublished stores (Draft, In Progress, Pending Review, etc.) are NOT publicly accessible.
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

  // Load template and products concurrently
  const loadProducts = async () => {
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
    // Tenant & lifecycle isolation: Public visitors must only see active products
    if (isPublished && !isStaffAuthorized) {
      prods = prods.filter((p) => (p.status || "active") === "active");
    }
    return prods;
  };


  if (store.websiteType === "appointments") {
    const [template, services, providers] = await Promise.all([
      TemplateRepository.findById(store.templateId),
      ServiceRepository.findByStoreId(store.id, isPublished && !isStaffAuthorized ? { status: "active" } : undefined),
      ProviderRepository.findByStoreId(store.id, isPublished && !isStaffAuthorized ? { status: "active" } : undefined),
    ]);

    return (
      <div>
        {!isPublished && isStaffAuthorized && (
          <div className="bg-[#18231E] text-white px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#2C3B34]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span className="font-semibold">Workspace Internal Preview</span>
              <span className="text-stone-400 hidden sm:inline">
                • Status: <strong className="text-amber-300 font-semibold">{store.status}</strong> (Appointment Scheduling Website)
              </span>
            </div>
            <Link
              href={`/stores/${store.id}/preview`}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium underline"
            >
              <span>Edit in Visual Customizer</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
        <AppointmentWebsiteView
          store={serializeStore(store)}
          services={services}
          providers={providers}
          template={template ? serializeTemplate(template) : null}
          isPreview={!isPublished && isStaffAuthorized}
        />
      </div>
    );
  }

  if (store.websiteType === "lead_gen") {
    const leadForm = await LeadFormRepository.findDefaultByStore(store.id);

    return (
      <div>
        {!isPublished && isStaffAuthorized && (
          <div className="bg-[#18231E] text-white px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#2C3B34]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span className="font-semibold">Workspace Internal Preview</span>
              <span className="text-stone-400 hidden sm:inline">
                • Status: <strong className="text-amber-300 font-semibold">{store.status}</strong> (Lead Generation Website)
              </span>
            </div>
            <Link
              href={`/stores/${store.id}/preview`}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium underline"
            >
              <span>Edit in Visual Customizer</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
        <LeadGenWebsiteView
          store={serializeStore(store)}
          leadForm={leadForm || undefined}
          previewMode={!isPublished && isStaffAuthorized}
        />
      </div>
    );
  }

  const [template, products] = await Promise.all([
    TemplateRepository.findById(store.templateId),
    loadProducts(),
  ]);

  return (
    <div>
      {!isPublished && isStaffAuthorized && (
        <div className="bg-[#18231E] text-white px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#2C3B34]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span className="font-semibold">Workspace Internal Preview</span>
            <span className="text-stone-400 hidden sm:inline">
              • Status: <strong className="text-amber-300 font-semibold">{store.status}</strong> (Not accessible to unauthenticated public visitors)
            </span>
          </div>
          <Link
            href={`/stores/${store.id}/preview`}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium underline"
          >
            <span>Edit in Visual Customizer</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
      <StorefrontView
        initialStore={serializeStore(store)}
        template={serializeTemplate(template)}
        initialProducts={serializeProducts(products)}
      />
    </div>
  );
}
