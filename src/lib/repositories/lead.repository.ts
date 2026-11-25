import { WithId, Document } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import {
  Lead,
  LeadStatus,
  LeadNote,
  LeadActivity,
} from "@/types/lead";
import { ActivityRepository } from "./activity.repository";
import { LeadSubmissionRepository } from "./lead-submission.repository";
import { LeadReminderRepository } from "./lead-reminder.repository";

// In-memory fallback stores for development/testing without live MongoDB
const memoryLeads: Lead[] = [
  {
    id: "lead_mock_01",
    storeId: "str_08",
    fullName: "Victoria Thorne",
    email: "v.thorne@thornedynamics.internal",
    phone: "+1 415 890 1234",
    company: "Thorne Dynamics Global",
    status: "Contacted",
    source: "Consultation Request Form",
    assignedTo: "usr_admin_alex",
    assignedToName: "Alex Mercer",
    firstSubmissionAt: new Date().toISOString(),
    lastSubmissionAt: new Date().toISOString(),
    submissionCount: 1,
    tags: ["Enterprise Advisory", "Pipeline Acceleration"],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
const memoryActivities: LeadActivity[] = [];

export interface CreateLeadInput {
  storeId: string;
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: LeadStatus;
  source: string;
  assignedTo?: string;
  assignedToName?: string;
  tags?: string[];
  createdAt?: string;
}

export interface UpdateLeadInput {
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: LeadStatus;
  assignedTo?: string;
  assignedToName?: string;
  tags?: string[];
  isArchived?: boolean;
}

export class LeadRepository {
  private static collectionName = "leads";
  private static activitiesCollectionName = "lead_activities";

  private static normalizeEmail(email?: string): string | undefined {
    if (!email) return undefined;
    const trimmed = email.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private static normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    // Strip non-digit characters except leading +
    const cleaned = phone.trim().replace(/[^\d+]/g, "");
    return cleaned.length >= 7 ? cleaned : undefined;
  }

  /**
   * Finds an existing lead in the same store by normalized email or phone.
   * Priority:
   * 1. Email exact match (normalized).
   * 2. Phone match ONLY IF email is not present on the incoming record.
   * Cross-store matching is STRICTLY prohibited (storeId is mandatory).
   */
  static async findExistingLead(
    storeId: string,
    email?: string,
    phone?: string
  ): Promise<Lead | null> {
    const normEmail = this.normalizeEmail(email);
    const normPhone = this.normalizePhone(phone);

    const db = await getDb();
    if (db) {
      if (normEmail) {
        const byEmail = await db
          .collection(this.collectionName)
          .findOne({ storeId, emailNormalized: normEmail });
        if (byEmail) return this.mapToLead(byEmail);
      } else if (normPhone) {
        const byPhone = await db
          .collection(this.collectionName)
          .findOne({ storeId, phoneNormalized: normPhone });
        if (byPhone) return this.mapToLead(byPhone);
      }
      return null;
    }

    // In-memory fallback
    if (normEmail) {
      const found = memoryLeads.find(
        (l) => l.storeId === storeId && l.emailNormalized === normEmail
      );
      if (found) return { ...found };
    } else if (normPhone) {
      const found = memoryLeads.find(
        (l) => l.storeId === storeId && l.phoneNormalized === normPhone
      );
      if (found) return { ...found };
    }

    return null;
  }

  /**
   * Upserts or merges a lead based on duplicate detection rules:
   * - If existing found by email, updates lastSubmissionAt, submissionCount, merges fields if empty.
   * - If existing found by phone (when incoming has no email), updates similarly.
   * - If incoming has email and existing has different email, NEVER merge.
   */
  static async upsertLeadFromSubmission(
    storeId: string,
    input: {
      fullName: string;
      email?: string;
      phone?: string;
      company?: string;
      source: string;
      submittedAt: string;
    }
  ): Promise<{ lead: Lead; isNew: boolean }> {
    const existing = await this.findExistingLead(storeId, input.email, input.phone);

    if (existing) {
      // Merge rules: fill missing fields, increment submission count, update timestamps
      const normEmail = this.normalizeEmail(input.email);
      const normPhone = this.normalizePhone(input.phone);

      const updatedLead: Lead = {
        ...existing,
        fullName: existing.fullName || input.fullName,
        email: existing.email || input.email,
        emailNormalized: existing.emailNormalized || normEmail,
        phone: existing.phone || input.phone,
        phoneNormalized: existing.phoneNormalized || normPhone,
        company: existing.company || input.company,
        lastSubmissionAt: input.submittedAt,
        submissionCount: (existing.submissionCount || 1) + 1,
        updatedAt: new Date().toISOString(),
      };

      const db = await getDb();
      if (db) {
        await db
          .collection(this.collectionName)
          .updateOne({ id: existing.id, storeId }, { $set: updatedLead });
      } else {
        const idx = memoryLeads.findIndex((l) => l.id === existing.id);
        if (idx !== -1) memoryLeads[idx] = { ...updatedLead };
      }

      await this.logActivity({
        storeId,
        leadId: existing.id,
        type: "submission",
        description: `New submission received from ${input.source}`,
      });

      return { lead: updatedLead, isNew: false };
    }

    // Create new lead
    const newLead = await this.create({
      storeId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      company: input.company,
      source: input.source,
      status: "New",
      createdAt: input.submittedAt,
    });

    await this.logActivity({
      storeId,
      leadId: newLead.id,
      type: "submission",
      description: `Lead created from submission via ${input.source}`,
    });

    return { lead: newLead, isNew: true };
  }

  static async create(input: CreateLeadInput): Promise<Lead> {
    const now = input.createdAt || new Date().toISOString();
    const id = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const normEmail = this.normalizeEmail(input.email);
    const normPhone = this.normalizePhone(input.phone);

    const lead: Lead = {
      id,
      storeId: input.storeId,
      fullName: input.fullName.trim(),
      email: input.email?.trim(),
      emailNormalized: normEmail,
      phone: input.phone?.trim(),
      phoneNormalized: normPhone,
      company: input.company?.trim(),
      status: input.status || "New",
      source: input.source,
      assignedTo: input.assignedTo,
      assignedToName: input.assignedToName,
      firstSubmissionAt: now,
      lastSubmissionAt: now,
      submissionCount: 1,
      tags: input.tags || [],
      notes: [],
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    if (db) {
      await db.collection(this.collectionName).insertOne(lead as unknown as Document);
    } else {
      memoryLeads.push({ ...lead });
    }

    return lead;
  }

  static async findById(storeId: string, id: string): Promise<Lead | null> {
    const db = await getDb();
    if (db) {
      const doc = await db.collection(this.collectionName).findOne({ id, storeId });
      return doc ? this.mapToLead(doc) : null;
    }

    const found = memoryLeads.find((l) => l.id === id && l.storeId === storeId);
    return found ? { ...found } : null;
  }

  static async findByStore(
    storeId: string,
    filters?: {
      status?: LeadStatus;
      search?: string;
      assignedTo?: string;
      includeArchived?: boolean;
    }
  ): Promise<Lead[]> {
    const db = await getDb();
    if (db) {
      const query: Record<string, unknown> = { storeId };
      if (!filters?.includeArchived) {
        query.isArchived = { $ne: true };
      }
      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.assignedTo) {
        query.assignedTo = filters.assignedTo;
      }
      if (filters?.search) {
        const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        query.$or = [
          { fullName: regex },
          { email: regex },
          { phone: regex },
          { company: regex },
        ];
      }

      const docs = await db
        .collection(this.collectionName)
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return docs.map((d: Document) => this.mapToLead(d));
    }

    return memoryLeads
      .filter((l) => {
        if (l.storeId !== storeId) return false;
        if (!filters?.includeArchived && l.isArchived) return false;
        if (filters?.status && l.status !== filters.status) return false;
        if (filters?.assignedTo && l.assignedTo !== filters.assignedTo) return false;
        if (filters?.search) {
          const s = filters.search.toLowerCase();
          const matchName = l.fullName.toLowerCase().includes(s);
          const matchEmail = l.email?.toLowerCase().includes(s);
          const matchPhone = l.phone?.includes(s);
          const matchComp = l.company?.toLowerCase().includes(s);
          if (!matchName && !matchEmail && !matchPhone && !matchComp) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async update(
    storeId: string,
    id: string,
    input: UpdateLeadInput
  ): Promise<Lead | null> {
    const existing = await this.findById(storeId, id);
    if (!existing) return null;

    const normEmail = input.email !== undefined ? this.normalizeEmail(input.email) : existing.emailNormalized;
    const normPhone = input.phone !== undefined ? this.normalizePhone(input.phone) : existing.phoneNormalized;

    const updated: Lead = {
      ...existing,
      ...input,
      emailNormalized: normEmail,
      phoneNormalized: normPhone,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (db) {
      await db
        .collection(this.collectionName)
        .updateOne({ id, storeId }, { $set: updated });
    } else {
      const idx = memoryLeads.findIndex((l) => l.id === id && l.storeId === storeId);
      if (idx !== -1) memoryLeads[idx] = { ...updated };
    }

    if (input.status && input.status !== existing.status) {
      await this.logActivity({
        storeId,
        leadId: id,
        type: "status_change",
        description: `Status changed from ${existing.status} to ${input.status}`,
      });
    }

    if (input.assignedTo && input.assignedTo !== existing.assignedTo) {
      await this.logActivity({
        storeId,
        leadId: id,
        type: "assigned",
        description: `Assigned to ${input.assignedToName || input.assignedTo}`,
      });
    }

    return updated;
  }

  static async addNote(
    storeId: string,
    leadId: string,
    note: { authorId: string; authorName: string; content: string }
  ): Promise<LeadNote | null> {
    const lead = await this.findById(storeId, leadId);
    if (!lead) return null;

    const newNote: LeadNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: note.authorId,
      authorName: note.authorName,
      content: note.content.trim(),
      createdAt: new Date().toISOString(),
    };

    const notes = [...(lead.notes || []), newNote];
    await this.update(storeId, leadId, { ...lead, tags: lead.tags }); // updates updatedAt

    const db = await getDb();
    if (db) {
      await db
        .collection(this.collectionName)
        .updateOne({ id: leadId, storeId }, { $set: { notes } });
    } else {
      const idx = memoryLeads.findIndex((l) => l.id === leadId);
      if (idx !== -1) memoryLeads[idx].notes = notes;
    }

    await this.logActivity({
      storeId,
      leadId,
      actorId: note.authorId,
      actorName: note.authorName,
      type: "note_added",
      description: `Added note: "${newNote.content.slice(0, 40)}${newNote.content.length > 40 ? "..." : ""}"`,
    });

    return newNote;
  }

  /**
   * Permanent GDPR-compliant deletion cascade:
   * - Deletes the lead document from `leads`.
   * - Deletes all submissions for this lead from `lead_submissions`.
   * - Deletes all notes, reminders, and activities linked to this lead.
   * - Logs a single non-identifying audit entry in the global activities collection:
   *   { eventType: "lead_deleted", targetId: leadId, storeId, timestamp }.
   */
  static async permanentlyDelete(storeId: string, leadId: string): Promise<boolean> {
    const existing = await this.findById(storeId, leadId);
    if (!existing) return false;

    const db = await getDb();
    if (db) {
      // 1. Delete lead
      await db.collection(this.collectionName).deleteOne({ id: leadId, storeId });
      // 2. Cascade delete submissions
      await db.collection("lead_submissions").deleteMany({ leadId, storeId });
      // 3. Cascade delete reminders
      await db.collection("lead_reminders").deleteMany({ leadId, storeId });
      // 4. Cascade delete activities
      await db.collection(this.activitiesCollectionName).deleteMany({ leadId, storeId });
    } else {
      const leadIdx = memoryLeads.findIndex((l) => l.id === leadId && l.storeId === storeId);
      if (leadIdx !== -1) memoryLeads.splice(leadIdx, 1);

      // In-memory cascade delete
      await LeadSubmissionRepository.deleteByLead(storeId, leadId);
      await LeadReminderRepository.deleteByLead(storeId, leadId);

      // In-memory cleanup of activities
      for (let i = memoryActivities.length - 1; i >= 0; i--) {
        if (memoryActivities[i].leadId === leadId && memoryActivities[i].storeId === storeId) {
          memoryActivities.splice(i, 1);
        }
      }
    }

    // Log non-identifying audit event via ActivityRepository
    await ActivityRepository.record({
      type: "store_updated",
      title: "Lead permanently deleted",
      description: "GDPR cascade deletion completed. Personal data wiped.",
      user: {
        name: "System Security",
        avatarInitial: "S",
      },
      targetId: storeId,
      targetName: `Lead ${leadId}`,
    });

    return true;
  }

  static async logActivity(input: {
    storeId: string;
    leadId: string;
    actorId?: string;
    actorName?: string;
    type: LeadActivity["type"];
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<LeadActivity> {
    const activity: LeadActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      storeId: input.storeId,
      leadId: input.leadId,
      actorId: input.actorId,
      actorName: input.actorName,
      type: input.type,
      description: input.description,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (db) {
      await db
        .collection(this.activitiesCollectionName)
        .insertOne(activity as unknown as Document);
    } else {
      memoryActivities.push(activity);
    }

    return activity;
  }

  static async getActivities(storeId: string, leadId: string): Promise<LeadActivity[]> {
    const db = await getDb();
    if (db) {
      const docs = await db
        .collection(this.activitiesCollectionName)
        .find({ storeId, leadId })
        .sort({ createdAt: -1 })
        .toArray();
      return docs.map((d: Document) => ({
        id: d.id,
        storeId: d.storeId,
        leadId: d.leadId,
        actorId: d.actorId,
        actorName: d.actorName,
        type: d.type,
        description: d.description,
        metadata: d.metadata,
        createdAt: d.createdAt,
      }));
    }

    return memoryActivities
      .filter((a) => a.storeId === storeId && a.leadId === leadId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Resets in-memory collections for testing.
   */
  static clearMemory(): void {
    memoryLeads.length = 0;
    memoryActivities.length = 0;
  }

  private static mapToLead(doc: WithId<Document> | Document): Lead {
    return {
      id: doc.id,
      storeId: doc.storeId,
      fullName: doc.fullName,
      email: doc.email,
      emailNormalized: doc.emailNormalized,
      phone: doc.phone,
      phoneNormalized: doc.phoneNormalized,
      company: doc.company,
      status: doc.status,
      source: doc.source,
      assignedTo: doc.assignedTo,
      assignedToName: doc.assignedToName,
      firstSubmissionAt: doc.firstSubmissionAt,
      lastSubmissionAt: doc.lastSubmissionAt,
      submissionCount: doc.submissionCount || 1,
      tags: doc.tags || [],
      notes: doc.notes || [],
      isArchived: doc.isArchived,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
