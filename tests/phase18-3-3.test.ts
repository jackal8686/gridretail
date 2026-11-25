import { test } from "node:test";
import assert from "node:assert";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { ClientRepository } from "@/lib/repositories/client.repository";
import { OrderRepository } from "@/lib/repositories/order.repository";
import { LeadFormRepository } from "@/lib/repositories/lead-form.repository";
import { Product } from "@/types/product";
import { Client } from "@/types";
import { FormStep, FormSettings } from "@/types/lead";

test("Phase 18.3.3 — Data Connectivity, Missing Features & Global Entities Suite", async (t) => {
  ProductRepository._resetMemory();
  ClientRepository._resetMemory();
  OrderRepository._resetMemory();
  LeadFormRepository._clearMemory();

  // Test DEF-010 & DEF-011: Global Product CRUD and Persistence
  await t.test("DEF-010 & DEF-011: Global Products CRUD, persistence, stock status, and deletion", async () => {
    const newProduct: Product = {
      id: "prod_test_chair_1833",
      name: "Ergonomic Walnut Task Chair",
      sku: "SKU-WALNUT-99",
      price: 18500,
      currency: "INR",
      category: "Home & Living",
      description: "Solid American walnut frame with premium breathable mesh.",
      stockStatus: "In Stock",
      storeId: "str_01",
      storeName: "Aura Minimalist Living",
      createdAt: new Date().toISOString(),
    };

    // 1. Create product
    const created = await ProductRepository.create(newProduct);
    assert.strictEqual(created.id, "prod_test_chair_1833");
    assert.strictEqual(created.sku, "SKU-WALNUT-99");
    assert.strictEqual(created.stockStatus, "In Stock");

    // 2. Fetch by ID
    const fetched = await ProductRepository.findById("prod_test_chair_1833");
    assert.ok(fetched);
    assert.strictEqual(fetched.name, "Ergonomic Walnut Task Chair");
    assert.strictEqual(fetched.price, 18500);

    // 3. Update product
    const updated = await ProductRepository.update("prod_test_chair_1833", {
      price: 17200,
      stockStatus: "Low Stock",
      description: "Updated clearance pricing on walnut desk chair.",
    });
    assert.ok(updated);
    assert.strictEqual(updated.price, 17200);
    assert.strictEqual(updated.stockStatus, "Low Stock");

    // 4. Verify update persists
    const refetched = await ProductRepository.findById("prod_test_chair_1833");
    assert.strictEqual(refetched?.price, 17200);

    // 5. Delete product
    const deleted = await ProductRepository.delete("prod_test_chair_1833");
    assert.strictEqual(deleted, true);

    // 6. Verify deletion
    const afterDelete = await ProductRepository.findById("prod_test_chair_1833");
    assert.strictEqual(afterDelete, null);
  });

  // Test DEF-014 & DEF-015: Global Client Management, Linking & Deletion
  await t.test("DEF-014 & DEF-015: Global Client creation, editing, details with stores, and deletion", async () => {
    const newClient: Client = {
      id: "cli_horizon_advisory_1833",
      name: "Horizon Strategic Advisory",
      company: "Horizon Partners LLC",
      contactEmail: "contact@horizonadvisory.example.com",
      contactPhone: "+1 555-019-2831",
      industry: "Legal & Advisory",
      storeCount: 2,
      lastActive: new Date().toISOString(),
      status: "Active",
      assignedAccountManager: "Alex Turner",
    };

    // 1. Create client
    const created = await ClientRepository.create(newClient);
    assert.strictEqual(created.id, "cli_horizon_advisory_1833");
    assert.strictEqual(created.name, "Horizon Strategic Advisory");

    // 2. Fetch by ID
    const fetched = await ClientRepository.findById("cli_horizon_advisory_1833");
    assert.ok(fetched);
    assert.strictEqual(fetched.contactEmail, "contact@horizonadvisory.example.com");

    // 3. Update client
    const updated = await ClientRepository.update("cli_horizon_advisory_1833", {
      company: "Horizon Global Partners Inc",
      contactPhone: "+1 555-999-0000",
      status: "Prospect",
    });
    assert.ok(updated);
    assert.strictEqual(updated.company, "Horizon Global Partners Inc");
    assert.strictEqual(updated.status, "Prospect");

    // 4. Delete client
    const deleted = await ClientRepository.delete("cli_horizon_advisory_1833");
    assert.strictEqual(deleted, true);

    // 5. Verify deletion
    const afterDelete = await ClientRepository.findById("cli_horizon_advisory_1833");
    assert.strictEqual(afterDelete, null);
  });

  // Test DEF-012: Persistent Demo Checkout Orders
  await t.test("DEF-012: StoreOrder repository persists placed demo checkout orders across lookups", async () => {
    const orderData = {
      orderNumber: "ORD-TEST-1833",
      storeId: "str_01",
      storeSlug: "aura-minimalist",
      customer: {
        fullName: "Elena Rostova",
        email: "elena@example.com",
        phone: "+1 555-432-1098",
        streetAddress: "742 Evergreen Terrace",
        city: "Springfield",
        postalCode: "97477",
      },
      items: [
        {
          productId: "prod_01",
          name: "Ceramic Minimalist Vase",
          price: 49.0,
          quantity: 2,
        },
        {
          productId: "prod_02",
          name: "Organic Linen Throw Blanket",
          price: 89.0,
          quantity: 1,
        },
      ],
      subtotal: 187.0,
      tax: 14.96,
      grandTotal: 201.96,
      status: "Confirmed" as const,
      paymentStatus: "Simulated_Paid" as const,
    };

    // 1. Create order
    const created = await OrderRepository.create(orderData);
    assert.ok(created.id);
    assert.strictEqual(created.orderNumber, "ORD-TEST-1833");
    assert.strictEqual(created.grandTotal, 201.96);
    assert.strictEqual(created.items.length, 2);

    // 2. Fetch by orderNumber
    const fetched = await OrderRepository.findByOrderNumber("ORD-TEST-1833");
    assert.ok(fetched);
    assert.strictEqual(fetched.customer.fullName, "Elena Rostova");
    assert.strictEqual(fetched.paymentStatus, "Simulated_Paid");

    // 3. Fetch by storeId
    const storeOrders = await OrderRepository.findByStoreId("str_01");
    assert.ok(storeOrders.some((o) => o.orderNumber === "ORD-TEST-1833"));
  });

  // Test DEF-016: Visual Lead Form Builder Schema & Version Publishing
  await t.test("DEF-016: Visual Lead Form Builder draft updates, step schemas, and version publication", async () => {
    const initialSteps: FormStep[] = [
      {
        id: "step_contact",
        title: "Contact Information",
        fields: [
          {
            id: "fld_name",
            type: "text",
            label: "Your Full Name",
            placeholder: "Jane Doe",
            validation: { required: true },
          },
          {
            id: "fld_email",
            type: "email",
            label: "Professional Work Email",
            placeholder: "jane@company.com",
            validation: { required: true },
          },
        ],
      },
    ];

    const initialSettings: FormSettings = {
      presentationMode: "embedded",
      layout: "single_column",
      submitButtonText: "Request Initial Briefing",
      postSubmissionAction: "message",
      successMessage: "Thank you for reaching out!",
    };

    // 1. Create form
    const form = await LeadFormRepository.create({
      storeId: "str_summit_1833",
      name: "Strategic Consultation Intake",
      description: "Confidential advisory assessment",
      isDefault: true,
      steps: initialSteps,
      settings: initialSettings,
    });
    assert.ok(form.id);
    assert.strictEqual(form.storeId, "str_summit_1833");

    // 2. Update Draft (adds a 2nd step and custom field)
    const updatedSteps: FormStep[] = [
      ...initialSteps,
      {
        id: "step_budget",
        title: "Project Scope & Budget",
        fields: [
          {
            id: "fld_budget",
            type: "select",
            label: "Expected Investment Budget",
            options: [
              { label: "$25k - $50k", value: "25k_50k" },
              { label: "$50k - $100k", value: "50k_100k" },
              { label: "$100k+", value: "100k_plus" },
            ],
            validation: { required: true },
          },
        ],
      },
    ];

    const updatedSettings: FormSettings = {
      ...initialSettings,
      submitButtonText: "Submit Advisory Application",
      layout: "two_column",
    };

    const updated = await LeadFormRepository.updateDraft(
      "str_summit_1833",
      form.id,
      updatedSteps,
      updatedSettings
    );
    assert.ok(updated);
    assert.strictEqual(updated.currentDraft.steps.length, 2);
    assert.strictEqual(updated.currentDraft.settings.submitButtonText, "Submit Advisory Application");
    // Prior to publishing, publishedVersion is undefined
    assert.strictEqual(updated.publishedVersion, undefined);

    // 3. Publish Version 1
    const publishResult = await LeadFormRepository.publishVersion(
      "str_summit_1833",
      form.id,
      "SuperAdmin",
      "Official launch of advisory intake"
    );
    assert.ok(publishResult);
    assert.strictEqual(publishResult.form.publishedVersion, 1);
    assert.strictEqual(publishResult.form.publishedSteps?.length, 2);
    assert.strictEqual(publishResult.form.publishedSettings?.submitButtonText, "Submit Advisory Application");
    assert.strictEqual(publishResult.version.version, 1);

    // 4. Verify findDefaultByStore returns published steps
    const defaultForm = await LeadFormRepository.findDefaultByStore("str_summit_1833");
    assert.ok(defaultForm);
    assert.strictEqual(defaultForm.publishedVersion, 1);
    assert.strictEqual(defaultForm.publishedSteps?.[1].title, "Project Scope & Budget");
  });
});
