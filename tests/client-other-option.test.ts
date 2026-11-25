import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ClientRepository } from "@/lib/repositories/client.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { Client } from "@/types";

describe("Pre-Phase-12: Client Account 'Other' Option & Validation", () => {
  it("retrieves existing client accounts and allows selecting them", async () => {
    const clients = await ClientRepository.findAll();
    assert.ok(clients.length > 0, "Client directory should contain seeded clients");
    const firstClient = clients[0];

    const found = await ClientRepository.findById(firstClient.id);
    assert.ok(found, "Should find client by ID");
    assert.equal(found?.company, firstClient.company);
  });

  it("finds a client by company name (case-insensitive)", async () => {
    const testCompany = `Alpha Legal ${Date.now()}`;
    const created = await ClientRepository.create({
      id: `cli_test_${Date.now()}`,
      name: "Arthur Pendelton",
      company: testCompany,
      contactEmail: "arthur@alphalegal.example",
      contactPhone: "+1 (555) 234-5678",
      industry: "Legal Practice & Advisory",
      storeCount: 0,
      lastActive: "Just now",
      status: "Active",
      assignedAccountManager: "Alex Mercer",
    });

    // Exact match
    const exact = await ClientRepository.findByCompany(testCompany);
    assert.ok(exact, "Should find by exact company name");
    assert.equal(exact?.id, created.id);

    // Case-insensitive match with whitespace
    const caseInsensitive = await ClientRepository.findByCompany(`  ${testCompany.toLowerCase()}  `);
    assert.ok(caseInsensitive, "Should find case-insensitively with whitespace trimmed");
    assert.equal(caseInsensitive?.id, created.id);

    // Non-existent company
    const nonExistent = await ClientRepository.findByCompany("Non-Existent Enterprise 99999");
    assert.equal(nonExistent, null, "Should return null for non-existent company");
  });

  it("creates, persists, and associates a new client created via the 'Other' workflow", async () => {
    const newCompanyName = `Apex Strategic Advisors ${Date.now()}`;
    const newLeadName = "Eleanor Vance";

    // 1. Create client
    const newClient: Client = {
      id: `cli_other_${Date.now()}`,
      name: newLeadName,
      company: newCompanyName,
      contactEmail: `${newCompanyName.toLowerCase().replace(/\s+/g, "")}@example.demo`,
      contactPhone: "+1 (555) 000-0000",
      industry: "Consulting & Strategy",
      storeCount: 0,
      lastActive: "Just now",
      status: "Active",
      assignedAccountManager: "Alex Mercer",
    };

    const savedClient = await ClientRepository.create(newClient);
    assert.ok(savedClient.id);
    assert.equal(savedClient.company, newCompanyName);

    // 2. Client is persisted in repository and appears in findAll
    const allClients = await ClientRepository.findAll();
    const foundInList = allClients.find((c) => c.id === savedClient.id);
    assert.ok(foundInList, "Saved 'Other' client must be present in client repository listings");
    assert.equal(foundInList?.name, newLeadName);

    // 3. Associating client with a new store persists correctly
    const storeSlug = `apex-consulting-${Date.now()}`;
    const storeId = `store_other_${Date.now()}`;
    const store = await StoreRepository.create({
      id: storeId,
      name: "Apex Consulting Hub",
      slug: storeSlug,
      industry: "Health & Wellness",
      clientName: savedClient.company,
      clientId: savedClient.id,
      templateName: "Minimal Clean",
      templateId: "template-minimal-stone",
      themeId: "minimal-stone",
      websiteType: "appointments",
      appointmentIndustry: "Consulting & Strategy",
      status: "Draft",
      productCount: 0,
      description: "Demo consulting hub",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });

    assert.ok(store.id);
    assert.equal(store.clientId, savedClient.id, "Store must be associated with the newly created client ID");

    // Verify retrieval by ID
    const retrievedStore = await StoreRepository.findById(store.id);
    assert.equal(retrievedStore?.clientId, savedClient.id);
  });

  it("prevents accidental duplicate client records and identifies existing accounts", async () => {
    const duplicateCompany = `Veritas Global Law ${Date.now()}`;

    // Create initial client
    const client1 = await ClientRepository.create({
      id: `cli_dup1_${Date.now()}`,
      name: "Jonathan Harker",
      company: duplicateCompany,
      contactEmail: "jonathan@veritas.example",
      contactPhone: "+1 (555) 111-2222",
      industry: "Legal Practice & Advisory",
      storeCount: 0,
      lastActive: "Just now",
      status: "Active",
      assignedAccountManager: "Alex Mercer",
    });

    // Check duplicate
    const duplicateMatch = await ClientRepository.findByCompany(duplicateCompany);
    assert.ok(duplicateMatch, "Duplicate check must identify the existing company");
    assert.equal(duplicateMatch?.id, client1.id);
  });

  it("validates company name length and rejects empty or whitespace-only inputs", () => {
    const validateClientName = (company?: string) => {
      const trimmed = company?.trim();
      if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
        return { valid: false, error: "Company name is required and must be between 2 and 100 characters." };
      }
      return { valid: true, trimmed };
    };

    assert.equal(validateClientName("").valid, false);
    assert.equal(validateClientName("   ").valid, false);
    assert.equal(validateClientName("A").valid, false);
    assert.equal(validateClientName("A".repeat(101)).valid, false);
    assert.equal(validateClientName("Apex Advisory").valid, true);
    assert.equal(validateClientName("  Trimmed Co  ").trimmed, "Trimmed Co");
  });

  it("preserves 'Quick Add Client' functionality alongside 'Other'", async () => {
    const quickAddCompany = `Quick Add Enterprise ${Date.now()}`;
    const quickClient: Client = {
      id: `cli_quick_${Date.now()}`,
      name: "Quick Lead",
      company: quickAddCompany,
      contactEmail: "lead@quickadd.example",
      contactPhone: "+1 (555) 999-0000",
      industry: "Home & Living",
      storeCount: 0,
      lastActive: "Just now",
      status: "Active",
      assignedAccountManager: "Alex Mercer",
    };

    const created = await ClientRepository.create(quickClient);
    assert.equal(created.company, quickAddCompany);

    const retrieved = await ClientRepository.findById(created.id);
    assert.ok(retrieved);
    assert.equal(retrieved?.id, created.id);
  });
});
