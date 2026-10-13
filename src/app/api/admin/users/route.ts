import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRepository } from "@/lib/repositories/user.repository";
import {
  validateEmail,
  validatePassword,
  normalizeEmail,
  hashPassword,
  isValidRole,
} from "@/lib/validation/user";
import { User, SafeUser } from "@/types";

export async function GET() {
  const session = await auth();

  // Server-side role check
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized: Administrator role required." }, { status: 403 });
  }

  const users = await UserRepository.findAll();
  return NextResponse.json({ users, count: users.length });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  // Server-side role check
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized: Administrator role required." }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json({ error: "User name must be at least 2 characters." }, { status: 400 });
    }

    if (!body.email || !validateEmail(body.email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      return NextResponse.json({ error: `An account with email "${email}" already exists.` }, { status: 409 });
    }

    const passwordVal = validatePassword(body.password);
    if (!passwordVal.valid) {
      return NextResponse.json({ error: passwordVal.error }, { status: 400 });
    }

    const role = body.role || "employee";
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);
    const now = new Date().toISOString();

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: body.name.trim(),
      email,
      passwordHash,
      role,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    const created = await UserRepository.create(newUser);

    const safeUser: SafeUser = {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user account" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized: Administrator role required." }, { status: 403 });
  }

  try {
    const { id, status } = await request.json();

    if (!id || (status !== "active" && status !== "disabled")) {
      return NextResponse.json({ error: "Invalid parameters. id and status ('active' | 'disabled') required." }, { status: 400 });
    }

    // Prevent admin from disabling themselves
    if (session.user.id === id && status === "disabled") {
      return NextResponse.json({ error: "You cannot disable your own administrator account." }, { status: 400 });
    }

    const updated = await UserRepository.updateStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
  }
}
