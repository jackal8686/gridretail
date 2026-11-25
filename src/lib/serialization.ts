/**
 * Serialization utilities for Server-to-Client Component boundaries in Next.js App Router.
 *
 * React Server Components disallow non-plain objects, custom prototypes,
 * and objects with toJSON methods (such as MongoDB BSON ObjectIds and Dates)
 * when passing props to Client Components.
 *
 * This module normalizes MongoDB documents, BSON types, and nested structures
 * into plain JavaScript objects suitable for client serialization.
 */

import { Store, Template, Product, StoreFeedback } from "@/types";

/**
 * Checks whether an object is a BSON ObjectId instance or duck-typed ObjectId.
 */
function isObjectId(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate._bsontype === "ObjectID" ||
    (typeof candidate.toHexString === "function" && typeof candidate.toString === "function") ||
    (typeof candidate === "object" &&
      candidate.constructor &&
      candidate.constructor.name === "ObjectId")
  );
}


/**
 * Recursively normalizes any database document or nested data structure into a
 * plain JavaScript object safe for Server-to-Client Component prop passing.
 */
export function serializeForClient<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Dates
  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  // Handle BSON ObjectIds
  if (isObjectId(value)) {
    return (value as { toString: () => string }).toString() as unknown as T;
  }

  // Handle Primitives (string, number, boolean, etc.)
  if (typeof value !== "object") {
    return value;
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    return value.map((item) => serializeForClient(item)) as unknown as T;
  }

  // Handle Objects
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // If source has an _id (e.g. MongoDB ObjectId)
  if ("_id" in source && source._id !== undefined && source._id !== null) {
    const stringId = isObjectId(source._id)
      ? (source._id as { toString: () => string }).toString()
      : typeof source._id === "object" && "toString" in (source._id as object)
      ? String(source._id)
      : String(source._id);

    result._id = stringId;
    if (!source.id) {
      result.id = stringId;
    }
  }

  // Iterate over own enumerable properties
  for (const [key, val] of Object.entries(source)) {
    // Skip toJSON methods or functions (Client Components reject functions/toJSON)
    if (typeof val === "function" || key === "toJSON") {
      continue;
    }

    if (key === "_id") {
      // Already normalized above
      continue;
    }

    result[key] = serializeForClient(val);
  }

  // Ensure id field is preserved as a string
  if ("id" in source && source.id !== undefined && source.id !== null) {
    result.id = String(source.id);
  }

  return result as T;
}

/**
 * Normalizes a Store document for Client Component rendering.
 */
export function serializeStore(store: Store): Store {
  return serializeForClient(store);
}

/**
 * Normalizes a Template document for Client Component rendering.
 */
export function serializeTemplate(template: Template | null): Template | null {
  if (!template) return null;
  return serializeForClient(template);
}

/**
 * Normalizes a Product document for Client Component rendering.
 */
export function serializeProduct(product: Product): Product {
  return serializeForClient(product);
}

/**
 * Normalizes an array of Product documents for Client Component rendering.
 */
export function serializeProducts(products: Product[]): Product[] {
  return products.map(serializeProduct);
}

/**
 * Normalizes a StoreFeedback document for Client Component rendering.
 */
export function serializeFeedback(feedback: StoreFeedback): StoreFeedback {
  return serializeForClient(feedback);
}

/**
 * Normalizes an array of StoreFeedback documents for Client Component rendering.
 */
export function serializeFeedbackList(feedbackList: StoreFeedback[]): StoreFeedback[] {
  return feedbackList.map(serializeFeedback);
}
