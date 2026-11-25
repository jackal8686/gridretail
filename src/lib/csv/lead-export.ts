import { Lead } from "@/types/lead";

/**
 * Escapes CSV values and neutralizes CSV Formula Injection (CWE-1236).
 * Any string value beginning with '=', '+', '-', '@', '\t', '\r'
 * is prepended with a single quote (') to force spreadsheet software
 * (Microsoft Excel, Google Sheets, LibreOffice) to treat it as plain text.
 */
export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Check formula injection prefixes
  const formulaChars = ["=", "+", "-", "@", "\t", "\r"];
  if (formulaChars.some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function generateLeadsCsv(leads: Lead[]): string {
  const headers = [
    "Lead ID",
    "Full Name",
    "Email",
    "Phone",
    "Company",
    "Status",
    "Source Form",
    "Submissions Count",
    "First Submitted",
    "Last Submitted",
    "Assigned To",
  ];

  const rows = leads.map((lead) => [
    sanitizeCsvValue(lead.id),
    sanitizeCsvValue(lead.fullName),
    sanitizeCsvValue(lead.email || ""),
    sanitizeCsvValue(lead.phone || ""),
    sanitizeCsvValue(lead.company || ""),
    sanitizeCsvValue(lead.status),
    sanitizeCsvValue(lead.source),
    sanitizeCsvValue(lead.submissionCount || 1),
    sanitizeCsvValue(lead.firstSubmissionAt),
    sanitizeCsvValue(lead.lastSubmissionAt),
    sanitizeCsvValue(lead.assignedToName || lead.assignedTo || "Unassigned"),
  ]);

  const csvContent = [
    headers.map((h) => sanitizeCsvValue(h)).join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");
  return csvContent;
}
