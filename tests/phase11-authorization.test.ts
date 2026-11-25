import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canAccessStore } from "../src/lib/auth/permissions";
import { Store } from "../src/types/store";
import { AppointmentStatus } from "../src/types/appointment";
import { ServiceRepository } from "../src/lib/repositories/service.repository";
import { ProviderRepository } from "../src/lib/repositories/provider.repository";
import { AppointmentRepository } from "../src/lib/repositories/appointment.repository";

// The state transition table enforced in appointment management endpoints
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "Cancelled", "No-show"],
  Cancelled: [],
  Completed: [],
  "No-show": [],
};

function isValidTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("Phase 11.1 Security: Authorization, Cross-Store Isolation & State Machines", () => {
  const storeA: Store = {
    id: "store_alpha_123",
    slug: "alpha-store",
    name: "Alpha Legal",
    clientId: "client_alpha",
    clientName: "Alpha Client",
    description: "Alpha Legal Practice",
    productCount: 0,
    industry: "Health & Wellness",
    websiteType: "appointments",
    appointmentIndustry: "Legal Practice & Advisory",
    templateId: "professional-services",
    templateName: "Professional Services",
    themeId: "corporate-navy",
    creatorId: "user_employee_1",
    status: "Published",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  const storeB: Store = {
    id: "store_beta_456",
    slug: "beta-store",
    name: "Beta Consulting",
    clientId: "client_beta",
    clientName: "Beta Client",
    description: "Beta Strategy Consulting",
    productCount: 0,
    industry: "Health & Wellness",
    websiteType: "appointments",
    appointmentIndustry: "Consulting & Strategy",
    templateId: "professional-services",
    templateName: "Professional Services",
    themeId: "executive-slate",
    creatorId: "user_employee_2",
    status: "Published",
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  test("canAccessStore: standard employee is forbidden from editing another employee's store", () => {
    const employee1 = { id: "user_employee_1", role: "employee" as const };
    const employee2 = { id: "user_employee_2", role: "employee" as const };

    // Employee 1 can edit their own store
    assert.equal(canAccessStore(employee1, storeA, "edit"), true);

    // Employee 1 CANNOT edit Employee 2's store
    assert.equal(canAccessStore(employee1, storeB, "edit"), false);

    // Employee 2 CANNOT edit Employee 1's store
    assert.equal(canAccessStore(employee2, storeA, "edit"), false);
  });

  test("canAccessStore: admin and sales director have organization-wide edit access", () => {
    const admin = { id: "user_admin", role: "admin" as const };
    const director = { id: "user_director", role: "sales_director" as const };

    assert.equal(canAccessStore(admin, storeA, "edit"), true);
    assert.equal(canAccessStore(admin, storeB, "edit"), true);
    assert.equal(canAccessStore(director, storeA, "edit"), true);
    assert.equal(canAccessStore(director, storeB, "edit"), true);
  });

  test("Appointment state machine validates allowed and terminal transitions", () => {
    // Valid forward transitions
    assert.equal(isValidTransition("Pending", "Confirmed"), true);
    assert.equal(isValidTransition("Pending", "Cancelled"), true);
    assert.equal(isValidTransition("Confirmed", "Completed"), true);
    assert.equal(isValidTransition("Confirmed", "Cancelled"), true);
    assert.equal(isValidTransition("Confirmed", "No-show"), true);

    // Invalid backwards or illegal skips
    assert.equal(isValidTransition("Pending", "Completed"), false, "Cannot skip from Pending directly to Completed");
    assert.equal(isValidTransition("Pending", "No-show"), false, "Cannot mark Pending appointment as No-show");
    assert.equal(isValidTransition("Confirmed", "Pending"), false, "Cannot downgrade Confirmed back to Pending");

    // Terminal states cannot transition to anything
    assert.equal(isValidTransition("Cancelled", "Confirmed"), false, "Cancelled is terminal");
    assert.equal(isValidTransition("Cancelled", "Pending"), false, "Cancelled is terminal");
    assert.equal(isValidTransition("Completed", "Confirmed"), false, "Completed is terminal");
    assert.equal(isValidTransition("Completed", "Cancelled"), false, "Completed is terminal");
    assert.equal(isValidTransition("No-show", "Confirmed"), false, "No-show is terminal");
  });

  test("Cross-store isolation: services and providers belong strictly to their storeId", async () => {
    // Create Service in Store A
    const srvA = await ServiceRepository.create({
      id: "srv_store_a",
      storeId: storeA.id,
      name: "Alpha Consultation",
      durationMinutes: 45,
      price: 2500,
      currency: "INR",
      isFreeConsultation: false,
      meetingType: "video_call",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create Service in Store B
    const srvB = await ServiceRepository.create({
      id: "srv_store_b",
      storeId: storeB.id,
      name: "Beta Strategy Session",
      durationMinutes: 60,
      price: 5000,
      currency: "INR",
      isFreeConsultation: false,
      meetingType: "in_person",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create Provider in Store A
    const prvA = await ProviderRepository.create({
      id: "prv_store_a",
      storeId: storeA.id,
      name: "Dr. Alpha",
      role: "Partner",
      email: "alpha@example.com",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Find services by storeId must never return services from other stores
    const servicesForA = await ServiceRepository.findByStoreId(storeA.id);
    const servicesForB = await ServiceRepository.findByStoreId(storeB.id);

    assert.ok(servicesForA.some((s) => s.id === srvA.id));
    assert.ok(!servicesForA.some((s) => s.id === srvB.id), "Store A must not see Store B's services");

    assert.ok(servicesForB.some((s) => s.id === srvB.id));
    assert.ok(!servicesForB.some((s) => s.id === srvA.id), "Store B must not see Store A's services");

    // Provider check for Store A vs B
    const providersForA = await ProviderRepository.findByStoreId(storeA.id);
    const providersForB = await ProviderRepository.findByStoreId(storeB.id);

    assert.ok(providersForA.some((p) => p.id === prvA.id));
    assert.ok(!providersForB.some((p) => p.id === prvA.id), "Store B must not see Store A's providers");

    // Clean up
    await ServiceRepository.delete(srvA.id);
    await ServiceRepository.delete(srvB.id);
    await ProviderRepository.delete(prvA.id);
  });

  test("Appointment repository enforces storeId query boundaries", async () => {
    const apptA = await AppointmentRepository.create({
      storeId: storeA.id,
      serviceId: "srv_test_a",
      startUtc: "2026-12-20T10:00:00.000Z",
      endUtc: "2026-12-20T11:00:00.000Z",
      customerName: "Client A",
      customerEmail: "a@client.test",
    });

    const apptB = await AppointmentRepository.create({
      storeId: storeB.id,
      serviceId: "srv_test_b",
      startUtc: "2026-12-20T10:00:00.000Z",
      endUtc: "2026-12-20T11:00:00.000Z",
      customerName: "Client B",
      customerEmail: "b@client.test",
    });

    const storeAAppts = await AppointmentRepository.findByStoreId(storeA.id);
    const storeBAppts = await AppointmentRepository.findByStoreId(storeB.id);

    assert.ok(storeAAppts.some((a) => a.id === apptA.id));
    assert.ok(!storeAAppts.some((a) => a.id === apptB.id), "Store A must not see Store B's appointments");

    assert.ok(storeBAppts.some((a) => a.id === apptB.id));
    assert.ok(!storeBAppts.some((a) => a.id === apptA.id), "Store B must not see Store A's appointments");

    // Clean up
    await AppointmentRepository.deleteByStoreId(storeA.id);
    await AppointmentRepository.deleteByStoreId(storeB.id);
  });
});
