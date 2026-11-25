import { WithId, Document } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { LeadReminder } from "@/types/lead";
import { LeadRepository } from "./lead.repository";

const memoryReminders: LeadReminder[] = [];

export interface CreateReminderInput {
  storeId: string;
  leadId: string;
  title: string;
  dueAt: string;
  assignedTo?: string;
}

export class LeadReminderRepository {
  private static collectionName = "lead_reminders";

  static async create(input: CreateReminderInput): Promise<LeadReminder> {
    const now = new Date().toISOString();
    const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const reminder: LeadReminder = {
      id,
      storeId: input.storeId,
      leadId: input.leadId,
      title: input.title.trim(),
      dueAt: input.dueAt,
      assignedTo: input.assignedTo,
      status: "pending",
      createdAt: now,
    };

    const db = await getDb();
    if (db) {
      await db
        .collection(this.collectionName)
        .insertOne(reminder as unknown as Document);
    } else {
      memoryReminders.push({ ...reminder });
    }

    await LeadRepository.logActivity({
      storeId: input.storeId,
      leadId: input.leadId,
      type: "reminder_created",
      description: `Follow-up reminder set for ${new Date(input.dueAt).toLocaleDateString()}: "${input.title}"`,
    });

    return reminder;
  }

  static async findByLead(storeId: string, leadId: string): Promise<LeadReminder[]> {
    const db = await getDb();
    if (db) {
      const docs = await db
        .collection(this.collectionName)
        .find({ storeId, leadId })
        .sort({ dueAt: 1 })
        .toArray();
      return docs.map((d: Document) => this.mapToReminder(d));
    }

    return memoryReminders
      .filter((r) => r.storeId === storeId && r.leadId === leadId)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  static async findPendingByStore(storeId: string): Promise<LeadReminder[]> {
    const db = await getDb();
    if (db) {
      const docs = await db
        .collection(this.collectionName)
        .find({ storeId, status: "pending" })
        .sort({ dueAt: 1 })
        .toArray();
      return docs.map((d: Document) => this.mapToReminder(d));
    }

    return memoryReminders
      .filter((r) => r.storeId === storeId && r.status === "pending")
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  static async updateStatus(
    storeId: string,
    reminderId: string,
    status: LeadReminder["status"]
  ): Promise<LeadReminder | null> {
    const now = new Date().toISOString();
    const completedAt = status === "completed" ? now : undefined;

    const db = await getDb();
    if (db) {
      const res = await db.collection(this.collectionName).findOneAndUpdate(
        { id: reminderId, storeId },
        { $set: { status, completedAt } },
        { returnDocument: "after" }
      );
      return res ? this.mapToReminder(res) : null;
    }

    const idx = memoryReminders.findIndex(
      (r) => r.id === reminderId && r.storeId === storeId
    );
    if (idx === -1) return null;

    memoryReminders[idx].status = status;
    memoryReminders[idx].completedAt = completedAt;

    if (status === "completed") {
      await LeadRepository.logActivity({
        storeId,
        leadId: memoryReminders[idx].leadId,
        type: "reminder_completed",
        description: `Completed follow-up reminder: "${memoryReminders[idx].title}"`,
      });
    }

    return { ...memoryReminders[idx] };
  }

  static clearMemory(): void {
    memoryReminders.length = 0;
  }

  static async deleteByLead(storeId: string, leadId: string): Promise<void> {
    const db = await getDb();
    if (db) {
      await db.collection(this.collectionName).deleteMany({ storeId, leadId });
    } else {
      for (let i = memoryReminders.length - 1; i >= 0; i--) {
        if (memoryReminders[i].storeId === storeId && memoryReminders[i].leadId === leadId) {
          memoryReminders.splice(i, 1);
        }
      }
    }
  }

  private static mapToReminder(doc: WithId<Document> | Document): LeadReminder {
    return {
      id: doc.id,
      storeId: doc.storeId,
      leadId: doc.leadId,
      title: doc.title,
      dueAt: doc.dueAt,
      assignedTo: doc.assignedTo,
      status: doc.status,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt,
    };
  }
}
