import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { processLeadsCsvImport } from "@/lib/csv/lead-import";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    // Role Authorization: Only Admin role can access and import leads
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Lead CRM import requires Administrator credentials." },
        { status: 403 }
      );
    }

    const { id: storeId } = await params;
    const body = await request.json();
    const csvContent = body.csvText;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'csvText' payload." },
        { status: 400 }
      );
    }

    const result = await processLeadsCsvImport(storeId, csvContent);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return NextResponse.json({ error: "Failed to import leads." }, { status: 500 });
  }
}
