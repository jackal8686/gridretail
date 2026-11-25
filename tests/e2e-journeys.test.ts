import test from "node:test";
import assert from "node:assert/strict";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { ClientRepository } from "../src/lib/repositories/client.repository";
import { TemplateRepository } from "../src/lib/repositories/template.repository";
import { ProductRepository } from "../src/lib/repositories/product.repository";
import { PreviewShareRepository } from "../src/lib/repositories/preview-share.repository";
import { CommentRepository } from "../src/lib/repositories/comment.repository";
import { FeedbackRepository } from "../src/lib/repositories/feedback.repository";
import { DeliveryRepository } from "../src/lib/repositories/delivery.repository";
import { DeploymentRepository } from "../src/lib/repositories/deployment.repository";
import { AnalyticsRepository } from "../src/lib/repositories/analytics.repository";
import { NotificationService } from "../src/lib/notifications/notification-service";
import { ExportService } from "../src/lib/export/export-service";
import { getDeploymentProvider } from "../src/lib/deployment/deployment-provider";
import { hashToken, generateSecureToken } from "../src/lib/crypto/tokens";
import { validateStoreInput } from "../src/lib/validation/store";
import { canAccessStore, hasCapability } from "../src/lib/auth/permissions";
import { Store, UserRole } from "../src/types";

const PRESENTATION_SLIDE_TITLES = [
  "Strategic Brand Architecture & Styling",
  "Curated E-Commerce Catalog",
  "Brand Narrative & Trust Signals",
  "Audience Engagement & Conversion",
  "Live Interactive Storefront Simulation",
  "Commercial Next Steps & Delivery",
];

