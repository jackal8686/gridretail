import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { LeadRepository } from "@/lib/repositories/lead.repository";
import { generateLeadsCsv } from "@/lib/csv/lead-export";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    // Role Authorization: Only Admin role can access and export Lead CRM
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Lead CRM export requires Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId } = await params;
    const leads = await LeadRepository.findByStore(storeId, { includeArchived: true });
    const csvContent = generateLeadsCsv(leads);

    const filename = `leads_export_${storeId}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting leads:", error);
    return NextResponse.json({ error: "Failed to export leads" }, { status: 500 });
  }
}
