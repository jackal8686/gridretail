import { NextRequest, NextResponse } from "next/server";
import { validateBusinessProfile } from "@/lib/validation/business-profile";
import { getGenerationProvider } from "@/lib/generation/provider";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profileValidation = validateBusinessProfile(body.profile || body);

    if (!profileValidation.valid || !profileValidation.sanitized) {
      return NextResponse.json(
        { error: "Invalid business profile", errors: profileValidation.errors },
        { status: 400 }
      );
    }

    const provider = getGenerationProvider();
    const plan = await provider.generatePlan(profileValidation.sanitized);

    return NextResponse.json({
      success: true,
      plan,
      profile: profileValidation.sanitized,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