test("End-to-End Enterprise Demo Lifecycle (7 Core User Journeys)", async (t) => {
  StoreRepository._resetMemory();
  ClientRepository._resetMemory();
  PreviewShareRepository._resetMemory();
  CommentRepository._resetMemory();
  FeedbackRepository._resetMemory();
  DeliveryRepository._resetMemory();
  DeploymentRepository._resetMemory();
  AnalyticsRepository._resetMemory();

  let activeStore: Store;
  let activeToken: string;

  // -------------------------------------------------------------
  // JOURNEY 1: Store Creation via Wizard Flow
  // -------------------------------------------------------------
  await t.test("Journey 1: Store Creation via Wizard Flow", async () => {
    const rawInput = {
      name: "Nordic Haven Living",
      slug: "nordic-haven-living",
      clientId: "cli_01",
      industry: "Home & Living" as const,
      templateId: "tpl_nordic_clean",
      description: "Premium Scandinavian furniture showroom",
      branding: {
        primaryColor: "#2A4B3A",
        secondaryColor: "#F5F5F0",
        fontFamily: "Inter, sans-serif",
      },
      enabledSections: ["hero", "featured_products", "about", "footer"],
      selectedProductIds: ["prod-1", "prod-2"],
    };

    const validation = validateStoreInput(rawInput);
    assert.strictEqual(validation.valid, true, "Store input validation should pass");
    assert.ok(validation.sanitized);

    const client = await ClientRepository.findById(rawInput.clientId);
    assert.ok(client, "Client should exist");
    const template = await TemplateRepository.findById(rawInput.templateId);
    assert.ok(template, "Template should exist");

    const storeRecord: Store = {
      id: "str_e2e_01",
      name: validation.sanitized!.name,
      slug: validation.sanitized!.slug,
      clientId: client!.id,
      clientName: client!.company,
      industry: validation.sanitized!.industry,
      templateId: template!.id,
      templateName: template!.name,
      status: "Draft",
      productCount: rawInput.selectedProductIds.length,
      previewUrl: `/store/${validation.sanitized!.slug}`,
      creatorId: "usr_emp_01",
      creatorName: "Sarah Chen",
      branding: {
        primaryColor: validation.sanitized!.branding?.primaryColor || "#2A4B3A",
        secondaryColor: validation.sanitized!.branding?.secondaryColor || "#F5F5F0",
        fontFamily: validation.sanitized!.branding?.fontFamily || "Inter, sans-serif",
      },
      enabledSections: validation.sanitized!.enabledSections,
      selectedProductIds: validation.sanitized!.selectedProductIds,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: rawInput.description,
    };

    activeStore = await StoreRepository.create(storeRecord);
    assert.strictEqual(activeStore.id, "str_e2e_01");
    assert.strictEqual(activeStore.status, "Draft");

    // Ingest creation analytics event
    const event = await AnalyticsRepository.recordEvent({
      eventType: "store_created",
      storeId: activeStore.id,
      storeName: activeStore.name,
      clientId: client!.id,
      clientName: client!.company,
      industry: activeStore.industry,
      templateId: template!.id,
      userId: activeStore.creatorId,
    });
    assert.strictEqual(event.eventType, "store_created");
  });

  // -------------------------------------------------------------
  // JOURNEY 2: Visual Customizer & Standalone Export Generation
  // -------------------------------------------------------------
  await t.test("Journey 2: Visual Customizer & Standalone Export Generation", async () => {
    assert.ok(activeStore);

    const customSections = ["about", "hero", "featured_products", "newsletter", "footer"];
    const updatedStore = await StoreRepository.update(activeStore.id, {
      orderedSections: customSections,
      branding: {
        primaryColor: activeStore.branding?.primaryColor || "#2A4B3A",
        secondaryColor: activeStore.branding?.secondaryColor || "#F5F5F0",
        fontFamily: activeStore.branding?.fontFamily || "Inter, sans-serif",
        heroHeadline: "Reimagined Nordic Spaces",
        ctaText: "Discover Pieces",
      },
    });

    assert.ok(updatedStore);
    assert.deepStrictEqual(updatedStore.orderedSections, customSections);
    assert.strictEqual(updatedStore.branding?.heroHeadline, "Reimagined Nordic Spaces");
    activeStore = updatedStore;

    // Generate production export bundle
    const template = await TemplateRepository.findById(activeStore.templateId);
    const products = await ProductRepository.findAll();
    const bundle = await ExportService.generateStoreBundle(activeStore, template, products);

    assert.ok(bundle.buffer.length > 0);
    assert.ok(bundle.artifactName.endsWith(".zip"));
    assert.strictEqual(bundle.files.length, 5);
    assert.ok(bundle.checksumSha256.length === 64);

    // Save delivery record
    const delivery = await DeliveryRepository.create({
      id: "del_e2e_01",
      storeId: activeStore.id,
      storeName: activeStore.name,
      mode: "bundle_export",
      status: "completed",
      format: "zip",
      artifactName: bundle.artifactName,
      fileSizeBytes: bundle.fileSizeBytes,
      checksumSha256: bundle.checksumSha256,
      createdAt: new Date().toISOString(),
      createdBy: "sarah.chen@gridretail.internal",
    });

    assert.strictEqual(delivery.status, "completed");
    assert.strictEqual(delivery.artifactName, bundle.artifactName);
  });

  // -------------------------------------------------------------
  // JOURNEY 3: Client Preview Sharing & Cryptographic Token Window
  // -------------------------------------------------------------
  await t.test("Journey 3: Client Preview Sharing & Cryptographic Token Window", async () => {
    assert.ok(activeStore);

    activeToken = generateSecureToken();
    const tokenHash = hashToken(activeToken);

    const share = await PreviewShareRepository.create({
      id: "share_e2e_01",
      storeId: activeStore.id,
      storeSlug: activeStore.slug,
      clientName: "Nordic Haven Client",
      tokenHash,
      status: "active",
      accessCount: 0,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: "sarah.chen@gridretail.internal",
    });

    const resolved = await PreviewShareRepository.findByTokenHash(tokenHash);
    assert.ok(resolved);
    assert.strictEqual(resolved.id, share.id);
    assert.strictEqual(resolved.status, "active");

    await PreviewShareRepository.recordAccess(share.id);
    const accessed = await PreviewShareRepository.findByTokenHash(tokenHash);
    assert.ok(accessed);
    assert.strictEqual(accessed.accessCount, 1);

    // Record analytics share_generated event
    await AnalyticsRepository.recordEvent({
      eventType: "share_generated",
      storeId: activeStore.id,
      storeName: activeStore.name,
      clientId: activeStore.clientId,
      clientName: activeStore.clientName,
      industry: activeStore.industry,
      templateId: activeStore.templateId,
    });
  });

  // -------------------------------------------------------------
  // JOURNEY 4: In-Context Collaboration & Data Boundary Enforcement
  // -------------------------------------------------------------
  await t.test("Journey 4: In-Context Collaboration & Data Boundary Enforcement", async () => {
    assert.ok(activeStore);

    // Public client comment
    await CommentRepository.create({
      id: "cmt_e2e_client_01",
      storeId: activeStore.id,
      authorType: "client",
      authorName: "Kari Lindqvist",
      authorEmail: "kari@nordichaven.com",
      anchorType: "section",
      anchorId: "hero",
      anchorLabel: "Hero Section",
      message: "Could we make the headline text slightly more prominent?",
      isInternalOnly: false,
      status: "open",
      createdAt: new Date().toISOString(),
    });

    // Staff internal-only margin note
    await CommentRepository.create({
      id: "cmt_e2e_staff_01",
      storeId: activeStore.id,
      authorType: "internal",
      authorName: "Sarah Chen",
      authorEmail: "sarah.chen@gridretail.internal",
      anchorType: "section",
      anchorId: "hero",
      message: "Internal pitch note: Client requested 20% discount on template fee.",
      isInternalOnly: true,
      status: "open",
      createdAt: new Date().toISOString(),
    });

    // Public client view must strictly exclude internal note
    const publicClientView = await CommentRepository.findByStoreId(activeStore.id, {
      includeInternal: false,
    });
    assert.strictEqual(publicClientView.length, 1);
    assert.strictEqual(publicClientView[0].id, "cmt_e2e_client_01");

    // Staff view includes all comments
    const internalStaffView = await CommentRepository.findByStoreId(activeStore.id, {
      includeInternal: true,
    });
    assert.strictEqual(internalStaffView.length, 2);
  });

  // -------------------------------------------------------------
  // JOURNEY 5: Client Approval, State Transition & Analytics Funnel
  // -------------------------------------------------------------
  await t.test("Journey 5: Client Approval, State Transition & Analytics Funnel", async () => {
    assert.ok(activeStore);

    const feedback = await FeedbackRepository.create({
      id: "fb_e2e_01",
      storeId: activeStore.id,
      authorType: "client",
      authorName: "Kari Lindqvist",
      type: "approval",
      message: "The storefront concept is approved for final packaging!",
      createdAt: new Date().toISOString(),
    });

    await StoreRepository.update(activeStore.id, { status: "Approved" });
    const store = await StoreRepository.findById(activeStore.id);
    assert.ok(store);
    assert.strictEqual(store.status, "Approved");
    activeStore = store;

    // Dispatch email notification
    const result = await NotificationService.notifyProposalApproved(
      activeStore,
      "Kari Lindqvist",
      feedback.message
    );
    assert.ok(result.id);
    assert.strictEqual(result.event, "proposal_approved");

    // Record analytics approval event
    await AnalyticsRepository.recordEvent({
      eventType: "proposal_approved",
      storeId: activeStore.id,
      storeName: activeStore.name,
      clientId: activeStore.clientId,
      clientName: activeStore.clientName,
      industry: activeStore.industry,
      templateId: activeStore.templateId,
    });

    const overview = await AnalyticsRepository.getOverview();
    assert.ok(overview.summary.proposalApprovalRate > 0);
  });

  // -------------------------------------------------------------
  // JOURNEY 6: Staging Deployment Orchestration
  // -------------------------------------------------------------
  await t.test("Journey 6: Staging Deployment Orchestration", async () => {
    assert.ok(activeStore);

    const template = await TemplateRepository.findById(activeStore.templateId);
    const products = await ProductRepository.findAll();
    const bundle = await ExportService.generateStoreBundle(activeStore, template, products);

    const mockProvider = getDeploymentProvider("mock");
    assert.strictEqual(mockProvider.isConfigured, true);

    const deployResult = await mockProvider.deploy(bundle, activeStore);
    assert.ok(deployResult.stagingUrl.includes("staging.preview.gridretail.internal"));
    assert.ok(deployResult.externalDeploymentId.startsWith("mock_dpl_"));

    const record = await DeploymentRepository.create({
      id: "dpl_e2e_01",
      storeId: activeStore.id,
      storeName: activeStore.name,
      provider: "mock",
      status: "ready",
      stagingUrl: deployResult.stagingUrl,
      externalDeploymentId: deployResult.externalDeploymentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "sarah.chen@gridretail.internal",
    });

    assert.strictEqual(record.status, "ready");
    assert.strictEqual(record.stagingUrl, deployResult.stagingUrl);

    // Verify cloud provider rejection without keys
    const cfProvider = getDeploymentProvider("cloudflare_pages");
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      assert.strictEqual(cfProvider.isConfigured, false);
      await assert.rejects(
        async () => await cfProvider.deploy(bundle, activeStore),
        /Cloudflare Pages credentials not configured/
      );
    }
  });

  // -------------------------------------------------------------
  // JOURNEY 7: Sales Pitch Presentation Deck & Role Hierarchy
  // -------------------------------------------------------------
  await t.test("Journey 7: Sales Pitch Presentation Deck & Role Hierarchy", async () => {
    assert.strictEqual(PRESENTATION_SLIDE_TITLES.length, 6);
    assert.strictEqual(PRESENTATION_SLIDE_TITLES[0], "Strategic Brand Architecture & Styling");
    assert.strictEqual(PRESENTATION_SLIDE_TITLES[5], "Commercial Next Steps & Delivery");

    assert.strictEqual(hasCapability("admin", "manage_users"), true);
    assert.strictEqual(hasCapability("sales_director", "manage_users"), false);
    assert.strictEqual(hasCapability("sales_director", "delete_store"), true);
    assert.strictEqual(hasCapability("account_manager", "delete_store"), false);
    assert.strictEqual(hasCapability("account_manager", "deploy_staging"), true);
    assert.strictEqual(hasCapability("employee", "deploy_staging"), false);
    assert.strictEqual(hasCapability("employee", "create_store"), true);

    const employeeUser = { id: "usr_emp_01", role: "employee" as UserRole };
    const otherEmployee = { id: "usr_emp_99", role: "employee" as UserRole };
    assert.strictEqual(canAccessStore(employeeUser, activeStore, "edit"), true);
    assert.strictEqual(canAccessStore(otherEmployee, activeStore, "edit"), false);
  });
});
