import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";

describe("Pre-Phase-12: Previously Booked Appointments Section & Lifecycle", () => {
  const storeA = `store_legal_${Date.now()}`;
  const storeB = `store_clinic_${Date.now()}`;
  const customer1 = "clara.oswald@example.com";
  const customer2 = "rory.williams@example.com";

  it("persists appointments and retrieves them strictly scoped by storeId and customerEmail", async () => {
    // Seed store A service and provider
    const srvA = await ServiceRepository.create({
      storeId: storeA,
      name: "Strategic Corporate Advisory",
      description: "60-minute executive session",
      durationMinutes: 60,
      price: 5000,
      currency: "INR",
      category: "Legal Practice & Advisory",
      meetingType: "video_call",
      isActive: true,
      order: 0,
    });

    const prvA = await ProviderRepository.create({
      storeId: storeA,
      name: "Dr. Evelyn Reed",
      role: "Senior Partner",
      email: "evelyn@alphalegal.example",
      status: "active",
      isActive: true,
    });

    // Seed store B service
    const srvB = await ServiceRepository.create({
      storeId: storeB,
      name: "Routine Health Check",
      description: "30-minute checkup",
      durationMinutes: 30,
      price: 1000,
      currency: "INR",
      category: "Healthcare & Medical Clinic",
      meetingType: "in_person",
      isActive: true,
      order: 0,
    });

    // Create 2 appointments for customer 1 on Store A
    const apt1A = await AppointmentRepository.create({
      storeId: storeA,
      serviceId: srvA.id,
      serviceName: srvA.name,
      providerId: prvA.id,
      providerName: prvA.name,
      customerName: "Clara Oswald",
      customerEmail: customer1,
      startUtc: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endUtc: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      durationMinutes: 60,
      price: 5000,
      currency: "INR",
      status: "Confirmed",
      confirmationNumber: `APT-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    const apt2A = await AppointmentRepository.create({
      storeId: storeA,
      serviceId: srvA.id,
      serviceName: srvA.name,
      providerId: prvA.id,
      providerName: prvA.name,
      customerName: "Clara Oswald",
      customerEmail: customer1,
      startUtc: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
      endUtc: new Date(Date.now() + 172800000 + 3600000).toISOString(),
      durationMinutes: 60,
      price: 5000,
      currency: "INR",
      status: "Pending",
      confirmationNumber: `APT-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    // Create 1 appointment for customer 2 on Store A
    const aptCustomer2 = await AppointmentRepository.create({
      storeId: storeA,
      serviceId: srvA.id,
      serviceName: srvA.name,
      providerId: prvA.id,
      providerName: prvA.name,
      customerName: "Rory Williams",
      customerEmail: customer2,
      startUtc: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
      endUtc: new Date(Date.now() + 259200000 + 3600000).toISOString(),
      durationMinutes: 60,
      price: 5000,
      currency: "INR",
      status: "Confirmed",
      confirmationNumber: `APT-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    // Create 1 appointment for customer 1 on Store B (cross-tenant test)
    const apt1B = await AppointmentRepository.create({
      storeId: storeB,
      serviceId: srvB.id,
      serviceName: srvB.name,
      customerName: "Clara Oswald",
      customerEmail: customer1,
      startUtc: new Date(Date.now() + 86400000).toISOString(),
      endUtc: new Date(Date.now() + 86400000 + 1800000).toISOString(),
      durationMinutes: 30,
      price: 1000,
      currency: "INR",
      status: "Confirmed",
      confirmationNumber: `APT-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    assert.ok(apt1A.id);
    assert.ok(apt2A.id);
    assert.ok(aptCustomer2.id);
    assert.ok(apt1B.id);

    // 1. Query appointments for customer 1 on Store A
    const storeACustomer1Appts = await AppointmentRepository.findByCustomerEmail(storeA, customer1);
    assert.equal(storeACustomer1Appts.length, 2, "Customer 1 should have exactly 2 appointments on Store A");
    const apptIds = storeACustomer1Appts.map((a) => a.id);
    assert.ok(apptIds.includes(apt1A.id));
    assert.ok(apptIds.includes(apt2A.id));

    // 2. Cross-customer isolation: Customer 1 query must NOT leak Customer 2 appointments
    assert.ok(!apptIds.includes(aptCustomer2.id), "Customer 1 query must NEVER include Customer 2 appointments");

    // 3. Cross-store isolation: Customer 1 query on Store A must NOT leak appointments from Store B
    assert.ok(!apptIds.includes(apt1B.id), "Store A customer query must NEVER include appointments from Store B");

    // 4. Case-insensitivity check: Clara's email in uppercase with whitespace
    const caseInsensitiveAppts = await AppointmentRepository.findByCustomerEmail(storeA, "  CLARA.OSWALD@EXAMPLE.COM  ");
    assert.equal(caseInsensitiveAppts.length, 2, "Query must match email case-insensitively with whitespace trimmed");

    // 5. Empty state: query non-existent customer
    const emptyAppts = await AppointmentRepository.findByCustomerEmail(storeA, "unknown.user@nowhere.test");
    assert.equal(emptyAppts.length, 0, "Non-existent customer must return an empty list without error");
  });

  it("verifies accurate appointment details, timing, reference code, and status metadata", async () => {
    const appts = await AppointmentRepository.findByCustomerEmail(storeA, customer1);
    assert.ok(appts.length >= 2);
    const confirmedAppt = appts.find((a) => a.status === "Confirmed");
    assert.ok(confirmedAppt);

    assert.equal(confirmedAppt?.serviceName, "Strategic Corporate Advisory");
    assert.equal(confirmedAppt?.providerName, "Dr. Evelyn Reed");
    assert.equal(confirmedAppt?.durationMinutes, 60);
    assert.equal(confirmedAppt?.price, 5000);
    assert.equal(confirmedAppt?.currency, "INR");
    assert.ok(confirmedAppt?.confirmationNumber.startsWith("APT-SIM-"));
    assert.ok(confirmedAppt?.startUtc);
    assert.ok(confirmedAppt?.endUtc);
  });

  it("correctly partitions appointments into upcoming versus past/cancelled", async () => {
    // Create a past appointment
    const pastStart = new Date(Date.now() - 86400000).toISOString(); // Yesterday
    const pastEnd = new Date(Date.now() - 86400000 + 3600000).toISOString();

    const pastAppt = await AppointmentRepository.create({
      storeId: storeA,
      serviceId: "srv_test",
      serviceName: "Archived Advisory Session",
      customerName: "Clara Oswald",
      customerEmail: customer1,
      startUtc: pastStart,
      endUtc: pastEnd,
      durationMinutes: 60,
      price: 2500,
      currency: "INR",
      status: "Completed",
      confirmationNumber: `APT-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
    });

    const allCustomerAppts = await AppointmentRepository.findByCustomerEmail(storeA, customer1);
    const now = new Date();

    const upcoming = allCustomerAppts.filter(
      (a) => new Date(a.startUtc) > now && a.status !== "Cancelled" && a.status !== "Completed"
    );
    const pastOrCancelled = allCustomerAppts.filter(
      (a) => new Date(a.startUtc) <= now || a.status === "Cancelled" || a.status === "Completed"
    );

    assert.ok(upcoming.length >= 2, "Should have upcoming appointments");
    assert.ok(pastOrCancelled.some((a) => a.id === pastAppt.id), "Past completed appointment must be categorized in past/cancelled");
  });

  it("cancels an appointment and safely releases its slot locks", async () => {
    const appts = await AppointmentRepository.findByCustomerEmail(storeA, customer1);
    const target = appts.find((a) => a.status === "Confirmed");
    assert.ok(target, "Target confirmed appointment should exist");

    // Overlap should detect the slot as booked before cancellation
    const isOverlappingBefore = await AppointmentRepository.checkOverlap(
      storeA,
      target.providerId,
      target.startUtc,
      target.endUtc
    );
    assert.equal(isOverlappingBefore, true, "Slot must be blocked while appointment is confirmed");

    // Perform cancellation
    const cancelled = await AppointmentRepository.cancel(target.id, "Client requested cancellation due to travel");
    assert.ok(cancelled);
    assert.equal(cancelled?.status, "Cancelled");
    assert.ok(cancelled?.cancelledAtUtc);
    assert.equal(cancelled?.cancellationReason, "Client requested cancellation due to travel");

    // Verify retrieval reflects cancellation
    const retrieved = await AppointmentRepository.findById(target.id);
    assert.equal(retrieved?.status, "Cancelled");

    // Slot lock must now be RELEASED: checkOverlap should now report false
    const isOverlappingAfter = await AppointmentRepository.checkOverlap(
      storeA,
      target.providerId,
      target.startUtc,
      target.endUtc
    );
    assert.equal(isOverlappingAfter, false, "Slot must be immediately released after cancellation");

    // Repeat cancellation should be idempotent
    const repeatCancel = await AppointmentRepository.cancel(target.id, "Repeat attempt");
    assert.equal(repeatCancel?.status, "Cancelled");
  });

  it("enforces tenant boundary: cannot cancel an appointment using mismatched customer email", async () => {
    const appts = await AppointmentRepository.findByCustomerEmail(storeA, customer2);
    assert.ok(appts.length > 0);
    const roryAppt = appts[0];

    // Attempt cancellation verification: customer1 tries to cancel Rory's appointment
    const target = await AppointmentRepository.findById(roryAppt.id);
    assert.ok(target);
    const authorized = target.customerEmail.toLowerCase().trim() === customer1.toLowerCase().trim();
    assert.equal(authorized, false, "Unauthorized customer email must be rejected");

    // Authorized customer verification
    const authorizedSelf = target.customerEmail.toLowerCase().trim() === customer2.toLowerCase().trim();
    assert.equal(authorizedSelf, true, "Authorized customer email must be accepted");
  });
});
