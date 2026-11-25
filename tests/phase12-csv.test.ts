import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { sanitizeCsvValue, generateLeadsCsv } from "../src/lib/csv/lead-export";
import { parseCsvText, processLeadsCsvImport } from "../src/lib/csv/lead-import";
import { LeadRepository } from "../src/lib/repositories/lead.repository";
import { Lead } from "../src/types/lead";

describe("Phase 12: CSV Security, Formula Injection & Tenant Privacy Protection", () => {
  const storeA = "store_csv_test_A";
  const storeB = "store_csv_test_B";

  beforeEach(() => {
    LeadRepository.clearMemory();
  });

  test("1. Formula Injection Neutralization: Dangerous prefixes are prepended with single-quote", () => {
    // Excel / Google Sheets formula characters: '=', '+', '-', '@', '\t', '\r'
    assert.strictEqual(sanitizeCsvValue("=SUM(A1:A10)"), `"'=SUM(A1:A10)"`);
    assert.strictEqual(sanitizeCsvValue("+123456789"), `"'+123456789"`);
    assert.strictEqual(sanitizeCsvValue("-cmd|' /C calc'!A0"), ` "'-cmd|' /C calc'!A0"`.trim());
    assert.strictEqual(sanitizeCsvValue("@malicious_macro"), `"'@malicious_macro"`);
    assert.strictEqual(sanitizeCsvValue("\tTabCharacter"), `"'\tTabCharacter"`);
    assert.strictEqual(sanitizeCsvValue("\rReturnCharacter"), `"'\rReturnCharacter"`);

    // Standard safe string
    assert.strictEqual(sanitizeCsvValue("Jane Doe"), `"Jane Doe"`);
    assert.strictEqual(sanitizeCsvValue('Company "Acme" Inc.'), `"Company ""Acme"" Inc."`);
  });

  test("2. Full CSV Generation correctly structures rows and escapes malicious lead fields", () => {
    const maliciousLeads: Lead[] = [
      {
        id: "lead_safe_1",
        storeId: storeA,
        fullName: "Sarah Connor",
        email: "sarah@resistance.org",
        phone: "+1 555-0123",
        company: "Cyberdyne Systems",
        status: "Qualified",
        source: "Quote Request",
        firstSubmissionAt: "2026-10-24T10:00:00Z",
        lastSubmissionAt: "2026-10-24T10:00:00Z",
        submissionCount: 1,
        createdAt: "2026-10-24T10:00:00Z",
        updatedAt: "2026-10-24T10:00:00Z",
      },
      {
        id: "lead_malicious_2",
        storeId: storeA,
        fullName: "=cmd|' /C calc'!A0",
        email: "@evil.com",
        phone: "-999999",
        company: '+HYPERLINK("http://attacker.com")',
        status: "New",
        source: "=IMPORTXML()",
        firstSubmissionAt: "2026-10-24T10:00:00Z",
        lastSubmissionAt: "2026-10-24T10:00:00Z",
        submissionCount: 1,
        createdAt: "2026-10-24T10:00:00Z",
        updatedAt: "2026-10-24T10:00:00Z",
      },
    ];

    const csvOutput = generateLeadsCsv(maliciousLeads);
    assert.ok(csvOutput.includes('"Lead ID","Full Name","Email"'));
    assert.ok(csvOutput.includes('"\'=cmd|\' /C calc\'!A0"'));
    assert.ok(csvOutput.includes('"\'@evil.com"'));
    assert.ok(csvOutput.includes('"\'+\\HYPERLINK'.replace('\\', '')));
  });

  test("3. CSV Import parses complex quoting, commas and newlines safely", () => {
    const rawCsv = `Name,Email,Phone,Company,Status
"Smith, John",john@example.com,"+1 555-0100","Smith & Co., LLC",New
"Jane ""Chief"" Doe",jane@example.com,"+1 555-0101","Acme, Inc.",Contacted`;

    const parsed = parseCsvText(rawCsv);
    assert.strictEqual(parsed.length, 3);
    assert.strictEqual(parsed[1][0], "Smith, John");
    assert.strictEqual(parsed[1][3], "Smith & Co., LLC");
    assert.strictEqual(parsed[2][0], 'Jane "Chief" Doe');
  });

  test("4. CSV Import respects destination store boundary and prevents cross-store merging", async () => {
    // Lead exists in Store A
    await LeadRepository.create({
      storeId: storeA,
      fullName: "Executive Client",
      email: "client@enterprise.com",
      company: "Enterprise A",
      source: "Manual",
    });

    // Import identical email into Store B
    const importCsvText = `Name,Email,Phone,Company,Status
Executive Client,client@enterprise.com,+1 555-9999,Enterprise B,Qualified`;

    const result = await processLeadsCsvImport(storeB, importCsvText);
    assert.strictEqual(result.imported, 1);
    assert.strictEqual(result.merged, 0); // Must NOT merge into Store A's lead

    const storeALead = await LeadRepository.findExistingLead(storeA, "client@enterprise.com");
    const storeBLead = await LeadRepository.findExistingLead(storeB, "client@enterprise.com");

    assert.ok(storeALead);
    assert.ok(storeBLead);
    assert.notStrictEqual(storeALead.id, storeBLead.id); // Strict tenant separation
    assert.strictEqual(storeALead.company, "Enterprise A");
    assert.strictEqual(storeBLead.company, "Enterprise B");
  });
});
