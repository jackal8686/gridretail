import { WithId, Document } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import {
  LeadForm,
  LeadFormVersion,
  FormStep,
  FormSettings,
} from "@/types/lead";
import { LEAD_STARTER_TEMPLATES } from "@/constants/lead-templates";

const defaultLeadSteps = LEAD_STARTER_TEMPLATES[1].steps;
const defaultLeadSettings = LEAD_STARTER_TEMPLATES[1].defaultSettings;

const initialMockForm: LeadForm = {
  id: "form_mock_01",
  storeId: "str_08",
  name: "Enterprise Growth Inquiry",
  description: "Request an executive strategy assessment.",
  isDefault: true,
  currentDraft: {
    steps: defaultLeadSteps,
    settings: {
      ...defaultLeadSettings,
      presentationMode: "embedded",
      layout: "two_column",
      submitButtonText: "Submit Inquiry",
    },
    updatedAt: "2026-10-15T11:00:00Z",
  },
  publishedVersion: 1,
  publishedSteps: defaultLeadSteps,
  publishedSettings: {
    ...defaultLeadSettings,
    presentationMode: "embedded",
    layout: "two_column",
    submitButtonText: "Submit Inquiry",
  },
  publishedAt: "2026-10-15T11:00:00Z",
  createdAt: "2026-10-15T11:00:00Z",
  updatedAt: "2026-10-15T11:00:00Z",
};

const memoryForms: LeadForm[] = [initialMockForm];
const memoryVersions: LeadFormVersion[] = [
  {
    id: "ver_mock_01",
    formId: "form_mock_01",
    storeId: "str_08",
    version: 1,
    name: "Enterprise Growth Inquiry",
    steps: defaultLeadSteps,
    settings: {
      ...defaultLeadSettings,
      presentationMode: "embedded",
      layout: "two_column",
      submitButtonText: "Submit Inquiry",
    },
    publishedBy: "Admin",
    publishedAt: "2026-10-15T11:00:00Z",
  },
];

export interface CreateLeadFormInput {
  storeId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  steps: FormStep[];
  settings: FormSettings;
}

export class LeadFormRepository {
  private static collectionName = "lead_forms";
  private static versionsCollectionName = "lead_form_versions";

