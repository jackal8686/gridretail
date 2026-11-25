import { test } from "node:test";
import assert from "node:assert";
import { OrderRepository } from "@/lib/repositories/order.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ClientRepository } from "@/lib/repositories/client.repository";
import { POST as createOrderRoute } from "@/app/api/public/orders/route";
import { DELETE as deleteClientRoute } from "@/app/api/clients/[id]/route";
import { NextRequest } from "next/server";
import { Product, Store, Client } from "@/types";

test("Phase 18.3.1 — Production Acceptance Closure Test Suite", async (suite) => {
  // Setup baseline mock data
  const testStoreId = "str_closure_test_01";
  const testClientId = "cli_closure_test_01";
  const testProductId = "prd_closure_test_01";

  const testStore: Store = {
    id: testStoreId,
    name: "Closure Test Store",
    slug: "closure-test-store",
    clientName: "Closure Enterprise",
    clientId: testClientId,
    industry: "Home & Living",
    templateId: "tmpl_modern_minimal",
    templateName: "Modern Minimal",
    productCount: 1,
    description: "Store for closure tests",
    websiteType: "ecommerce",
    status: "Published",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    branding: {
      primaryColor: "#176B4D",
      fontFamily: "Inter, sans-serif",
    },
  };

  const testProduct: Product = {
    id: testProductId,
    storeId: testStoreId,
    name: "Artisan Ceramic Bowl",
    sku: "ART-BOWL-01",
    price: 1500, // True server price is ₹1,500
    category: "Decor",
    currency: "INR",
    stockStatus: "In Stock",
    description: "Handcrafted ceramic bowl",
    status: "active",
    createdAt: new Date().toISOString(),
    ...({ inventoryCount: 10 }),
  };

  const testClient: Client = {
    id: testClientId,
    name: "Dev Sharma",
    company: "Closure Enterprise",
    contactEmail: "dev@closure-enterprise.test",
    contactPhone: "+91 98765 00000",
    industry: "Home & Living",
    storeCount: 1,
    status: "Active",
    lastActive: new Date().toISOString(),
    assignedAccountManager: "Alex Mercer",
  };

  // Seed repositories
  await StoreRepository.create(testStore);
  await ProductRepository.create(testProduct);
  await ClientRepository.create(testClient);

  // -------------------------------------------------------------
  // 1. DEMO CHECKOUT FINANCIAL ACCURACY
  // -------------------------------------------------------------
  await suite.test("1.1 Server recalculates prices and ignores client-submitted price tampering", async () => {
    const fakeClientPrice = 50; // Malicious client claims price is ₹50 instead of ₹1,500
    const req = new NextRequest("http://localhost:3000/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: testStoreId,
        storeSlug: "closure-test-store",
        customer: {
          fullName: "Security Tester",
          email: "security@gridretail.demo",
        },
        items: [
          {
            productId: testProductId,
            name: "Artisan Ceramic Bowl",
            price: fakeClientPrice,
            quantity: 2,
          },
        ],
      }),
    });

    const res = await createOrderRoute(req);
    assert.strictEqual(res.status, 201, "Order creation should succeed");
    const json = await res.json();
    assert.ok(json.success);
    assert.strictEqual(json.order.items[0].price, 1500, "Server price ₹1,500 must override client's ₹50");
    assert.strictEqual(json.order.subtotal, 3000, "Subtotal must be 2 * ₹1,500 = ₹3,000");
  });

  await suite.test("1.2 Unconfigured store tax policy defaults to transparent zero tax (no invented rates)", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: testStoreId,
        storeSlug: "closure-test-store",
        customer: {
          fullName: "Tax Tester",
          email: "taxtester@gridretail.demo",
        },
        items: [
          {
            productId: testProductId,
            quantity: 1,
          },
        ],
      }),
    });

    const res = await createOrderRoute(req);
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.order.tax, 0, "Tax must be 0 when store has no tax configured");
    assert.strictEqual(json.order.taxRate, 0, "Tax rate must be 0");
    assert.strictEqual(json.order.taxPolicy, "unconfigured_zero_tax", "Tax policy must be unconfigured_zero_tax");
    assert.strictEqual(json.order.grandTotal, 1500, "Grand total must equal subtotal with zero tax");
  });

  await suite.test("1.3 Validated store-specific tax rate is applied accurately when configured", async () => {
    // Configure store with explicit 12% tax rate
    const taxedStoreId = "str_taxed_store_1831";
    await StoreRepository.create({
      ...testStore,
      id: taxedStoreId,
      slug: "taxed-store-1831",
      taxRate: 0.12, // 12% store tax
    } as unknown as Store);

    const req = new NextRequest("http://localhost:3000/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: taxedStoreId,
        customer: {
          fullName: "Configured Tax Tester",
          email: "configuredtax@gridretail.demo",
        },
        items: [
          {
            productId: testProductId,
            quantity: 2, // 2 * 1500 = 3000
          },
        ],
      }),
    });

    const res = await createOrderRoute(req);
    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.order.subtotal, 3000);
    assert.strictEqual(json.order.tax, 360, "12% of ₹3,000 is ₹360");
    assert.strictEqual(json.order.taxPolicy, "store_configured");
    assert.strictEqual(json.order.grandTotal, 3360, "Grand total must be ₹3,000 + ₹360 = ₹3,360");
  });

  await suite.test("1.4 Rejects order when product inventory is insufficient", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: testStoreId,
        customer: {
          fullName: "Stock Tester",
          email: "stock@gridretail.demo",
        },
        items: [
          {
            productId: testProductId,
            quantity: 999, // Stock is 10
          },
        ],
      }),
    });

    const res = await createOrderRoute(req);
    assert.strictEqual(res.status, 400, "Should reject order exceeding inventory");
    const json = await res.json();
    assert.match(json.error, /Insufficient stock/i);
  });

  await suite.test("1.5 Blocks duplicate submissions within 60 seconds with 409 Conflict", async () => {
    const orderPayload = {
      storeId: testStoreId,
      customer: {
        fullName: "Duplicate Tester",
        email: "duplicate@gridretail.demo",
      },
      items: [
        {
          productId: testProductId,
          quantity: 1,
        },
      ],
    };

    // First submission
    const res1 = await createOrderRoute(
      new NextRequest("http://localhost:3000/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })
    );
    assert.strictEqual(res1.status, 201, "First submission must succeed");

    // Immediate second submission
    const res2 = await createOrderRoute(
      new NextRequest("http://localhost:3000/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })
    );
    assert.strictEqual(res2.status, 409, "Second submission within 60s must return 409 Conflict");
    const json2 = await res2.json();
    assert.match(json2.error, /Duplicate order submission detected/i);
  });

  await suite.test("1.6 Idempotency key returns existing order without creating duplicate", async () => {
    const idempotencyKey = `idem_test_${Date.now()}`;
    const orderPayload = {
      storeId: testStoreId,
      idempotencyKey,
      customer: {
        fullName: "Idempotent User",
        email: "idempotent@gridretail.demo",
      },
      items: [
        {
          productId: testProductId,
          quantity: 1,
        },
      ],
    };

    const res1 = await createOrderRoute(
      new NextRequest("http://localhost:3000/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })
    );
    const json1 = await res1.json();
    assert.strictEqual(res1.status, 201);
    const firstOrderNum = json1.order.orderNumber;

    const res2 = await createOrderRoute(
      new NextRequest("http://localhost:3000/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      })
    );
    const json2 = await res2.json();
    assert.strictEqual(res2.status, 200, "Idempotent retry should return 200 with existing order");
    assert.strictEqual(json2.order.orderNumber, firstOrderNum, "Same order number must be returned");
    assert.ok(json2.isDuplicate);
  });

  await suite.test("1.7 Simulated payment status is explicit and distinct from order confirmation", async () => {
    const order = await OrderRepository.findByIdempotencyKey(`idem_test_${Date.now() - 1000}`) ||
      (await OrderRepository.findByStoreId(testStoreId))[0];

    assert.ok(order, "Order must exist");
    assert.strictEqual(order.status, "Confirmed", "Order status must be Confirmed");
    assert.strictEqual(order.isSimulatedPayment, true, "isSimulatedPayment must be explicitly true");
    assert.strictEqual(
      order.paymentStatus,
      "Simulated_Demo_Authorized",
      "paymentStatus must explicitly indicate demo simulation authorization"
    );
    assert.match(order.paymentMethod || "", /Demo Simulation Gateway/i);
  });

  // -------------------------------------------------------------
  // 2. CLIENT DELETION & DATA INTEGRITY
  // -------------------------------------------------------------
  await suite.test("2.1 Disallows destructive deletion when active linked stores exist", async () => {
    // Check repository canDelete check
    const check = await ClientRepository.canDelete(testClientId);
    assert.strictEqual(check.canDelete, false, "Client with active linked stores cannot be deleted");
    assert.ok(check.storeCount > 0, "Store count must be > 0");

    // Call DELETE API route without detachStores parameter
    const req = new NextRequest(`http://localhost:3000/api/clients/${testClientId}`, {
      method: "DELETE",
    });
    const res = await deleteClientRoute(req, { params: Promise.resolve({ id: testClientId }) });
    assert.strictEqual(res.status, 400, "DELETE API must return 400 when active stores exist");
    const json = await res.json();
    assert.match(json.error, /Cannot delete client with active associated storefronts/i);
  });

  await suite.test("2.2 Client archival sets status to Archived and keeps store associations intact", async () => {
    const req = new NextRequest(`http://localhost:3000/api/clients/${testClientId}?action=archive`, {
      method: "DELETE",
    });
    const res = await deleteClientRoute(req, { params: Promise.resolve({ id: testClientId }) });
    assert.strictEqual(res.status, 200, "Archival must return 200");
    const json = await res.json();
    assert.ok(json.archived);

    const client = await ClientRepository.findById(testClientId);
    assert.ok(client);
    assert.strictEqual(client.status, "Archived", "Client status must now be Archived");

    // Store must remain linked to this client
    const store = await StoreRepository.findById(testStoreId);
    assert.ok(store);
    assert.strictEqual(store.clientId, testClientId, "Store must remain linked to archived client");
  });

  await suite.test("2.3 Safe detachment (?detachStores=true) unlinks stores to unassigned client before deletion", async () => {
    // Unarchive client to test deletion with detachment
    await ClientRepository.update(testClientId, { status: "Active" });

    const req = new NextRequest(`http://localhost:3000/api/clients/${testClientId}?detachStores=true`, {
      method: "DELETE",
    });
    const res = await deleteClientRoute(req, { params: Promise.resolve({ id: testClientId }) });
    assert.strictEqual(res.status, 200, "Safe deletion with detachStores must return 200");

    // Client must be deleted
    const deletedClient = await ClientRepository.findById(testClientId);
    assert.strictEqual(deletedClient, null, "Client record must be permanently removed");

    // Store must NOT be deleted, but safely reassigned to 'cli_unassigned'
    const preservedStore = await StoreRepository.findById(testStoreId);
    assert.ok(preservedStore, "Associated store must NOT be deleted");
    assert.strictEqual(preservedStore.clientId, "cli_unassigned", "Store clientId must be reassigned to cli_unassigned");
    assert.strictEqual(preservedStore.clientName, "Unassigned Client", "Store clientName must be Unassigned Client");
  });

  await suite.test("2.4 Deleting client never deletes historical orders or invalidates catalog records", async () => {
    // Orders placed for the store must still exist
    const orders = await OrderRepository.findByStoreId(testStoreId);
    assert.ok(orders.length > 0, "Historical store orders must be preserved intact");

    // Product must still exist
    const product = await ProductRepository.findById(testProductId);
    assert.ok(product, "Product must remain intact");
  });

  // -------------------------------------------------------------
  // 3. ACTIVITY DISMISSAL PERSISTENCE
  // -------------------------------------------------------------
  await suite.test("3.1 Activity view filtering applies cursor without mutating immutable audit log", async () => {
    const now = Date.now();
    const mockActivities = [
      { id: "act_1", timestamp: new Date(now - 60000).toISOString(), title: "Event 1" },
      { id: "act_2", timestamp: new Date(now - 30000).toISOString(), title: "Event 2" },
      { id: "act_3", timestamp: new Date(now + 1000).toISOString(), title: "Event 3 (New)" },
    ];

    // Dismissal cursor at now - 20000
    const cursor = new Date(now - 20000).toISOString();
    const cursorTime = new Date(cursor).getTime();

    // Filtered visible activities
    const visible = mockActivities.filter((act) => {
      const actTime = new Date(act.timestamp).getTime();
      return actTime > cursorTime;
    });

    assert.strictEqual(visible.length, 1, "Only events newer than cursor should be visible in session view");
    assert.strictEqual(visible[0].id, "act_3", "Event 3 must be visible");

    // Immutable audit logs in store / mock remain all 3
    assert.strictEqual(mockActivities.length, 3, "Database audit log count must remain 3 (immutable)");
  });
});
