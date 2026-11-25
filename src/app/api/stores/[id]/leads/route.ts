import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeadRepository } from "@/lib/repositories/lead.repository";
import { LeadStatus } from "@/types/lead";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Lead CRM requires Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId } = await params;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as LeadStatus | null;
    const search = url.searchParams.get("search") || undefined;
    const assignedTo = url.searchParams.get("assignedTo") || undefined;
    const includeArchived = url.searchParams.get("includeArchived") === "true";

    const leads = await LeadRepository.findByStore(storeId, {
      status: status || undefined,
      search,
      assignedTo,
      includeArchived,
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Lead CRM requires Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId } = await params;
    const body = await request.json();

    if (!body.fullName || typeof body.fullName !== "string") {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    const lead = await LeadRepository.create({
      storeId,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      company: body.company,
      status: body.status || "New",
      source: body.source || "Manual Entry",
      assignedTo: body.assignedTo,
      assignedToName: body.assignedToName,
      tags: body.tags,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
