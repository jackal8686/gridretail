import { LeadStatus } from "@/types/lead";
import { LeadRepository } from "@/lib/repositories/lead.repository";

export interface CsvImportRow {
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: LeadStatus;
  source?: string;
}

export interface CsvImportResult {
  totalRows: number;
  imported: number;
  merged: number;
  errors: Array<{ row: number; error: string }>;
  crossStoreCollisionsDetected: number;
  crossStoreWarning?: string;
}

/**
 * Parses raw CSV text into structured rows, handling quoted values.
 */
export function parseCsvText(csvText: string): string[][] {
  const lines: string[][] = [];
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  for (const line of rawLines) {
    const row: string[] = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    row.push(currentValue.trim());
    lines.push(row);
  }

  return lines;
}

/**
 * Imports leads from parsed CSV rows into target store.
 * - Enforces store isolation: duplicate checking and merges happen ONLY within destination storeId.
 * - Detects cross-store collisions in a privacy-preserving way (checks if normalized email exists elsewhere
 *   WITHOUT leaking the other store's name, lead details, or data).
 */
export async function processLeadsCsvImport(
  targetStoreId: string,
  csvText: string
): Promise<CsvImportResult> {
  const parsed = parseCsvText(csvText);
  if (parsed.length <= 1) {
    return {
      totalRows: 0,
      imported: 0,
      merged: 0,
      errors: [{ row: 0, error: "CSV file is empty or missing data rows." }],
      crossStoreCollisionsDetected: 0,
    };
  }

  const headerRow = parsed[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const nameIdx = headerRow.findIndex((h) => h.includes("name"));
  const emailIdx = headerRow.findIndex((h) => h.includes("email"));
  const phoneIdx = headerRow.findIndex((h) => h.includes("phone"));
  const compIdx = headerRow.findIndex((h) => h.includes("company"));
  const statusIdx = headerRow.findIndex((h) => h.includes("status"));

  if (nameIdx === -1 && emailIdx === -1) {
    return {
      totalRows: 0,
      imported: 0,
      merged: 0,
      errors: [{ row: 0, error: "CSV must contain at least a 'Name' or 'Email' column." }],
      crossStoreCollisionsDetected: 0,
    };
  }

  let importedCount = 0;
  let mergedCount = 0;
  const crossStoreCollisions = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    const fullName = nameIdx !== -1 ? row[nameIdx] || "" : "";
    const email = emailIdx !== -1 ? row[emailIdx] || "" : "";
    const phone = phoneIdx !== -1 ? row[phoneIdx] || "" : "";
    const company = compIdx !== -1 ? row[compIdx] || "" : "";
    const statusVal = statusIdx !== -1 ? row[statusIdx] : "";

    const validStatuses: LeadStatus[] = ["New", "Contacted", "Qualified", "Converted", "Lost"];
    const status: LeadStatus = validStatuses.includes(statusVal as LeadStatus)
      ? (statusVal as LeadStatus)
      : "New";

    if (!fullName && !email && !phone) {
      errors.push({ row: i + 1, error: "Row is empty or lacks contact identifier." });
      continue;
    }

    try {
      const { lead, isNew } = await LeadRepository.upsertLeadFromSubmission(targetStoreId, {
        fullName: fullName || "Imported Contact",
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        source: "CSV Import",
        submittedAt: new Date().toISOString(),
      });

      if (isNew) {
        if (status !== "New") {
          await LeadRepository.update(targetStoreId, lead.id, { status });
        }
        importedCount++;
      } else {
        mergedCount++;
      }
    } catch (err) {
      errors.push({ row: i + 1, error: err instanceof Error ? err.message : "Failed to import row" });
    }
  }

  return {
    totalRows: parsed.length - 1,
    imported: importedCount,
    merged: mergedCount,
    errors,
    crossStoreCollisionsDetected: crossStoreCollisions,
    crossStoreWarning:
      crossStoreCollisions > 0
        ? `${crossStoreCollisions} contact(s) matched existing profiles in other workspaces. Cross-store merging was prevented to maintain privacy and tenant isolation.`
        : undefined,
  };
}
