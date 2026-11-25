import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { TemplateRepository } from "@/lib/repositories/template.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { DeploymentRepository } from "@/lib/repositories/deployment.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { AnalyticsRepository } from "@/lib/repositories/analytics.repository";
import { ExportService } from "@/lib/export/export-service";
import { getDeploymentProvider } from "@/lib/deployment/deployment-provider";
import { DeploymentProvider, DeploymentRecord } from "@/types/deployment";
import { canAccessStore } from "@/lib/auth/permissions";
import { UserRole } from "@/types/user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deployments = await DeploymentRepository.findByStoreId(id);
  return NextResponse.json({ deployments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const store = await StoreRepository.findById(id);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const userRole = (session.user.role as UserRole) || "employee";
  const userId = session.user.id || "";
  if (!canAccessStore({ id: userId, role: userRole }, store, "deploy")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to trigger staging deployments for this store" },
      { status: 403 }
    );
  }

  let providerName: DeploymentProvider = "mock";
  try {
    const body = await request.json();
    if (body.provider) {
      providerName = body.provider;
    }
  } catch {
    // Body is optional, defaults to mock
  }

  const providerAdapter = getDeploymentProvider(providerName);
  if (!providerAdapter.isConfigured) {
    return NextResponse.json(
      {
        error: `Deployment provider '${providerName}' is not configured with required environment variables.`,
      },
      { status: 400 }
    );
  }

  const template = await TemplateRepository.findById(store.templateId);
  let products = await ProductRepository.findByIds(store.selectedProductIds || []);
  if (products.length === 0) {
    const catProducts = await ProductRepository.findByCategory(store.industry);
    products = catProducts.length > 0 ? catProducts : await ProductRepository.findAll();
  }

  const now = new Date().toISOString();
  const deploymentId = `dpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userName = session.user.name || session.user.email || "Operator";

  // Create initial deployment record
  const initialRecord: DeploymentRecord = {
    id: deploymentId,
    storeId: store.id,
    storeName: store.name,
    provider: providerName,
    status: "building",
    createdAt: now,
    updatedAt: now,
    createdBy: userName,
  };

  await DeploymentRepository.create(initialRecord);

  try {
    // Generate static bundle
    const bundle = await ExportService.generateStoreBundle(store, template, products);

    // Update status to deploying
    await DeploymentRepository.updateStatus(deploymentId, "deploying");

    // Perform deployment through provider adapter
    const result = await providerAdapter.deploy(bundle, store);

    // Update status to ready
    const finishedRecord = await DeploymentRepository.updateStatus(deploymentId, "ready", {
      stagingUrl: result.stagingUrl,
      externalDeploymentId: result.externalDeploymentId,
      metadata: {
        ...result.metadata,
        bundleSizeBytes: bundle.fileSizeBytes,
        fileCount: bundle.files.length,
      },
    });

    // Record activity audit entry
    await ActivityRepository.record({
      type: "store_updated",
      title: "Storefront staging deployment",
      description: `Deployed staging preview to ${result.stagingUrl} via ${providerName}`,
      user: {
        name: userName,
        avatarInitial: userName.charAt(0).toUpperCase(),
      },
      targetId: store.id,
      targetName: store.name,
    });

    // Record analytics deployment event
    await AnalyticsRepository.recordEvent({
      eventType: "store_deployed",
      storeId: store.id,
      storeName: store.name,
      clientId: store.clientId,
      clientName: store.clientName,
      industry: store.industry,
      templateId: store.templateId,
      userId: session.user.id || undefined,
      userEmail: session.user.email || undefined,
      metadata: {
        provider: providerName,
        stagingUrl: result.stagingUrl,
        deploymentId,
      },
    });

    return NextResponse.json({ deployment: finishedRecord }, { status: 201 });
  } catch (deployError) {
    const errorMsg = deployError instanceof Error ? deployError.message : "Deployment execution failed";
    await DeploymentRepository.updateStatus(deploymentId, "failed", {
      errorMessage: errorMsg,
    });

    console.error("Staging deployment failed:", deployError);
    return NextResponse.json(
      { error: errorMsg, deploymentId },
      { status: 500 }
    );
  }
}
