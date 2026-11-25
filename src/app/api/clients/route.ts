import { NextRequest, NextResponse } from "next/server";
import { ClientRepository } from "@/lib/repositories/client.repository";
import { ActivityRepository } from "@/lib/repositories/activity.repository";
import { Client } from "@/types";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const clients = await ClientRepository.findAll({ status, search });
  return NextResponse.json({ clients, count: clients.length });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userName = session?.user?.name || "Alex Mercer";

  try {
    const body = await request.json();

    const companyTrimmed = body.company?.trim();
    if (!companyTrimmed || companyTrimmed.length < 2 || companyTrimmed.length > 100) {
      return NextResponse.json(
        { error: "Company name is required and must be between 2 and 100 characters." },
        { status: 400 }
      );
    }

    const existingClient = await ClientRepository.findByCompany(companyTrimmed);
    if (existingClient) {
      return NextResponse.json(
        {
          error: `A client account named "${existingClient.company}" already exists.`,
          client: existingClient,
          duplicate: true,
        },
        { status: 409 }
      );
    }

    const newClient: Client = {
      id: `cli_${Date.now()}`,
      name: body.name?.trim() || "Account Lead",
      company: companyTrimmed,
      contactEmail: body.contactEmail?.trim() || `${companyTrimmed.toLowerCase().replace(/\s+/g, "")}@example.demo`,
      contactPhone: body.contactPhone?.trim() || "+1 (555) 000-0000",
      industry: body.industry || "General Retail",
      storeCount: 0,
      lastActive: "Just now",
      status: "Active",
      assignedAccountManager: userName,
    };

    const created = await ClientRepository.create(newClient);

    await ActivityRepository.record({
      type: "client_added",
      title: "Client account onboarded",
      description: `Added client ${created.company} to platform roster`,
      user: {
        name: userName,
        avatarInitial: userName.charAt(0).toUpperCase(),
      },
      targetId: created.id,
      targetName: created.company,
    });

    return NextResponse.json({ client: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
