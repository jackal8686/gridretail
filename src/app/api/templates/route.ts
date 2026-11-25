import { NextRequest, NextResponse } from "next/server";
import { TemplateRepository } from "@/lib/repositories/template.repository";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get("industry") || undefined;
  const search = searchParams.get("search") || undefined;

  const templates = await TemplateRepository.findAll({ industry, search });
  const designTemplates = await TemplateRepository.findAllDesignTemplates();
  const themes = await TemplateRepository.findAllThemes();

  return NextResponse.json({
    templates,
    count: templates.length,
    designTemplates,
    themes,
  });
}