  static async create(input: CreateLeadFormInput): Promise<LeadForm> {
    const now = new Date().toISOString();
    const id = `form_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const form: LeadForm = {
      id,
      storeId: input.storeId,
      name: input.name,
      description: input.description,
      isDefault: input.isDefault ?? false,
      currentDraft: {
        steps: input.steps,
        settings: input.settings,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    if (db) {
      await db.collection(this.collectionName).insertOne(form as unknown as Document);
    } else {
      memoryForms.push({ ...form });
    }

    return form;
  }

  static async findById(storeId: string, formId: string): Promise<LeadForm | null> {
    const db = await getDb();
    if (db) {
      const doc = await db.collection(this.collectionName).findOne({ id: formId, storeId });
      return doc ? this.mapToForm(doc) : null;
    }

    const found = memoryForms.find((f) => f.id === formId && f.storeId === storeId);
    return found ? { ...found } : null;
  }

  static async findDefaultByStore(storeId: string): Promise<LeadForm | null> {
    const db = await getDb();
    if (db) {
      const doc = await db
        .collection(this.collectionName)
        .findOne({ storeId, isDefault: true });
      if (doc) return this.mapToForm(doc);

      // Fallback: first form in store
      const anyDoc = await db.collection(this.collectionName).findOne({ storeId });
      return anyDoc ? this.mapToForm(anyDoc) : null;
    }

    const defaultForm = memoryForms.find((f) => f.storeId === storeId && f.isDefault);
    if (defaultForm) return { ...defaultForm };
    const anyForm = memoryForms.find((f) => f.storeId === storeId);
    return anyForm ? { ...anyForm } : null;
  }

  static async findByStore(storeId: string): Promise<LeadForm[]> {
    const db = await getDb();
    if (db) {
      const docs = await db
        .collection(this.collectionName)
        .find({ storeId })
        .sort({ createdAt: 1 })
        .toArray();
      return docs.map((d: Document) => this.mapToForm(d));
    }

    return memoryForms.filter((f) => f.storeId === storeId);
  }

  static async updateDraft(
    storeId: string,
    formId: string,
    steps: FormStep[],
    settings: FormSettings
  ): Promise<LeadForm | null> {
    const form = await this.findById(storeId, formId);
    if (!form) return null;

    const now = new Date().toISOString();
    form.currentDraft = {
      steps,
      settings,
      updatedAt: now,
    };
    form.updatedAt = now;

    const db = await getDb();
    if (db) {
      await db
        .collection(this.collectionName)
        .updateOne(
          { id: formId, storeId },
          { $set: { currentDraft: form.currentDraft, updatedAt: now } }
        );
    } else {
      const idx = memoryForms.findIndex((f) => f.id === formId && f.storeId === storeId);
      if (idx !== -1) memoryForms[idx] = { ...form };
    }

    return form;
  }

  /**
   * Publishes the current draft as a new immutable version.
   * Increments publishedVersion, creates a record in `lead_form_versions`,
   * and copies draft steps/settings to publishedSteps/publishedSettings.
   */
  static async publishVersion(
    storeId: string,
    formId: string,
    publishedBy: string,
    changeSummary?: string
  ): Promise<{ form: LeadForm; version: LeadFormVersion } | null> {
    const form = await this.findById(storeId, formId);
    if (!form) return null;

    const now = new Date().toISOString();
    const nextVersionNum = (form.publishedVersion || 0) + 1;

    const versionRecord: LeadFormVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      formId: form.id,
      storeId,
      version: nextVersionNum,
      name: form.name,
      description: form.description,
      steps: JSON.parse(JSON.stringify(form.currentDraft.steps)),
      settings: JSON.parse(JSON.stringify(form.currentDraft.settings)),
      publishedAt: now,
      publishedBy,
      changeSummary: changeSummary || `Published version ${nextVersionNum}`,
    };

    form.publishedVersion = nextVersionNum;
    form.publishedSteps = versionRecord.steps;
    form.publishedSettings = versionRecord.settings;
    form.publishedAt = now;
    form.updatedAt = now;

    const db = await getDb();
    if (db) {
      await db
        .collection(this.versionsCollectionName)
        .insertOne(versionRecord as unknown as Document);
      await db.collection(this.collectionName).updateOne(
        { id: formId, storeId },
        {
          $set: {
            publishedVersion: form.publishedVersion,
            publishedSteps: form.publishedSteps,
            publishedSettings: form.publishedSettings,
            publishedAt: now,
            updatedAt: now,
          },
        }
      );
    } else {
      memoryVersions.push({ ...versionRecord });
      const idx = memoryForms.findIndex((f) => f.id === formId && f.storeId === storeId);
      if (idx !== -1) memoryForms[idx] = { ...form };
    }

    return { form, version: versionRecord };
  }

  static async getVersionHistory(storeId: string, formId: string): Promise<LeadFormVersion[]> {
    const db = await getDb();
    if (db) {
      const docs = await db
        .collection(this.versionsCollectionName)
        .find({ storeId, formId })
        .sort({ version: -1 })
        .toArray();
      return docs.map((d: Document) => this.mapToVersion(d));
    }

    return memoryVersions
      .filter((v) => v.storeId === storeId && v.formId === formId)
      .sort((a, b) => b.version - a.version);
  }

  static async getVersion(
    storeId: string,
    formId: string,
    versionNumber: number
  ): Promise<LeadFormVersion | null> {
    const db = await getDb();
    if (db) {
      const doc = await db
        .collection(this.versionsCollectionName)
        .findOne({ storeId, formId, version: versionNumber });
      return doc ? this.mapToVersion(doc) : null;
    }

    const found = memoryVersions.find(
      (v) => v.storeId === storeId && v.formId === formId && v.version === versionNumber
    );
    return found ? { ...found } : null;
  }

  /**
   * Restores an older version into the current draft.
   */
  static async restoreVersionToDraft(
    storeId: string,
    formId: string,
    versionNumber: number
  ): Promise<LeadForm | null> {
    const versionRecord = await this.getVersion(storeId, formId, versionNumber);
    if (!versionRecord) return null;

    return this.updateDraft(storeId, formId, versionRecord.steps, versionRecord.settings);
  }

  static clearMemory(): void {
    memoryForms.length = 0;
    memoryVersions.length = 0;
  }

  private static mapToForm(doc: WithId<Document> | Document): LeadForm {
    return {
      id: doc.id,
      storeId: doc.storeId,
      name: doc.name,
      description: doc.description,
      isDefault: doc.isDefault,
      currentDraft: doc.currentDraft,
      publishedVersion: doc.publishedVersion,
      publishedSettings: doc.publishedSettings,
      publishedSteps: doc.publishedSteps,
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static _clearMemory() {
    memoryForms.length = 0;
    memoryVersions.length = 0;
  }

  private static mapToVersion(doc: WithId<Document> | Document): LeadFormVersion {
    return {
      id: doc.id,
      formId: doc.formId,
      storeId: doc.storeId,
      version: doc.version,
      name: doc.name,
      description: doc.description,
      steps: doc.steps,
      settings: doc.settings,
      publishedAt: doc.publishedAt,
      publishedBy: doc.publishedBy,
      changeSummary: doc.changeSummary,
    };
  }
}
