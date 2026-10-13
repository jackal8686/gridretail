import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ClientRepository } from "@/lib/repositories/client.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { validateStoreInput } from "@/lib/validation/store";
import { Store } from "@/types";

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

    // Check slug uniqueness
    const isAvailable = await StoreRepository.isSlugAvailable(sanitized.slug);
    if (!isAvailable) {
      return NextResponse.json(
        { error: `Store slug "${sanitized.slug}" is already in use by another store.` },
        { status: 409 }
      );
    }

    // Verify client exists
    const client = await ClientRepository.findById(sanitized.clientId);
    if (!client) {
      return NextResponse.json(
        { error: `Selected client ID "${sanitized.clientId}" does not exist.` },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await TemplateRepository.findById(sanitized.templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Selected template ID "${sanitized.templateId}" does not exist.` },
        { status: 400 }
      );
    }

    // Verify products if any selected
    let productCount = 0;
    if (sanitized.selectedProductIds && sanitized.selectedProductIds.length > 0) {
      const products = await ProductRepository.findByIds(sanitized.selectedProductIds);
      productCount = products.length;
    }

    const now = new Date().toISOString();
    const storeId = `str_${Date.now()}`;

    const newStore: Store = {
      id: storeId,
      name: sanitized.name,
      slug: sanitized.slug,
      clientId: client.id,
      clientName: client.company,
      industry: sanitized.industry,
      templateId: template.id,
      templateName: template.name,
      status: "Draft",
      productCount,
      previewUrl: `/store/${sanitized.slug}`,
      lastUpdated: now,
      createdAt: now,
      description: sanitized.description || `Demo storefront generated for ${client.company}`,
      branding: {
        primaryColor: sanitized.branding?.primaryColor || template.colorPalette.primary,
        secondaryColor: sanitized.branding?.secondaryColor || template.colorPalette.secondary,
        fontFamily: sanitized.branding?.fontFamily || "Inter, sans-serif",
        heroHeadline: sanitized.branding?.heroHeadline || `Welcome to ${sanitized.name}`,
        heroSubheadline:
          sanitized.branding?.heroSubheadline ||
          `Explore our curated ${sanitized.industry} catalog.`,
      },
      enabledSections: sanitized.enabledSections,
      selectedProductIds: sanitized.selectedProductIds,
      creatorId,
      creatorName,
    };

    const created = await StoreRepository.create(newStore);
    await ClientRepository.incrementStoreCount(client.id);

    // Record activity audit entry
    await ActivityRepository.record({
      type: "store_created",
      title: "Created demo storefront",
      description: `Store "${newStore.name}" created using template ${template.name}`,
      user: {
        name: creatorName,
        avatarInitial: creatorName.charAt(0).toUpperCase(),
      },
      targetId: newStore.id,
      targetName: newStore.name,
    });

    return NextResponse.json({ store: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating the store." },
      { status: 500 }
    );
  }
}
