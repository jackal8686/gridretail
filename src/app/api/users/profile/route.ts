import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRepository } from "@/lib/repositories/user.repository";
import { validateEmail, normalizeEmail } from "@/lib/validation/user";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name && !email) {
      return NextResponse.json({ error: "Name or email is required to update profile." }, { status: 400 });
    }

    if (email) {
      if (!validateEmail(email)) {
        return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
      }
      const normalized = normalizeEmail(email);
      const existing = await UserRepository.findByEmail(normalized);
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "Email address is already in use by another account." }, { status: 409 });
      }
    }

    const updated = await UserRepository.updateProfile(userId, { name, email });
    if (!updated) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: (err as Error).message || "Failed to update profile." }, { status: 500 });
  }
}
