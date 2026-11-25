import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

export interface OrderCustomer {
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  notes?: string;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  storeSlug: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  status: "Confirmed" | "Processing" | "Delivered" | "Cancelled";
  paymentStatus:
    | "Simulated_Paid"
    | "Pending"
    | "Simulated_Demo_Authorized"
    | "Simulated_Demo_Pending"
    | "Simulated_Demo_Failed";
  isSimulatedPayment?: boolean;
  taxRate?: number;
  taxPolicy?: "store_configured" | "unconfigured_zero_tax";
  idempotencyKey?: string;
  paymentMethod?: string;
  createdAt: string;
}

let memoryOrders: StoreOrder[] = [];

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

  async findById(id: string): Promise<StoreOrder | null> {
    const db = await getDb();
    if (db) {
      try {
        const order = await db.collection<StoreOrder>("orders").findOne({ id });
        if (order) return order;
      } catch (err) {
        console.warn("MongoDB query error in OrderRepository.findById:", err);
      }
    }
    return memoryOrders.find((o) => o.id === id) || null;
  },

  async findByIdempotencyKey(key: string): Promise<StoreOrder | null> {
    if (!key) return null;
    const db = await getDb();
    if (db) {
      try {
        const order = await db.collection<StoreOrder>("orders").findOne({ idempotencyKey: key });
        if (order) return order;
      } catch (err) {
        console.warn("MongoDB query error in OrderRepository.findByIdempotencyKey:", err);
      }
    }
    return memoryOrders.find((o) => o.idempotencyKey === key) || null;
  },

  async findRecentDuplicate(
    storeId: string,
    customerEmail: string,
    itemsDigest: string,
    windowSeconds: number = 60
  ): Promise<StoreOrder | null> {
    const threshold = Date.now() - windowSeconds * 1000;
    const db = await getDb();
    if (db) {
      try {
        const candidates = await db
          .collection<StoreOrder>("orders")
          .find({
            storeId,
            "customer.email": customerEmail.trim().toLowerCase(),
          })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();

        for (const candidate of candidates) {
          const candidateTime = new Date(candidate.createdAt).getTime();
          if (candidateTime >= threshold) {
            const candidateDigest = (candidate.items || [])
              .map((i) => `${i.productId}:${i.quantity}`)
              .sort()
              .join("|");
            if (candidateDigest === itemsDigest) {
              return candidate;
            }
          }
        }
      } catch (err) {
        console.warn("MongoDB query error in OrderRepository.findRecentDuplicate:", err);
      }
    }

    const memCandidate = memoryOrders.find((o) => {
      if (o.storeId !== storeId) return false;
      if (o.customer.email.trim().toLowerCase() !== customerEmail.trim().toLowerCase()) return false;
      const t = new Date(o.createdAt).getTime();
      if (t < threshold) return false;
      const memDigest = (o.items || [])
        .map((i) => `${i.productId}:${i.quantity}`)
        .sort()
        .join("|");
      return memDigest === itemsDigest;
    });

    return memCandidate || null;
  },

  async findByOrderNumber(orderNumber: string): Promise<StoreOrder | null> {
    const db = await getDb();
    if (db) {
      try {
        const order = await db.collection<StoreOrder>("orders").findOne({ orderNumber });
        if (order) return order;
      } catch (err) {
        console.warn("MongoDB query error in OrderRepository.findByOrderNumber:", err);
      }
    }
    return memoryOrders.find((o) => o.orderNumber === orderNumber) || null;
  },

  async findByStoreId(storeId: string): Promise<StoreOrder[]> {
    const db = await getDb();
    if (db) {
      try {
        const orders = await db
          .collection<StoreOrder>("orders")
          .find({ storeId })
          .sort({ createdAt: -1 })
          .toArray();
        if (orders.length > 0) return orders;
      } catch (err) {
        console.warn("MongoDB query error in OrderRepository.findByStoreId:", err);
      }
    }
    return memoryOrders.filter((o) => o.storeId === storeId);
  },

  async findAll(): Promise<StoreOrder[]> {
    const db = await getDb();
    if (db) {
      try {
        const orders = await db
          .collection<StoreOrder>("orders")
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        if (orders.length > 0) return orders;
      } catch (err) {
        console.warn("MongoDB query error in OrderRepository.findAll:", err);
      }
    }
    return [...memoryOrders];
  },

  _resetMemory(orders?: StoreOrder[]) {
    memoryOrders = orders ? [...orders] : [];
  },
};
