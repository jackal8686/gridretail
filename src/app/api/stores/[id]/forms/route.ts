import { NextRequest, NextResponse } from "next/server";
import { LeadFormRepository } from "@/lib/repositories/lead-form.repository";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storeId } = await params;
  let form = await LeadFormRepository.findDefaultByStore(storeId);

  // If no form exists yet, create default form for this store
  if (!form) {
    const { LEAD_STARTER_TEMPLATES } = await import("@/constants/lead-templates");
    const template = LEAD_STARTER_TEMPLATES[1] || LEAD_STARTER_TEMPLATES[0];
    form = await LeadFormRepository.create({
      storeId,
      name: "Strategic Consultation Assessment",
      description: "Request an initial confidential briefing and proposal.",
      isDefault: true,
      steps: template.steps,
      settings: template.defaultSettings,
    });
    await LeadFormRepository.publishVersion(storeId, form.id, "Admin", "Initial seed publication");
  }

  return NextResponse.json({ form });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storeId } = await params;
  const session = await auth();
  const userName = session?.user?.name || "Admin";

  try {
    const body = await request.json();
    const { formId, steps, settings, publish } = body;

    let targetFormId = formId;
    if (!targetFormId) {
      const existing = await LeadFormRepository.findDefaultByStore(storeId);
      targetFormId = existing?.id;
    }

    if (!targetFormId) {
      return NextResponse.json({ error: "No lead form found to update" }, { status: 404 });
    }

    if (steps && settings) {
      await LeadFormRepository.updateDraft(storeId, targetFormId, steps, settings);
    }

    if (publish) {
      const pubResult = await LeadFormRepository.publishVersion(storeId, targetFormId, userName);
      return NextResponse.json({ success: true, form: pubResult?.form });
    }

    const updated = await LeadFormRepository.findById(storeId, targetFormId);
    return NextResponse.json({ success: true, form: updated });
  } catch (err: unknown) {
    console.error("Failed to update lead form:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to update lead form" }, { status: 500 });
  }
}
