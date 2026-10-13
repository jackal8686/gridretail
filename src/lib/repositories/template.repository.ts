import { getDb } from "@/lib/db/mongodb";
import { Template } from "@/types";
import { MOCK_TEMPLATES } from "@/mock/templates";

let memoryTemplates: Template[] = [...MOCK_TEMPLATES];

export const TemplateRepository = {
  async findAll(filter?: { industry?: string; search?: string }): Promise<Template[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.industry && filter.industry !== "ALL") {
          query.$or = [
            { industry: filter.industry },
            { compatibleIndustries: filter.industry },
          ];
        }
        if (filter?.search) {
          query.name = { $regex: filter.search, $options: "i" };
        }

        const templates = await db.collection<Template>("templates").find(query).toArray();
        if (templates.length > 0) {
          return templates.map((t) => ({
            ...t,
            id: t.id || (t as unknown as { _id: { toString: () => string } })._id?.toString(),
          }));
        }
      } catch (err) {
        console.warn("MongoDB query error in TemplateRepository.findAll:", err);
      }
    }

    return memoryTemplates.filter((tpl) => {
      const matchIndustry =
        !filter?.industry ||
        filter.industry === "ALL" ||
        tpl.industry === filter.industry ||
        tpl.compatibleIndustries.includes(filter.industry);

      const matchSearch =
        !filter?.search ||
        tpl.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        tpl.description.toLowerCase().includes(filter.search.toLowerCase());

      return matchIndustry && matchSearch;
    });
  },

  async findById(id: string): Promise<Template | null> {
    const db = await getDb();
    if (db) {
      try {
        const template = await db.collection<Template>("templates").findOne({ id });
        if (template) {
          return {
            ...template,
            id: template.id || (template as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
        }
      } catch (err) {
        console.warn("MongoDB query error in TemplateRepository.findById:", err);
      }
    }
    return memoryTemplates.find((t) => t.id === id) || null;
  },

  _resetMemory(templates?: Template[]) {
    memoryTemplates = templates ? [...templates] : [...MOCK_TEMPLATES];
  },
};
