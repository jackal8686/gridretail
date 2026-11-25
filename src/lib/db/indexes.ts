import { Db } from "mongodb";

export interface IndexSyncResult {
  success: boolean;
  indexedCollections: string[];
  totalIndexesCreated: number;
}

/**
 * Idempotently ensures all required production indexes exist across collections.
 */
export async function ensureAllDatabaseIndexes(db: Db): Promise<IndexSyncResult> {
  const indexed: string[] = [];
  let count = 0;

  // 1. Stores
  await db.collection("stores").createIndex({ id: 1 }, { unique: true });
  await db.collection("stores").createIndex({ slug: 1 }, { unique: true });
  await db.collection("stores").createIndex({ status: 1 });
  await db.collection("stores").createIndex({ industry: 1 });
  await db.collection("stores").createIndex({ creatorId: 1 });
  await db.collection("stores").createIndex({ lastUpdated: -1 });
  indexed.push("stores");
  count += 6;

  // 2. Clients
  await db.collection("clients").createIndex({ id: 1 }, { unique: true });
  await db.collection("clients").createIndex({ company: 1 });
  indexed.push("clients");
  count += 2;

  // 3. Templates
  await db.collection("templates").createIndex({ id: 1 }, { unique: true });
  indexed.push("templates");
  count += 1;

  // 4. Products
  await db.collection("products").createIndex({ id: 1 }, { unique: true });
  await db.collection("products").createIndex({ category: 1 });
  await db.collection("products").createIndex({ storeId: 1 });
  await db.collection("products").createIndex({ storeId: 1, category: 1 });
  indexed.push("products");
  count += 4;


  // 5. Users
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ role: 1 });
  indexed.push("users");
  count += 3;

  // 6. Preview Shares
  await db.collection("preview_shares").createIndex({ id: 1 }, { unique: true });
  await db.collection("preview_shares").createIndex({ tokenHash: 1 }, { unique: true });
  await db.collection("preview_shares").createIndex({ storeId: 1 });
  await db.collection("preview_shares").createIndex({ status: 1 });
  indexed.push("preview_shares");
  count += 4;

  // 7. Collaboration Comments
  await db.collection("comments").createIndex({ id: 1 }, { unique: true });
  await db.collection("comments").createIndex({ storeId: 1 });
  await db.collection("comments").createIndex({ shareId: 1 });
  await db.collection("comments").createIndex({ anchorType: 1, anchorId: 1 });
  indexed.push("comments");
  count += 4;

  // 8. Client Feedback
  await db.collection("feedback").createIndex({ id: 1 }, { unique: true });
  await db.collection("feedback").createIndex({ storeId: 1 });
  await db.collection("feedback").createIndex({ type: 1 });
  indexed.push("feedback");
  count += 3;

  // 9. Deliveries
  await db.collection("deliveries").createIndex({ id: 1 }, { unique: true });
  await db.collection("deliveries").createIndex({ storeId: 1 });
  indexed.push("deliveries");
  count += 2;

  // 10. Deployments
  await db.collection("deployments").createIndex({ id: 1 }, { unique: true });
  await db.collection("deployments").createIndex({ storeId: 1 });
  await db.collection("deployments").createIndex({ status: 1 });
  indexed.push("deployments");
  count += 3;

  // 11. Analytics Events
  await db.collection("analytics_events").createIndex({ id: 1 }, { unique: true });
  await db.collection("analytics_events").createIndex({ storeId: 1 });
  await db.collection("analytics_events").createIndex({ eventType: 1 });
  await db.collection("analytics_events").createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await db.collection("analytics_events").createIndex({ timestamp: -1 });
  indexed.push("analytics_events");
  count += 5;

  // 12. Media Assets
  await db.collection("media_assets").createIndex({ id: 1 }, { unique: true });
  await db.collection("media_assets").createIndex({ storeId: 1 });
  await db.collection("media_assets").createIndex({ storageKey: 1 });
  indexed.push("media_assets");
  count += 3;

  // 13. Activities
  await db.collection("activities").createIndex({ id: 1 }, { unique: true });
  await db.collection("activities").createIndex({ targetId: 1 });
  await db.collection("activities").createIndex({ timestamp: -1 });
  indexed.push("activities");
  count += 3;

  // 14. Appointment Services
  await db.collection("appointment_services").createIndex({ id: 1 }, { unique: true });
  await db.collection("appointment_services").createIndex({ storeId: 1 });
  await db.collection("appointment_services").createIndex({ storeId: 1, status: 1 });
  indexed.push("appointment_services");
  count += 3;

  // 15. Appointment Providers
  await db.collection("appointment_providers").createIndex({ id: 1 }, { unique: true });
  await db.collection("appointment_providers").createIndex({ storeId: 1 });
  await db.collection("appointment_providers").createIndex({ storeId: 1, status: 1 });
  indexed.push("appointment_providers");
  count += 3;

  // 16. Appointments
  await db.collection("appointments").createIndex({ id: 1 }, { unique: true });
  await db.collection("appointments").createIndex({ storeId: 1 });
  await db.collection("appointments").createIndex({ storeId: 1, status: 1 });
  await db.collection("appointments").createIndex({ storeId: 1, providerId: 1, startUtc: 1 });
  await db.collection("appointments").createIndex({ cancellationTokenHash: 1 }, { unique: true, sparse: true });
  await db.collection("appointments").createIndex({ confirmationNumber: 1 });
  indexed.push("appointments");
  count += 6;

  // 17. Appointment Slot Locks (Atomic Concurrency Reservation)
  await db.collection("appointment_slot_locks").createIndex(
    { storeId: 1, providerKey: 1, sliceUtc: 1 },
    { unique: true }
  );
  await db.collection("appointment_slot_locks").createIndex({ appointmentId: 1 });
  indexed.push("appointment_slot_locks");
  count += 2;

  // 18. Lead Forms
  await db.collection("lead_forms").createIndex({ id: 1 }, { unique: true });
  await db.collection("lead_forms").createIndex({ storeId: 1 });
  await db.collection("lead_forms").createIndex({ storeId: 1, isDefault: 1 });
  indexed.push("lead_forms");
  count += 3;

  // 19. Lead Form Versions
  await db.collection("lead_form_versions").createIndex({ id: 1 }, { unique: true });
  await db.collection("lead_form_versions").createIndex({ formId: 1, version: 1 }, { unique: true });
  await db.collection("lead_form_versions").createIndex({ storeId: 1 });
  indexed.push("lead_form_versions");
  count += 3;

  // 20. Leads
  await db.collection("leads").createIndex({ id: 1 }, { unique: true });
  await db.collection("leads").createIndex({ storeId: 1 });
  await db.collection("leads").createIndex({ storeId: 1, emailNormalized: 1 });
  await db.collection("leads").createIndex({ storeId: 1, phoneNormalized: 1 });
  await db.collection("leads").createIndex({ storeId: 1, status: 1 });
  await db.collection("leads").createIndex({ storeId: 1, createdAt: -1 });
  indexed.push("leads");
  count += 6;

  // 21. Lead Submissions
  await db.collection("lead_submissions").createIndex({ id: 1 }, { unique: true });
  await db.collection("lead_submissions").createIndex({ storeId: 1 });
  await db.collection("lead_submissions").createIndex({ leadId: 1 });
  await db.collection("lead_submissions").createIndex({ formId: 1 });
  await db.collection("lead_submissions").createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await db.collection("lead_submissions").createIndex({ isTest: 1 });
  await db.collection("lead_submissions").createIndex({ createdAt: -1 });
  indexed.push("lead_submissions");
  count += 7;

  // 22. Lead Activities
  await db.collection("lead_activities").createIndex({ id: 1 }, { unique: true });
  await db.collection("lead_activities").createIndex({ storeId: 1 });
  await db.collection("lead_activities").createIndex({ leadId: 1 });
  await db.collection("lead_activities").createIndex({ createdAt: -1 });
  indexed.push("lead_activities");
  count += 4;

  // 23. Lead Reminders
  await db.collection("lead_reminders").createIndex({ id: 1 }, { unique: true });
  await db.collection("lead_reminders").createIndex({ storeId: 1 });
  await db.collection("lead_reminders").createIndex({ leadId: 1 });
  await db.collection("lead_reminders").createIndex({ dueAt: 1 });
  await db.collection("lead_reminders").createIndex({ status: 1 });
  indexed.push("lead_reminders");
  count += 5;

  return {
    success: true,
    indexedCollections: indexed,
    totalIndexesCreated: count,
  };
}
