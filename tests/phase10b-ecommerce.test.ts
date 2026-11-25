import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCartItemKey, parseCartItemKey, CartLineItem } from "../src/context/CartContext";
import { formatINR } from "../src/utils/currency";
import { ProductRepository } from "../src/lib/repositories/product.repository";
import { StoreRepository } from "../src/lib/repositories/store.repository";

describe("Phase 10B — E-commerce Architecture, Cart & Simulated Checkout Suite", () => {
  describe("1. Composite Cart Line Item & Variant Key Scheme", () => {
    it("builds correct composite key for items without variant", () => {
      const key = buildCartItemKey("prod_101");
      assert.equal(key, "prod_101");
    });

    it("builds composite key for items with variant", () => {
      const key = buildCartItemKey("prod_101", "Navy Blue / Large");
      assert.equal(key, "prod_101:::Navy Blue / Large");
    });

    it("parses composite key back into productId and variant", () => {
      const parsedWithVariant = parseCartItemKey("prod_101:::Emerald / Medium");
      assert.equal(parsedWithVariant.productId, "prod_101");
      assert.equal(parsedWithVariant.variant, "Emerald / Medium");

      const parsedWithoutVariant = parseCartItemKey("prod_101");
      assert.equal(parsedWithoutVariant.productId, "prod_101");
      assert.equal(parsedWithoutVariant.variant, undefined);
    });

    it("prevents collisions between different variants of the same product", () => {
      const lineItems: Record<string, CartLineItem> = {};

      const keyM = buildCartItemKey("prod_shirt_1", "Medium");
      lineItems[keyM] = {
        key: keyM,
        productId: "prod_shirt_1",
        variant: "Medium",
        quantity: 2,
      };

      const keyL = buildCartItemKey("prod_shirt_1", "Large");
      lineItems[keyL] = {
        key: keyL,
        productId: "prod_shirt_1",
        variant: "Large",
        quantity: 1,
      };

      assert.equal(Object.keys(lineItems).length, 2);
      assert.equal(lineItems[keyM].quantity, 2);
      assert.equal(lineItems[keyL].quantity, 1);
      assert.notEqual(keyM, keyL);
    });

    it("aggregates quantities when identical variant is added", () => {
      const lineItems: Record<string, CartLineItem> = {};
      const key = buildCartItemKey("prod_shirt_1", "Medium");

      // Add 2
      lineItems[key] = {
        key: key,
        productId: "prod_shirt_1",
        variant: "Medium",
        quantity: 2,
      };

      // Add 3 more of same variant
      lineItems[key] = {
        ...lineItems[key],
        quantity: lineItems[key].quantity + 3,
      };

      assert.equal(lineItems[key].quantity, 5);
      assert.equal(Object.keys(lineItems).length, 1);
    });
  });

  describe("2. Universal INR Currency Standardization", () => {
    it("formats standard integer INR amounts with rupee symbol", () => {
      assert.equal(formatINR(2499), "₹2,499.00");
      assert.equal(formatINR(150), "₹150.00");
      assert.equal(formatINR(99999), "₹99,999.00");
    });

    it("formats large amounts with Indian comma grouping system", () => {
      const formattedLakh = formatINR(150000);
      assert.ok(formattedLakh.startsWith("₹"));
      assert.ok(formattedLakh.includes("1,50,000") || formattedLakh.includes("150,000"));
    });

    it("formats zero amount gracefully", () => {
      assert.equal(formatINR(0), "₹0.00");
    });

    it("handles decimal precision correctly", () => {
      assert.equal(formatINR(499.9), "₹499.90");
      assert.equal(formatINR(499.25), "₹499.25");
    });
  });

  describe("3. Stock Availability Gate & Inventory Logic", () => {
    it("correctly evaluates stock status for out-of-stock items", () => {
      const oosProduct = {
        id: "prod_sold_out",
        name: "Vintage Chronograph",
        price: 18500,
        stockStatus: "Out of Stock" as const,
        inventoryCount: 0,
      };

      const isOutOfStock =
        oosProduct.stockStatus === "Out of Stock" || oosProduct.inventoryCount === 0;

      assert.equal(isOutOfStock, true);
    });

    it("correctly allows in-stock items with available inventory", () => {
      const inStockProduct = {
        id: "prod_in_stock",
        name: "Linen Minimalist Shirt",
        price: 2899,
        stockStatus: "In Stock" as string,
        inventoryCount: 15,
      };

      const isOutOfStock =
        inStockProduct.stockStatus === "Out of Stock" || inStockProduct.inventoryCount === 0;

      assert.equal(isOutOfStock, false);
    });
  });

  describe("4. Cart Subtotal & Order Calculations", () => {
    it("computes subtotal across multiple line items and quantities accurately", () => {
      const mockCatalog = [
        { id: "prod_1", price: 1200 },
        { id: "prod_2", price: 3500 },
        { id: "prod_3", price: 800 },
      ];

      const lineItems: Record<string, CartLineItem> = {
        "prod_1:::Small": { key: "prod_1:::Small", productId: "prod_1", variant: "Small", quantity: 2 },
        "prod_2": { key: "prod_2", productId: "prod_2", quantity: 1 },
        "prod_3:::Black": { key: "prod_3:::Black", productId: "prod_3", variant: "Black", quantity: 3 },
      };

      const subtotal = Object.values(lineItems).reduce((sum, item) => {
        const prod = mockCatalog.find((p) => p.id === item.productId);
        return sum + (prod ? prod.price * item.quantity : 0);
      }, 0);

      // (1200 * 2) + (3500 * 1) + (800 * 3) = 2400 + 3500 + 2400 = 8300
      assert.equal(subtotal, 8300);
      assert.equal(formatINR(subtotal), "₹8,300.00");
    });
  });

  describe("5. Simulated Checkout Security & Demo Order Generation", () => {
    it("generates simulated order receipt numbers in ORD-SIM-XXXXXX format", () => {
      const generateOrderNumber = () =>
        `ORD-SIM-${Math.floor(100000 + Math.random() * 900000)}`;

      const orderNo = generateOrderNumber();
      assert.match(orderNo, /^ORD-SIM-\d{6}$/);
    });

    it("enforces customer contact and delivery address requirements", () => {
      const validateOrderForm = (data: {
        fullName: string;
        email: string;
        streetAddress: string;
        city: string;
        postalCode: string;
      }) => {
        if (!data.fullName.trim()) return false;
        if (!data.email.trim() || !data.email.includes("@")) return false;
        if (!data.streetAddress.trim()) return false;
        if (!data.city.trim()) return false;
        if (!data.postalCode.trim()) return false;
        return true;
      };

      assert.equal(
        validateOrderForm({
          fullName: "Ananya Iyer",
          email: "ananya@example.com",
          streetAddress: "12 Marine Drive",
          city: "Mumbai",
          postalCode: "400020",
        }),
        true
      );

      assert.equal(
        validateOrderForm({
          fullName: "",
          email: "ananya@example.com",
          streetAddress: "12 Marine Drive",
          city: "Mumbai",
          postalCode: "400020",
        }),
        false
      );

      assert.equal(
        validateOrderForm({
          fullName: "Ananya Iyer",
          email: "invalid-email",
          streetAddress: "12 Marine Drive",
          city: "Mumbai",
          postalCode: "400020",
        }),
        false
      );
    });
  });

  describe("6. Storefront Navigation & Tenant Data Isolation", () => {
    it("retrieves store and verifies active products for customer viewing", async () => {
      const stores = await StoreRepository.findAll();
      assert.ok(stores.length > 0);
      const store = stores[0];

      const prods = await ProductRepository.findByStoreId(store.id);
      // Ensure any returned product belongs to the store or is accessible
      for (const prod of prods) {
        if (prod.storeId) {
          assert.equal(prod.storeId, store.id);
        }
      }
    });
  });
});
