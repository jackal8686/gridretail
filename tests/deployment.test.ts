import test from "node:test";
import assert from "node:assert/strict";
import {
  getDeploymentProvider,
  CloudflarePagesProvider,
  VercelProvider,
  S3StaticHostingProvider,
} from "../src/lib/deployment/deployment-provider";
import { DeploymentRepository } from "../src/lib/repositories/deployment.repository";
import { Store, Template, Product } from "../src/types";
import { ExportService } from "../src/lib/export/export-service";

const mockStore: Store = {
  id: "store_deploy_01",
  name: "Nordic Minimal",
  slug: "nordic-minimal",
  clientId: "client_01",
  clientName: "Nordic Corp",
  industry: "Home & Living",
  templateId: "minimalist-scandinavian",
  templateName: "Minimalist Scandinavian",
  status: "Draft",
  productCount: 2,
  previewUrl: "/store/nordic-minimal",
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  description: "Test store for staging deployment",
  branding: {
    primaryColor: "#176B4D",
    secondaryColor: "#E2F5E9",
    fontFamily: "Inter, sans-serif",
    heroHeadline: "Modern Living",
    heroSubheadline: "Minimalist Scandinavian essentials",
  },
  enabledSections: ["hero", "featured_products", "about", "newsletter", "footer"],
  selectedProductIds: ["prod_1", "prod_2"],
};

const mockTemplate: Template = {
  id: "minimalist-scandinavian",
  name: "Minimalist Scandinavian",
  industry: "Home & Living",
  style: "Clean Nordic",
  featured: true,
  description: "Clean aesthetic with spacious layouts",
  colorPalette: {
    primary: "#176B4D",
    secondary: "#E2F5E9",
    accent: "#D4AF37",
  },
  layoutType: "Grid",
  compatibleIndustries: ["Home & Living"],
  thumbnailGradient: "from-stone-50 to-stone-100",
};

const mockProducts: Product[] = [
  {
    id: "prod_1",
    name: "Ceramic Mug",
    sku: "MUG-001",
    price: 24,
    currency: "USD",
    category: "Home & Living",
    stockStatus: "In Stock",
    thumbnailColor: "#E2E8F0",
    description: "Handcrafted ceramic mug",
    createdAt: new Date().toISOString(),
  },
];

test("MockDeploymentProvider generates valid staging preview URL & metadata", async () => {
  const provider = getDeploymentProvider("mock");
  assert.equal(provider.provider, "mock");
  assert.equal(provider.isConfigured, true);

  const bundle = await ExportService.generateStoreBundle(mockStore, mockTemplate, mockProducts);
  const result = await provider.deploy(bundle, mockStore);

  assert.ok(result.stagingUrl.includes("nordic-minimal-staging"));
  assert.ok(result.externalDeploymentId.startsWith("mock_dpl_"));
  assert.equal(result.metadata?.provider, "mock");
  assert.equal(result.metadata?.environment, "staging");
});

test("Cloud provider adapters reject missing credentials with clear errors", async () => {
  // Ensure tokens are unset for test
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.VERCEL_TOKEN;
  delete process.env.AWS_ACCESS_KEY_ID;

  const cfProvider = new CloudflarePagesProvider();
  assert.equal(cfProvider.isConfigured, false);

  const vercelProvider = new VercelProvider();
  assert.equal(vercelProvider.isConfigured, false);

  const s3Provider = new S3StaticHostingProvider();
  assert.equal(s3Provider.isConfigured, false);

  const bundle = await ExportService.generateStoreBundle(mockStore, mockTemplate, mockProducts);

  await assert.rejects(
    async () => await cfProvider.deploy(bundle, mockStore),
    /Cloudflare Pages credentials not configured/
  );

  await assert.rejects(
    async () => await vercelProvider.deploy(bundle, mockStore),
    /Vercel deployment credentials not configured/
  );

  await assert.rejects(
    async () => await s3Provider.deploy(bundle, mockStore),
    /AWS S3 Static Hosting credentials not configured/
  );
});

test("DeploymentRepository manages staging deployment lifecycle & store isolation", async () => {
  DeploymentRepository._resetMemory();

  const dep1 = await DeploymentRepository.create({
    id: "dpl_test_01",
    storeId: "store_deploy_01",
    storeName: "Nordic Minimal",
    provider: "mock",
    status: "building",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "Alex Mercer",
  });

  assert.equal(dep1.status, "building");

  // Transition to deploying
  await DeploymentRepository.updateStatus("dpl_test_01", "deploying");
  let current = await DeploymentRepository.findById("dpl_test_01");
  assert.equal(current?.status, "deploying");

  // Complete deployment
  await DeploymentRepository.updateStatus("dpl_test_01", "ready", {
    stagingUrl: "https://nordic-minimal-staging.preview.gridretail.internal",
    externalDeploymentId: "ext_123",
  });

  current = await DeploymentRepository.findById("dpl_test_01");
  assert.equal(current?.status, "ready");
  assert.ok(current?.deployedAt);
  assert.equal(current?.stagingUrl, "https://nordic-minimal-staging.preview.gridretail.internal");

  // Create another deployment for another store
  await DeploymentRepository.create({
    id: "dpl_test_02",
    storeId: "store_deploy_02",
    storeName: "Other Store",
    provider: "mock",
    status: "failed",
    errorMessage: "Simulated quota failure",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "Alex Mercer",
  });

  const store1Deployments = await DeploymentRepository.findByStoreId("store_deploy_01");
  assert.equal(store1Deployments.length, 1);
  assert.equal(store1Deployments[0].id, "dpl_test_01");

  const store2Deployments = await DeploymentRepository.findByStoreId("store_deploy_02");
  assert.equal(store2Deployments.length, 1);
  assert.equal(store2Deployments[0].status, "failed");
  assert.equal(store2Deployments[0].errorMessage, "Simulated quota failure");
});
