# Code Snippet 1: Backend Database Repository & Simulated Order Processing

### 1. Snippet Title
Order Persistence, Server-Side Financial Safety & Fallback Storage (`OrderRepository.create`)

### 2. Original Source File Path
`src/lib/repositories/order.repository.ts` (Lines 48–76)

### 3. Purpose of the Code
The `OrderRepository.create` method is responsible for persisting customer orders generated during simulated storefront checkout. It ensures strict server-side financial safety by enforcing that transactions are clearly marked as demo simulations (`Simulated_Demo_Authorized` or `Simulated_Paid`), protecting against financial misrepresentation. Additionally, it provides resilient dual-mode persistence: persisting to MongoDB in production or connecting environments, while automatically maintaining an in-memory fallback store in development and testing.

### 4. Code Snippet

```typescript
export const OrderRepository = {
  async create(order: Partial<StoreOrder> & Omit<StoreOrder, "id" | "createdAt">): Promise<StoreOrder> {
    const id = order.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = order.createdAt || new Date().toISOString();
    const orderRecord: StoreOrder = {
      ...order,
      id,
      createdAt,
      isSimulatedPayment: order.isSimulatedPayment ?? true,
      paymentStatus: order.paymentStatus || "Simulated_Demo_Authorized",
      paymentMethod: order.paymentMethod || "Demo Simulation Gateway (Zero Real Funds)",
    };

    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create order: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<StoreOrder>("orders").insertOne({ ...orderRecord });
      } catch (err) {
        if (!isFallbackAllowed()) throw err;
        console.warn("MongoDB insert error in OrderRepository.create:", err);
      }
    }

    memoryOrders.unshift(orderRecord);
    return orderRecord;
  },
  // ...
};
```

### 5. Explanation of Important Lines
- **Lines 50–51:** Generates unique order identifiers using timestamp prefixes and pseudo-random alphanumeric hashes if an ID was not explicitly assigned, guaranteeing zero key collisions.
- **Lines 56–58:** Explicitly enforces demo metadata (`isSimulatedPayment: true`, `paymentStatus: "Simulated_Demo_Authorized"`). This prevents client-side payloads from falsely representing test orders as real completed financial settlements.
- **Lines 61–64:** Invokes `getDb()` to evaluate database availability. In strict production mode (`isFallbackAllowed() === false`), it throws a `DatabaseUnavailableError` if MongoDB is down, preventing silent unpersisted writes.
- **Lines 65–72:** Inserts the document into the MongoDB `orders` collection safely within a try-catch block.
- **Line 74:** Synchronizes the record into `memoryOrders` array unshifted at the top, enabling instantaneous UI retrieval and seamless operation in automated test runners and offline demonstration modes.

### 6. Contribution to GridRetail
This method guarantees transactional transparency and multi-environment reliability. It enables clients to demonstrate complete e-commerce checkout flows—including order placement, inventory verification, and receipt confirmation—without requiring third-party payment gateways (Stripe, Razorpay) while maintaining strict audit trails in MongoDB.
