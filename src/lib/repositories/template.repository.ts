import { getDb } from "@/lib/db/mongodb";
import { Template, TemplateStyle } from "@/types";
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
          return templates.map((t) => {
            const raw = { ...t } as Record<string, unknown>;
            const id = t.id || (raw._id ? String(raw._id) : "");
            delete raw._id;
            return { ...raw, id } as unknown as Template;
          });
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
          const raw = { ...template } as Record<string, unknown>;
          const id = template.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as Template;
        }
      } catch (err) {
        console.warn("MongoDB query error in TemplateRepository.findById:", err);
      }
    }
    const memMatch = memoryTemplates.find((t) => t.id === id);
    if (memMatch) return memMatch;

    // Check design templates fallback
    const { DESIGN_TEMPLATES } = await import("@/constants/design-templates");
    const dt = DESIGN_TEMPLATES.find((d) => d.id === id);
    if (dt) {
      return {
        id: dt.id,
        name: dt.name,
        description: dt.description,
        industry: dt.compatibleIndustries[0] || "General",
        style: (dt.layoutFamily as unknown) as TemplateStyle,
        featured: dt.featured,
        colorPalette: {
          primary: "#0F172A",
          secondary: "#F8FAFC",
          accent: "#6366F1",
        },
        layoutType: "Grid",
        compatibleIndustries: dt.compatibleIndustries,
        thumbnailGradient: dt.thumbnailGradient,
      };
    }

    return null;
  },

  async findAllDesignTemplates() {
    const { DESIGN_TEMPLATES } = await import("@/constants/design-templates");
    return DESIGN_TEMPLATES;
  },

  async findAllThemes() {
    const { COLOR_THEMES } = await import("@/constants/themes");
    return COLOR_THEMES;
  },

  _resetMemory(templates?: Template[]) {
    memoryTemplates = templates ? [...templates] : [...MOCK_TEMPLATES];
  },
};
