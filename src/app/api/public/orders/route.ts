import { NextRequest, NextResponse } from "next/server";
import { OrderRepository, StoreOrder } from "@/lib/repositories/order.repository";
import { ProductRepository } from "@/lib/repositories/product.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, storeSlug, customer, items, idempotencyKey } = body;

    if (!storeId || !customer || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload. Store, customer, and items are required." },
        { status: 400 }
      );
    }

    if (!customer.fullName || !customer.email) {
      return NextResponse.json(
        { error: "Customer full name and email are required." },
        { status: 400 }
      );
    }

    // 1. Check idempotency key if provided
    if (idempotencyKey) {
      const existing = await OrderRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return NextResponse.json(
          {
            success: true,
            order: existing,
            isDuplicate: true,
            message: "Order already processed with this idempotency key.",
          },
          { status: 200 }
        );
      }
    }

    // 2. Duplicate submission protection (within 60 seconds with identical item list)
    const itemsDigest = items
      .map((it: { productId: string; quantity?: number }) => `${it.productId}:${Number(it.quantity) || 1}`)
      .sort()
      .join("|");

    const duplicate = await OrderRepository.findRecentDuplicate(storeId, customer.email, itemsDigest, 60);
    if (duplicate) {
      return NextResponse.json(
        {
          error: "Duplicate order submission detected. Please do not submit multiple orders within 60 seconds.",
          existingOrderNumber: duplicate.orderNumber,
          isDuplicate: true,
        },
        { status: 409 }
      );
    }

    // 3. Recalculate item prices and inventory strictly from ProductRepository
    const validatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const product = await ProductRepository.findById(item.productId);

      if (!product) {
        return NextResponse.json(
          { error: `Product '${item.name || item.productId}' could not be found or is discontinued.` },
          { status: 400 }
        );
      }

      // Check stock if inventory tracking is enabled
      const invCount = (product as unknown as { inventoryCount?: number }).inventoryCount;
      if (typeof invCount === "number" && invCount < quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for '${product.name}'. Requested ${quantity}, available ${invCount}.`,
          },
          { status: 400 }
        );
      }

      const serverPrice = Number(product.price) || 0;
      subtotal += serverPrice * quantity;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: serverPrice,
        quantity,
        variant: item.variant || undefined,
      });
    }

    // 4. Fetch store and apply validated store-specific tax rate or transparent zero-tax policy
    const store = await StoreRepository.findById(storeId);
    let taxRate = 0;
    let taxPolicy: "store_configured" | "unconfigured_zero_tax" = "unconfigured_zero_tax";

    // Check store-specific tax configuration
    const storeWithTax = store as unknown as { taxRate?: number };
    if (typeof storeWithTax?.taxRate === "number" && storeWithTax.taxRate >= 0 && storeWithTax.taxRate <= 1) {
      taxRate = storeWithTax.taxRate;
      taxPolicy = "store_configured";
    }

    const tax = Math.round(subtotal * taxRate);
    const grandTotal = subtotal + tax;

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const order: StoreOrder = {
      id,
      orderNumber,
      storeId,
      storeSlug: storeSlug || store?.slug || "",
      customer: {
        fullName: customer.fullName.trim(),
        email: customer.email.trim(),
        phone: customer.phone?.trim() || "",
        streetAddress: customer.streetAddress?.trim() || "",
        city: customer.city?.trim() || "Mumbai",
        postalCode: customer.postalCode?.trim() || "400001",
        notes: customer.notes?.trim() || "",
      },
      items: validatedItems,
      subtotal,
      tax,
      grandTotal,
      status: "Confirmed",
      paymentStatus: "Simulated_Demo_Authorized",
      isSimulatedPayment: true,
      taxRate,
      taxPolicy,
      idempotencyKey: idempotencyKey || undefined,
      paymentMethod: "Demo Simulation Gateway (Zero Real Funds)",
      createdAt: new Date().toISOString(),
    };

    const created = await OrderRepository.create(order);
    return NextResponse.json({ success: true, order: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to process order" }, { status: 500 });
  }
}
