import { WithId, Document } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { LeadSubmission, FormField, LeadAnalyticsOverview, LeadStatus } from "@/types/lead";

const memorySubmissions: LeadSubmission[] = [];

export interface CreateSubmissionInput {
  storeId: string;
  leadId: string;
  formId: string;
  formVersion: number;
  formName: string;
  data: Record<string, unknown>;
  submittedFieldsSnapshot: FormField[];
  ipAddress?: string;
  userAgent?: string;
  idempotencyKey?: string;
  isTest?: boolean;
  createdAt?: string;
}

export class LeadSubmissionRepository {
  private static collectionName = "lead_submissions";

  static async create(input: CreateSubmissionInput): Promise<LeadSubmission> {
    const now = input.createdAt || new Date().toISOString();
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Check idempotency if key provided
    if (input.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(input.storeId, input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const submission: LeadSubmission = {
      id,
      storeId: input.storeId,
      leadId: input.leadId,
      formId: input.formId,
      formVersion: input.formVersion,
      formName: input.formName,
      data: input.data,
      submittedFieldsSnapshot: input.submittedFieldsSnapshot,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      idempotencyKey: input.idempotencyKey,
      isTest: input.isTest ?? false,
      createdAt: now,
    };

    const db = await getDb();
    if (db) {
      await db
        .collection(this.collectionName)
        .insertOne(submission as unknown as Document);
    } else {
      memorySubmissions.push({ ...submission });
    }

    return submission;
  }

  static async findByIdempotencyKey(
    storeId: string,
    idempotencyKey: string
  ): Promise<LeadSubmission | null> {
    const db = await getDb();
    if (db) {
      const doc = await db
        .collection(this.collectionName)
        .findOne({ storeId, idempotencyKey });
      return doc ? this.mapToSubmission(doc) : null;
    }

    const found = memorySubmissions.find(
      (s) => s.storeId === storeId && s.idempotencyKey === idempotencyKey
    );
    return found ? { ...found } : null;
  }

  static async findByLead(storeId: string, leadId: string): Promise<LeadSubmission[]> {
    const db = await getDb();
    if (db) {
      const docs = await db
        .collection(this.collectionName)
        .find({ storeId, leadId })
        .sort({ createdAt: -1 })
        .toArray();
      return docs.map((d: Document) => this.mapToSubmission(d));
    }

    return memorySubmissions
      .filter((s) => s.storeId === storeId && s.leadId === leadId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async findByStore(
    storeId: string,
    options?: { includeTest?: boolean }
  ): Promise<LeadSubmission[]> {
    const db = await getDb();
    if (db) {
      const query: Record<string, unknown> = { storeId };
      if (!options?.includeTest) {
        query.isTest = { $ne: true };
      }
      const docs = await db
        .collection(this.collectionName)
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      return docs.map((d: Document) => this.mapToSubmission(d));
    }

    return memorySubmissions
      .filter((s) => {
        if (s.storeId !== storeId) return false;
        if (!options?.includeTest && s.isTest) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Calculates first-party lead analytics:
   * - Filters out test submissions (isTest === true).
   * - Calculates conversion rate = (submissions / form views) * 100.
   * - Includes zero-denominator guard (returns 0% if views === 0).
   */
  static async getAnalyticsOverview(
    storeId: string,
    totalFormViews: number,
    leads: Array<{ status: LeadStatus; createdAt: string }>
  ): Promise<LeadAnalyticsOverview> {
    const submissions = await this.findByStore(storeId, { includeTest: false });
    const totalSubmissions = submissions.length;

    // Zero-denominator safe conversion rate
    const conversionRate =
      totalFormViews > 0
        ? Number(((totalSubmissions / totalFormViews) * 100).toFixed(2))
        : 0;

    const leadsByStatus: Record<LeadStatus, number> = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Converted: 0,
      Lost: 0,
    };

    for (const lead of leads) {
      if (leadsByStatus[lead.status] !== undefined) {
        leadsByStatus[lead.status]++;
      }
    }

    // Submissions over last 30 days
    const dailyMap = new Map<string, number>();
    for (const sub of submissions) {
      const day = sub.createdAt.split("T")[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    const submissionsOverTime = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalFormViews,
      totalSubmissions,
      conversionRate,
      totalLeads: leads.length,
      leadsByStatus,
      submissionsOverTime,
    };
  }

  static clearMemory(): void {
    memorySubmissions.length = 0;
  }

  static async deleteByLead(storeId: string, leadId: string): Promise<void> {
    const db = await getDb();
    if (db) {
      await db.collection(this.collectionName).deleteMany({ storeId, leadId });
    } else {
      for (let i = memorySubmissions.length - 1; i >= 0; i--) {
        if (memorySubmissions[i].storeId === storeId && memorySubmissions[i].leadId === leadId) {
          memorySubmissions.splice(i, 1);
        }
      }
    }
  }

  private static mapToSubmission(doc: WithId<Document> | Document): LeadSubmission {
    return {
      id: doc.id,
      storeId: doc.storeId,
      leadId: doc.leadId,
      formId: doc.formId,
      formVersion: doc.formVersion,
      formName: doc.formName,
      data: doc.data,
      submittedFieldsSnapshot: doc.submittedFieldsSnapshot,
      ipAddress: doc.ipAddress,
      userAgent: doc.userAgent,
      idempotencyKey: doc.idempotencyKey,
      isTest: doc.isTest,
      createdAt: doc.createdAt,
    };
  }
}
