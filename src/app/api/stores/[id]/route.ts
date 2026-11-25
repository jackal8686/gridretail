import { NextRequest, NextResponse } from "next/server";
import { StoreRepository, hasEditorManagedFields } from "@/lib/repositories/store.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { auth } from "@/auth";
import { canAccessStore } from "@/lib/auth/permissions";
import { UserRole } from "@/types/user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let store = await StoreRepository.findById(id);
  if (!store) {
    store = await StoreRepository.findBySlug(id);
  }

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Security Protection: Draft stores require authentication and ownership verification
  if (store.status === "Draft") {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Draft store requires authentication" },
        { status: 401 }
      );
    }
    const userRole = (session.user.role as UserRole) || "employee";
    const userId = session.user.id || "";
    if (!canAccessStore({ id: userId, role: userRole, email: session.user.email || undefined }, store, "view")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this draft store" },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ store });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userName = session.user.name || session.user.email || "Operator";

  try {
    let existing = await StoreRepository.findById(id);
    if (!existing) {
      existing = await StoreRepository.findBySlug(id);
    }
    if (!existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const userRole = (session.user.role as UserRole) || "employee";
    const userId = session.user.id || "";
    if (!canAccessStore({ id: userId, role: userRole }, existing, "edit")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify this store" },
        { status: 403 }
      );
    }

    const updates = await request.json();

    // Server-Side Version Header Extraction
    const headerVer = parseInt(request.headers.get("x-gridretail-version") || "", 10);
    if (!isNaN(headerVer) && updates.version === undefined) {
      updates.version = headerVer;
    }

    const isScopedAutoVersion =
      Boolean(updates.serverAutoVersion) || request.headers.get("x-gridretail-auto-version") === "true";
    const isScopedAllowUnversioned =
      Boolean(updates.allowUnversioned) || request.headers.get("x-gridretail-allow-unversioned") === "true";
    if (isScopedAutoVersion) updates.serverAutoVersion = true;
    if (isScopedAllowUnversioned) updates.allowUnversioned = true;

    const touchesEditorData = hasEditorManagedFields(updates);

    // Atomic Stale Revision Protection & Multi-Tab Conflict Detection:
    // If incoming request has an older revision or equal revision from an outdated session/tab,
    // or attempts an unversioned write of editor data on a versioned store, return HTTP 409 Conflict.
    if (existing.version !== undefined) {
      if (typeof updates.version === "number") {
        if (updates.version <= existing.version) {
          return NextResponse.json(
            {
              error: "Conflict: Store was modified in another session or tab.",
              conflict: true,
              currentVersion: existing.version,
            },
            { status: 409 }
          );
        }
      } else if (touchesEditorData && !isScopedAutoVersion && !isScopedAllowUnversioned) {
        return NextResponse.json(
          {
            error: "Conflict: Unversioned update cannot modify editor-managed data on a versioned store. A valid revision version is required.",
            conflict: true,
            currentVersion: existing.version,
          },
          { status: 409 }
        );
      }
    }

    if (updates.themeId) {
      const { getThemeById } = await import("@/constants/themes");
      const theme = getThemeById(updates.themeId);
      updates.themeName = theme.name;
    }

    if (updates.templateId) {
      const { getDesignTemplateById } = await import("@/constants/design-templates");
      const dt = getDesignTemplateById(updates.templateId);
      updates.templateName = dt.name;
    }

    // Check slug uniqueness if changed
    if (updates.slug && updates.slug !== existing.slug) {
      const isAvailable = await StoreRepository.isSlugAvailable(updates.slug, existing.id);
      if (!isAvailable) {
        return NextResponse.json(
          { error: `Store slug "${updates.slug}" is already in use.` },
          { status: 409 }
        );
      }
    }

    const updated = await StoreRepository.update(existing.id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Secondary Atomic Concurrency Guard: If an atomic race condition was resolved at the DB/mutex level
    // and this write attempt was safely ignored in favor of a newer concurrent write
    if (
      typeof updates.version === "number" &&
      typeof updated.version === "number" &&
      updated.version !== updates.version
    ) {
      return NextResponse.json(
        {
          error: "Conflict: Concurrent update detected. Newer state preserved.",
          conflict: true,
          currentVersion: updated.version,
        },
        { status: 409 }
      );
    }

    // Record activity
    await ActivityRepository.record({
      type: "store_updated",
      title: "Updated store configuration",
      description: `Configuration modified for ${existing.name}`,
      user: {
        name: userName,
        avatarInitial: userName.charAt(0).toUpperCase(),
      },
      targetId: existing.id,
      targetName: existing.name,
    });

    return NextResponse.json({ store: updated });
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await StoreRepository.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const userRole = (session.user.role as UserRole) || "employee";
  const userId = session.user.id || "";
  if (!canAccessStore({ id: userId, role: userRole }, existing, "delete")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to delete this store" },
      { status: 403 }
    );
  }

  const deleted = await StoreRepository.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }

  const userName = session.user.name || session.user.email || "Operator";
  await ActivityRepository.record({
    type: "store_updated",
    title: "Deleted store project",
    description: `Store "${existing.name}" was permanently removed by ${userName}`,
    user: {
      name: userName,
      avatarInitial: userName.charAt(0).toUpperCase(),
    },
    targetId: existing.id,
    targetName: existing.name,
  });

  return NextResponse.json({ success: true, message: `Store ${existing.name} deleted` });
}
