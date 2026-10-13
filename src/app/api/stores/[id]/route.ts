import { NextRequest, NextResponse } from "next/server";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { auth } from "@/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await StoreRepository.findById(id);

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({ store });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userName = session?.user?.name || "Alex Mercer";

  try {
    const existing = await StoreRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const updates = await request.json();

    // Check slug uniqueness if changed
    if (updates.slug && updates.slug !== existing.slug) {
      const isAvailable = await StoreRepository.isSlugAvailable(updates.slug, id);
      if (!isAvailable) {
        return NextResponse.json(
          { error: `Store slug "${updates.slug}" is already in use.` },
          { status: 409 }
        );
      }
    }

    const updated = await StoreRepository.update(id, updates);

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
