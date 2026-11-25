import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { LeadFormRepository } from "@/lib/repositories/lead-form.repository";
import { UnpublishedStoreView } from "@/components/storefront/UnpublishedStoreView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DedicatedFormPageProps {
  params: Promise<{ slug: string; formId: string }>;
}

export default async function DedicatedFormPage({ params }: DedicatedFormPageProps) {
  const { slug, formId } = await params;
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

  const form = await LeadFormRepository.findById(store.id, formId);
  if (!form) {
    notFound();
  }

  const steps = form.publishedSteps || form.currentDraft.steps;
  const settings = form.publishedSettings || form.currentDraft.settings;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#18231E] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/store/${store.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#66736C] hover:text-[#18231E] font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {store.name}</span>
          </Link>
          {!isPublished && (
            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              Internal Preview
            </span>
          )}
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-[#E4E9E5] shadow-xs space-y-6">
          <div className="border-b border-[#F0F4F1] pb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[#18231E]">{form.name}</h1>
            {form.description && (
              <p className="text-xs sm:text-sm text-[#4F5D56] mt-1">{form.description}</p>
            )}
          </div>

          {/* Client-side form submitter wrapper */}
          <DedicatedFormClient slug={store.slug} formId={form.id} steps={steps} settings={settings} />
        </div>

        <footer className="text-center text-xs text-[#909D96]">
          © {new Date().getFullYear()} {store.name}. Secured with 256-bit encryption.
        </footer>
      </div>
    </div>
  );
}

// Inline client component for form submission interaction
import { DedicatedFormClient } from "./DedicatedFormClient";
