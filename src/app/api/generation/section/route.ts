import { NextRequest, NextResponse } from "next/server";
import { validateBusinessProfile } from "@/lib/validation/business-profile";
import { getGenerationProvider } from "@/lib/generation/provider";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const profileValidation = validateBusinessProfile(body.profile);
    if (!profileValidation.valid || !profileValidation.sanitized) {
      return NextResponse.json(
        { error: "Invalid business profile", errors: profileValidation.errors },
        { status: 400 }
      );
    }

    const sectionType = body.sectionType;
    if (!sectionType || typeof sectionType !== "string") {
      return NextResponse.json(
        { error: "sectionType is required" },
        { status: 400 }
      );
    }

    const provider = getGenerationProvider();
    const section = await provider.regenerateSection(
      profileValidation.sanitized,
      sectionType,
      body.existingSection
    );

    return NextResponse.json({
      success: true,
      section,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
