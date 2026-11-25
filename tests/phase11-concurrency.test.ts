import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { AppointmentRepository } from "../src/lib/repositories/appointment.repository";

describe("Phase 11: Concurrency and Double-Booking Prevention", () => {
  const storeId = `test_store_${Date.now()}`;

  afterEach(async () => {
    await AppointmentRepository.deleteByStoreId(storeId);
  });

  test("rejects simultaneous concurrent booking requests for identical slot", async () => {
    const startUtc = "2026-12-01T10:00:00.000Z";
    const endUtc = "2026-12-01T11:00:00.000Z";

    const [res1, res2] = await Promise.allSettled([
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_test",
        startUtc,
        endUtc,
        customerName: "Alice",
        customerEmail: "alice@example.com",
      }),
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_test",
        startUtc,
        endUtc,
        customerName: "Bob",
        customerEmail: "bob@example.com",
      }),
    ]);

    const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
    const rejected = [res1, res2].filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly one appointment should succeed");
    assert.equal(rejected.length, 1, "Exactly one appointment should be rejected");

    const appointments = await AppointmentRepository.findByStoreId(storeId);
    assert.equal(appointments.length, 1, "Database must only store 1 appointment");
  });

  test("rejects overlapping appointments (partial collision)", async () => {
    // Appt 1: 14:00 - 15:00
    await AppointmentRepository.create({
      storeId,
      serviceId: "srv_test",
      startUtc: "2026-12-01T14:00:00.000Z",
      endUtc: "2026-12-01T15:00:00.000Z",
      customerName: "First Client",
      customerEmail: "first@example.com",
    });

    // Appt 2: 14:30 - 15:30 (overlaps second half)
    await assert.rejects(
      async () => {
        await AppointmentRepository.create({
          storeId,
          serviceId: "srv_test",
          startUtc: "2026-12-01T14:30:00.000Z",
          endUtc: "2026-12-01T15:30:00.000Z",
          customerName: "Overlapping Client",
          customerEmail: "second@example.com",
        });
      },
      /no longer available/
    );
  });

  test("allows adjacent non-overlapping appointments", async () => {
    // Appt 1: 10:00 - 11:00
    const appt1 = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_test",
      startUtc: "2026-12-02T10:00:00.000Z",
      endUtc: "2026-12-02T11:00:00.000Z",
      customerName: "Morning Client",
      customerEmail: "morning@example.com",
    });

    // Appt 2: 11:00 - 12:00 (adjacent immediately after)
    const appt2 = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_test",
      startUtc: "2026-12-02T11:00:00.000Z",
      endUtc: "2026-12-02T12:00:00.000Z",
      customerName: "Midday Client",
      customerEmail: "midday@example.com",
    });

    assert.ok(appt1.id);
    assert.ok(appt2.id);

    const appointments = await AppointmentRepository.findByStoreId(storeId);
    assert.equal(appointments.length, 2, "Both adjacent appointments must exist");
  });

  test("cancellation releases slot locks and allows re-booking", async () => {
    const startUtc = "2026-12-03T16:00:00.000Z";
    const endUtc = "2026-12-03T17:00:00.000Z";

    // 1. Create appointment
    const initial = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_test",
      startUtc,
      endUtc,
      customerName: "Original Client",
      customerEmail: "orig@example.com",
    });

    // 2. Overlap check should be true
    const overlapBefore = await AppointmentRepository.checkOverlap(storeId, undefined, startUtc, endUtc);
    assert.equal(overlapBefore, true, "Slot must be occupied");

    // 3. Cancel the appointment
    const cancelled = await AppointmentRepository.cancel(initial.id, "Client requested cancellation");
    assert.equal(cancelled?.status, "Cancelled");

    // 4. Overlap check should now be false (cancelled excluded)
    const overlapAfter = await AppointmentRepository.checkOverlap(storeId, undefined, startUtc, endUtc);
    assert.equal(overlapAfter, false, "Slot must now be free");

    // 5. Re-booking the exact same slot must now succeed!
    const rebooked = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_test",
      startUtc,
      endUtc,
      customerName: "New Client",
      customerEmail: "new@example.com",
    });

    assert.ok(rebooked.id, "Rebooking must succeed after cancellation");
    assert.notEqual(rebooked.id, initial.id);
  });

  test("allows distinct providers to be booked simultaneously at the same time", async () => {
    const startUtc = "2026-12-04T10:00:00.000Z";
    const endUtc = "2026-12-04T11:00:00.000Z";

    const [drA, drB] = await Promise.all([
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_test",
        providerId: "prov_dr_a",
        startUtc,
        endUtc,
        customerName: "Patient A",
        customerEmail: "a@example.com",
      }),
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_test",
        providerId: "prov_dr_b",
        startUtc,
        endUtc,
        customerName: "Patient B",
        customerEmail: "b@example.com",
      }),
    ]);

    assert.ok(drA.id);
    assert.ok(drB.id);
    assert.equal(drA.providerId, "prov_dr_a");
    assert.equal(drB.providerId, "prov_dr_b");
  });
});
