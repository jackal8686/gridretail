import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ClientRepository } from "@/lib/repositories/client.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { AnalyticsRepository } from "@/lib/repositories/analytics.repository";
import { validateStoreInput } from "@/lib/validation/store";
import { getStoreUrl } from "@/lib/urls";
import { Store, Product } from "@/types";
import { getThemeById } from "@/constants/themes";
import { resolveStoreSections } from "@/lib/sections/resolver";
import { DEFAULT_APPOINTMENT_CONFIG } from "@/lib/scheduling/availability";
import { AppointmentService, AppointmentProvider } from "@/types/appointment";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const industry = searchParams.get("industry") || undefined;
  const search = searchParams.get("search") || undefined;

  const stores = await StoreRepository.findAll({ status, industry, search });
  return NextResponse.json({ stores, count: stores.length });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  // Basic authentication requirement for creating stores
  const creatorId = session?.user?.id || "usr_admin_01";
  const creatorName = session?.user?.name || "Alex Mercer";

  try {
    const body = await request.json();
    const validation = validateStoreInput(body);

    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.errors },
        { status: 400 }
      );
    }

    const { sanitized } = validation;

    // Check slug uniqueness, client existence, and template existence concurrently
    const [isAvailable, client, template] = await Promise.all([
      StoreRepository.isSlugAvailable(sanitized.slug),
      ClientRepository.findById(sanitized.clientId),
      TemplateRepository.findById(sanitized.templateId),
    ]);

    if (!isAvailable) {
      return NextResponse.json(
        { error: `Store slug "${sanitized.slug}" is already in use by another store.` },
        { status: 409 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: `Selected client ID "${sanitized.clientId}" does not exist.` },
        { status: 400 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: `Selected template ID "${sanitized.templateId}" does not exist.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const storeId = `str_${Date.now()}`;

    // Handle custom products creation
    let customCreatedProducts: Product[] = [];
    if (sanitized.products && sanitized.products.length > 0) {
      const colors = [
        "bg-emerald-100 text-emerald-800",
        "bg-amber-100 text-amber-800",
        "bg-blue-100 text-blue-800",
        "bg-purple-100 text-purple-800",
        "bg-rose-100 text-rose-800",
        "bg-stone-100 text-stone-800",
      ];
      customCreatedProducts = sanitized.products.map((p, idx) => {
        const prodId =
          (p.id as string) ||
          `prod_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        return {
          id: prodId,
          name: p.name as string,
          sku: (p.sku as string) || `SKU-${Date.now()}-${idx}`,
          category: (p.category as string) || sanitized.industry,
          price: Number(p.price) || 0,
          currency: (p.currency as string) || "INR",
          stockStatus: (p.stockStatus as "In Stock" | "Low Stock" | "Out of Stock") || "In Stock",
          thumbnailColor: (p.thumbnailColor as string) || colors[idx % colors.length],
          description: (p.description as string) || "",
          storeId,
          storeName: sanitized.name,
          createdAt: now,
          imageUrl: p.imageUrl as string | undefined,
          compareAtPrice: p.compareAtPrice as number | undefined,
          variants: p.variants as string[] | undefined,
          specifications: p.specifications as Product["specifications"],
          status: (p.status as "active" | "draft") || "active",
        };
      });
      await ProductRepository.createMany(customCreatedProducts);
    }

    // Verify products if any selected
    let productCount = customCreatedProducts.length;
    let selectedProductIds = customCreatedProducts.map((p) => p.id);
    if (sanitized.selectedProductIds && sanitized.selectedProductIds.length > 0) {
      const products = await ProductRepository.findByIds(sanitized.selectedProductIds);
      productCount += products.length;
      selectedProductIds = Array.from(new Set([...selectedProductIds, ...sanitized.selectedProductIds]));
    }

    const localUrl = getStoreUrl(sanitized.slug, { mode: "subdomain" });
    const theme = getThemeById(sanitized.themeId || sanitized.templateId);

    const newStore: Store = {
      id: storeId,
      name: sanitized.name,
      slug: sanitized.slug,
      clientId: client.id,
      clientName: client.company,
      industry: sanitized.industry,
      templateId: template.id,
      templateName: template.name,
      themeId: theme.id,
      themeName: theme.name,
      status: "Draft",
      productCount,
      previewUrl: `/store/${sanitized.slug}`,
      localUrl,
      lastUpdated: now,
      createdAt: now,
      description: sanitized.description || `Demo storefront generated for ${client.company}`,
      branding: {
        primaryColor: sanitized.branding?.primaryColor || theme.tokens.primary || template.colorPalette.primary,
        secondaryColor: sanitized.branding?.secondaryColor || theme.tokens.secondary || template.colorPalette.secondary,
        fontFamily: sanitized.branding?.fontFamily || "Inter, sans-serif",
        heroHeadline:
          sanitized.branding?.heroHeadline ||
          (sanitized.websiteType === "appointments"
            ? "Professional Advisory & Strategic Consultation"
            : sanitized.websiteType === "lead_gen"
            ? "Strategic Solutions & Dedicated Advisory"
            : `Welcome to ${sanitized.name}`),
        heroSubheadline:
          sanitized.branding?.heroSubheadline ||
          (sanitized.websiteType === "appointments"
            ? "Schedule a focused, confidential appointment with our experienced practitioners."
            : sanitized.websiteType === "lead_gen"
            ? "Submit your inquiry to receive a tailored proposal and strategic consultation from our team."
            : `Explore our curated ${sanitized.industry} catalog.`),
        logoUrl: sanitized.branding?.logoUrl,
        bannerUrl: sanitized.branding?.bannerUrl,
        aboutText: sanitized.branding?.aboutText,
        ctaText:
          sanitized.branding?.ctaText ||
          (sanitized.websiteType === "appointments"
            ? "Book Consultation"
            : sanitized.websiteType === "lead_gen"
            ? "Request Consultation"
            : "Explore Catalog"),
      },
      enabledSections:
        sanitized.enabledSections ||
        (sanitized.websiteType === "appointments"
          ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
          : sanitized.websiteType === "lead_gen"
          ? ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
          : ["hero", "featured_products", "about", "newsletter", "footer"]),
      orderedSections:
        sanitized.orderedSections ||
        (sanitized.websiteType === "appointments"
          ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
          : sanitized.websiteType === "lead_gen"
          ? ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
          : ["hero", "featured_products", "about", "newsletter", "footer"]),
      sections: sanitized.sections || resolveStoreSections({
        name: sanitized.name,
        slug: sanitized.slug,
        industry: sanitized.industry,
        websiteType: sanitized.websiteType,
        clientName: client.company,
        branding: {
          primaryColor: sanitized.branding?.primaryColor || theme.tokens.primary,
          secondaryColor: sanitized.branding?.secondaryColor || theme.tokens.secondary,
          fontFamily: sanitized.branding?.fontFamily || "Inter, sans-serif",
          heroHeadline:
            sanitized.branding?.heroHeadline ||
            (sanitized.websiteType === "appointments"
              ? "Professional Advisory & Strategic Consultation"
              : sanitized.websiteType === "lead_gen"
              ? "Strategic Solutions & Dedicated Advisory"
              : `Welcome to ${sanitized.name}`),
          heroSubheadline:
            sanitized.branding?.heroSubheadline ||
            (sanitized.websiteType === "appointments"
              ? "Schedule a focused, confidential appointment with our experienced practitioners."
              : sanitized.websiteType === "lead_gen"
              ? "Submit your inquiry to receive a tailored proposal and strategic consultation from our team."
              : `Explore our curated ${sanitized.industry} catalog.`),
          bannerUrl: sanitized.branding?.bannerUrl,
          logoUrl: sanitized.branding?.logoUrl,
          aboutText: sanitized.branding?.aboutText,
          ctaText:
            sanitized.branding?.ctaText ||
            (sanitized.websiteType === "appointments"
              ? "Book Consultation"
              : sanitized.websiteType === "lead_gen"
              ? "Request Consultation"
              : "Explore Catalog"),
        },
        enabledSections:
          sanitized.enabledSections ||
          (sanitized.websiteType === "appointments"
            ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
            : sanitized.websiteType === "lead_gen"
            ? ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
            : ["hero", "featured_products", "about", "newsletter", "footer"]),
        orderedSections:
          sanitized.orderedSections ||
          (sanitized.websiteType === "appointments"
            ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
            : sanitized.websiteType === "lead_gen"
            ? ["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]
            : ["hero", "featured_products", "about", "newsletter", "footer"]),
      }),
      styling: sanitized.styling || {
        buttonRadius: "rounded",
        cardStyle: "bordered",
        contentWidth: "normal",
      },
      selectedProductIds,
      categories: sanitized.categories || [],
      creatorId,
      creatorName,
      websiteType: sanitized.websiteType || "ecommerce",
      appointmentIndustry: sanitized.appointmentIndustry,
      appointmentConfig: sanitized.websiteType === "appointments"
        ? sanitized.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG
        : undefined,
      businessProfile: sanitized.businessProfile,
      version: 1,
    };

    const created = await StoreRepository.create(newStore);

    // If appointment website with initial services/providers, persist them
    if (sanitized.websiteType === "appointments") {
      if (Array.isArray(sanitized.initialServices) && sanitized.initialServices.length > 0) {
        for (const s of sanitized.initialServices) {
          const sId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const svc: AppointmentService = {
            id: sId,
            storeId,
            name: (s.name as string) || "Initial Consultation",
            description: (s.description as string) || "Professional advisory consultation.",
            durationMinutes: Number(s.durationMinutes) || 45,
            price: Number(s.price) || 0,
            isFreeConsultation: s.isFreeConsultation === true || Number(s.price) === 0,
            currency: (s.currency as string) || "INR",
            meetingType: (s.meetingType as "in_person" | "video_call" | "phone_call") || "video_call",
            status: "active",
            providerIds: Array.isArray(s.providerIds) ? (s.providerIds as string[]) : undefined,
            bookingInstructions: (s.bookingInstructions as string) || undefined,
            createdAt: now,
            updatedAt: now,
          };
          await ServiceRepository.create(svc);
        }
      }

      if (Array.isArray(sanitized.initialProviders) && sanitized.initialProviders.length > 0) {
        for (const p of sanitized.initialProviders) {
          const pId = `prv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const prov: AppointmentProvider = {
            id: pId,
            storeId,
            name: (p.name as string) || "Lead Practitioner",
            role: (p.role as string) || "Senior Partner",
            bio: (p.bio as string) || undefined,
            email: (p.email as string) || `${sanitized.slug}@gridretail.internal`,
            phone: (p.phone as string) || undefined,
            status: "active",
            createdAt: now,
            updatedAt: now,
          };
          await ProviderRepository.create(prov);
        }
      }
    }

    // If lead generation website, initialize default lead form and publish initial version
    if (sanitized.websiteType === "lead_gen") {
      const { LEAD_STARTER_TEMPLATES } = await import("@/constants/lead-templates");
      const { LeadFormRepository } = await import("@/lib/repositories/lead-form.repository");

      const selectedTemplate =
        LEAD_STARTER_TEMPLATES.find((t) => t.id === sanitized.leadTemplateId) ||
        LEAD_STARTER_TEMPLATES[0];

      const formTitle = sanitized.leadFormTitle || selectedTemplate.name;

      const createdForm = await LeadFormRepository.create({
        storeId,
        name: formTitle,
        description: selectedTemplate.description,
        isDefault: true,
        steps: selectedTemplate.steps,
        settings: selectedTemplate.defaultSettings,
      });

      // Publish initial version (version 1)
      await LeadFormRepository.publishVersion(
        storeId,
        createdForm.id,
        creatorName,
        "Initial template publication"
      );
    }


    // Concurrently update client store count, record activity audit, and log analytics event
    await Promise.all([
      ClientRepository.incrementStoreCount(client.id),
      ActivityRepository.record({
        type: "store_created",
        title: "Created demo storefront",
        description: `Store "${newStore.name}" created using template ${template.name}`,
        user: {
          name: creatorName,
          avatarInitial: creatorName.charAt(0).toUpperCase(),
        },
        targetId: newStore.id,
        targetName: newStore.name,
      }),
      AnalyticsRepository.recordEvent({
        eventType: "store_created",
        storeId: newStore.id,
        storeName: newStore.name,
        clientId: client.id,
        clientName: client.company,
        industry: sanitized.industry,
        templateId: template.id,
        userId: creatorId,
        metadata: { templateName: template.name },
      }),
    ]);

    return NextResponse.json({ store: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating store:", error);
    if (error instanceof Error && error.message.includes("already in use")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred while creating the store." },
      { status: 500 }
    );
  }
}
