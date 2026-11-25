import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { UserRepository } from "@/lib/repositories/user.repository";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password." },
        { status: 403 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const updated = await UserRepository.updatePassword(userId, newHash);
    if (!updated) {
      return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err: unknown) {
    console.error("Password change error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to change password." },
      { status: 500 }
    );
  }
}
