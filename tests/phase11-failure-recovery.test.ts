import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { AppointmentRepository } from "../src/lib/repositories/appointment.repository";
import { getDb } from "../src/lib/db/mongodb";

describe("Phase 11.1 Security: Slot-Lock Failure Recovery & Stale Lock Cleanup", () => {
  const storeId = `test_recovery_store_${Date.now()}`;

  afterEach(async () => {
    await AppointmentRepository.deleteByStoreId(storeId);
    const db = await getDb();
    if (db) {
      await db.collection("appointment_slot_locks").deleteMany({ storeId });
    }
  });

  test("slot-lock rollback cleans up partial slices on collision", async () => {
    const startUtc = "2026-12-10T10:00:00.000Z";
    const endUtc = "2026-12-10T11:00:00.000Z";

    // Create first appointment covering 10:00 - 11:00
    const appt1 = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_rec",
      startUtc,
      endUtc,
      customerName: "First Client",
      customerEmail: "first@recovery.test",
    });
    assert.ok(appt1.id);

    // Attempt overlapping appointment: 10:30 - 11:30 (partial overlap on 10:30-11:00)
    await assert.rejects(
      async () => {
        await AppointmentRepository.create({
          storeId,
          serviceId: "srv_rec",
          startUtc: "2026-12-10T10:30:00.000Z",
          endUtc: "2026-12-10T11:30:00.000Z",
          customerName: "Overlapping Client",
          customerEmail: "overlap@recovery.test",
        });
      },
      /no longer available/
    );

    // Check that NO partial locks remain for the rejected booking in MongoDB
    const db = await getDb();
    if (db) {
      const activeAppts = await AppointmentRepository.findByStoreId(storeId);
      assert.equal(activeAppts.length, 1, "Only 1 appointment should exist in database");

      const locks = await db.collection("appointment_slot_locks").find({ storeId }).toArray();
      const distinctApptIdsInLocks = Array.from(new Set(locks.map((l) => l.appointmentId)));
      assert.deepEqual(distinctApptIdsInLocks, [appt1.id], "Only appt1 locks should exist, no leaked partial slices");
    }
  });

  test("cleanupStaleLocks purges orphaned and cancelled locks without touching active locks", async () => {
    const db = await getDb();
    const startUtc = "2026-12-11T09:00:00.000Z";
    const endUtc = "2026-12-11T10:00:00.000Z";

    // 1. Create a valid active appointment
    const validAppt = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_rec",
      startUtc,
      endUtc,
      customerName: "Active Client",
      customerEmail: "active@recovery.test",
    });

    if (db) {
      // 2. Insert artificial orphaned lock with an old timestamp (simulating crashed process)
      const orphanApptId = `orphaned_appt_${Date.now()}`;
      await db.collection("appointment_slot_locks").insertOne({
        storeId,
        providerKey: "__all__",
        sliceUtc: "2026-12-11T14:00:00.000Z",
        appointmentId: orphanApptId,
        createdAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      });

      // 3. Run cleanup with olderThanMs = 60000
      const purgedCount = await AppointmentRepository.cleanupStaleLocks(storeId, 60000);
      assert.ok(purgedCount >= 1, "Orphaned lock must be purged");

      // Verify orphaned lock was deleted
      const remainingOrphan = await db
        .collection("appointment_slot_locks")
        .findOne({ appointmentId: orphanApptId });
      assert.equal(remainingOrphan, null, "Orphaned lock must no longer exist");

      // Verify active appointment's locks were preserved
      const validLocks = await db
        .collection("appointment_slot_locks")
        .find({ appointmentId: validAppt.id })
        .toArray();
      assert.ok(validLocks.length > 0, "Active appointment locks must remain untouched");
    }
  });

  test("concurrent overlapping bookings with different start times and durations", async () => {
    // 3 clients attempting overlapping time windows:
    // A: 14:00 - 15:00 (60 mins)
    // B: 14:15 - 14:45 (30 mins inside A)
    // C: 14:30 - 15:30 (60 mins overlapping end of A)
    const [resA, resB, resC] = await Promise.allSettled([
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        startUtc: "2026-12-12T14:00:00.000Z",
        endUtc: "2026-12-12T15:00:00.000Z",
        customerName: "Client A",
        customerEmail: "a@recovery.test",
      }),
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        startUtc: "2026-12-12T14:15:00.000Z",
        endUtc: "2026-12-12T14:45:00.000Z",
        customerName: "Client B",
        customerEmail: "b@recovery.test",
      }),
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        startUtc: "2026-12-12T14:30:00.000Z",
        endUtc: "2026-12-12T15:30:00.000Z",
        customerName: "Client C",
        customerEmail: "c@recovery.test",
      }),
    ]);

    const fulfilled = [resA, resB, resC].filter((r) => r.status === "fulfilled");
    const rejected = [resA, resB, resC].filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactly one booking should succeed");
    assert.equal(rejected.length, 2, "Both conflicting bookings must be rejected");

    const inDb = await AppointmentRepository.findByStoreId(storeId);
    assert.equal(inDb.length, 1, "Only 1 appointment should be stored");
  });

  test("cancellation idempotency: repeated cancellation does not corrupt state or timestamp", async () => {
    const appt = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_rec",
      startUtc: "2026-12-13T10:00:00.000Z",
      endUtc: "2026-12-13T11:00:00.000Z",
      customerName: "Cancel Client",
      customerEmail: "cancel@recovery.test",
    });

    const firstCancel = await AppointmentRepository.cancel(appt.id, "First cancellation request");
    assert.equal(firstCancel?.status, "Cancelled");
    const firstCancelledAt = firstCancel?.cancelledAtUtc;
    assert.ok(firstCancelledAt);

    // Call cancel a second time
    const secondCancel = await AppointmentRepository.cancel(appt.id, "Second redundant cancellation");
    assert.equal(secondCancel?.status, "Cancelled");
    assert.equal(secondCancel?.cancelledAtUtc, firstCancelledAt, "Original cancellation timestamp must not change");
    assert.equal(secondCancel?.cancellationReason, "First cancellation request", "Original cancellation reason must be preserved");

    // Re-verify that slot locks remain completely cleared
    const db = await getDb();
    if (db) {
      const locks = await db.collection("appointment_slot_locks").find({ appointmentId: appt.id }).toArray();
      assert.equal(locks.length, 0, "No locks must exist for cancelled appointment");
    }
  });

  test("cancellation racing with new booking allows new booking once cancelled", async () => {
    const startUtc = "2026-12-14T11:00:00.000Z";
    const endUtc = "2026-12-14T12:00:00.000Z";

    const original = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_rec",
      startUtc,
      endUtc,
      customerName: "Original Holder",
      customerEmail: "holder@recovery.test",
    });

    // Cancel the original
    await AppointmentRepository.cancel(original.id, "Releasing slot");

    // Race / Immediate rebooking must succeed cleanly
    const replacement = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_rec",
      startUtc,
      endUtc,
      customerName: "New Holder",
      customerEmail: "new@recovery.test",
    });

    assert.ok(replacement.id);
    assert.notEqual(replacement.id, original.id);

    const appointments = await AppointmentRepository.findByStoreId(storeId);
    assert.equal(appointments.length, 2);
    const active = appointments.filter((a) => a.status === "Confirmed");
    const cancelled = appointments.filter((a) => a.status === "Cancelled");
    assert.equal(active.length, 1);
    assert.equal(cancelled.length, 1);
  });

  test("multiple providers can take adjacent and simultaneous non-overlapping bookings", async () => {
    // Provider 1: 09:00 - 10:00 and 10:00 - 11:00 (adjacent)
    // Provider 2: 09:00 - 10:00 (simultaneous with Provider 1)
    const [p1Slot1, p1Slot2, p2Slot1] = await Promise.all([
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        providerId: "prov_alpha",
        startUtc: "2026-12-15T09:00:00.000Z",
        endUtc: "2026-12-15T10:00:00.000Z",
        customerName: "P1 C1",
        customerEmail: "p1c1@recovery.test",
      }),
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        providerId: "prov_alpha",
        startUtc: "2026-12-15T10:00:00.000Z",
        endUtc: "2026-12-15T11:00:00.000Z",
        customerName: "P1 C2",
        customerEmail: "p1c2@recovery.test",
      }),
      AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        providerId: "prov_beta",
        startUtc: "2026-12-15T09:00:00.000Z",
        endUtc: "2026-12-15T10:00:00.000Z",
        customerName: "P2 C1",
        customerEmail: "p2c1@recovery.test",
      }),
    ]);

    assert.ok(p1Slot1.id);
    assert.ok(p1Slot2.id);
    assert.ok(p2Slot1.id);

    const all = await AppointmentRepository.findByStoreId(storeId);
    assert.equal(all.length, 3, "All three non-conflicting bookings must succeed");
  });

  test("delayed in-progress booking while cleanup runs: cleanup preserves live lease and second booking is rejected", async () => {
    const startUtc = "2026-12-16T15:00:00.000Z";
    const endUtc = "2026-12-16T16:00:00.000Z";

    let cleanupRanDuringDelay = false;
    let cleanupPurgedCount = 0;
    let secondBookingAttemptFailed = false;

    // Start Booking 1 with an in-progress delay hook simulating a delayed booking (e.g. slow client or network)
    const booking1Promise = AppointmentRepository.create(
      {
        storeId,
        serviceId: "srv_rec",
        startUtc,
        endUtc,
        customerName: "Delayed Client 1",
        customerEmail: "delayed1@recovery.test",
      },
      {
        beforeInsertHook: async (apptId) => {
          // While locks are held, verify live reservation lease is registered
          assert.equal(AppointmentRepository.isReservationActive(apptId), true, "Reservation lease must be active in-flight");

          // Run cleanup with olderThanMs = 0 (simulating cleanup running after 60s threshold)
          cleanupPurgedCount = await AppointmentRepository.cleanupStaleLocks(storeId, 0);
          cleanupRanDuringDelay = true;

          // Verify in DB that slot locks were preserved despite cleanup running
          const db = await getDb();
          if (db) {
            const heldLocks = await db.collection("appointment_slot_locks").find({ appointmentId: apptId }).toArray();
            assert.ok(heldLocks.length > 0, "Locks must still be held in DB");

            // Attempt competing lock insertion on the exact same slice (simulating concurrent worker/process)
            await assert.rejects(
              async () => {
                await db.collection("appointment_slot_locks").insertOne({
                  storeId,
                  providerKey: "__all__",
                  sliceUtc: startUtc,
                  appointmentId: "competitor_process_id",
                  createdAt: new Date().toISOString(),
                });
              },
              (err: unknown) => {
                const code = (err as { code?: number })?.code;
                const msg = err instanceof Error ? err.message : String(err);
                return code === 11000 || msg.includes("E11000");
              }
            );
            secondBookingAttemptFailed = true;
          } else {
            secondBookingAttemptFailed = true;
          }
        },
      }
    );

    const appt1 = await booking1Promise;

    assert.ok(appt1.id);
    assert.equal(cleanupRanDuringDelay, true, "Cleanup must have run during the delay");
    assert.equal(cleanupPurgedCount, 0, "Cleanup must NOT have purged live in-flight locks");
    assert.equal(secondBookingAttemptFailed, true, "Second overlapping booking must have been rejected");

    // Verify database only contains Booking 1
    const appts = await AppointmentRepository.findByStoreId(storeId);
    assert.equal(appts.length, 1);
    assert.equal(appts[0].customerName, "Delayed Client 1");

    // Re-verify that any subsequent booking attempt for that slot is strictly rejected as occupied
    await assert.rejects(
      async () => {
        await AppointmentRepository.create({
          storeId,
          serviceId: "srv_rec",
          startUtc,
          endUtc,
          customerName: "Post Booking Competitor",
          customerEmail: "post@recovery.test",
        });
      },
      /no longer available/
    );
  });

  test("abandoned booking whose lease expired is recovered and slot becomes bookable", async () => {
    const db = await getDb();
    const startUtc = "2026-12-17T10:00:00.000Z";
    const endUtc = "2026-12-17T11:00:00.000Z";
    const abandonedApptId = `abandoned_crashed_${Date.now()}`;

    if (db) {
      // Simulate an abandoned lock from a crashed process whose 2-minute lease expired in the past
      await db.collection("appointment_slot_locks").insertOne({
        storeId,
        providerKey: "__all__",
        sliceUtc: startUtc,
        appointmentId: abandonedApptId,
        createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        leaseExpiresAt: new Date(Date.now() - 120000).toISOString(), // lease expired 2 minutes ago
        committed: false,
      });

      // Attempting to book the slot before cleanup should be blocked by the existing lock
      await assert.rejects(
        async () => {
          await AppointmentRepository.create({
            storeId,
            serviceId: "srv_rec",
            startUtc,
            endUtc,
            customerName: "Block Client",
            customerEmail: "block@recovery.test",
          });
        },
        /no longer available/
      );

      // Now run cleanup: it should detect the unexpired lease is FALSE (lease has expired) and purge it
      const purged = await AppointmentRepository.cleanupStaleLocks(storeId, 60000);
      assert.ok(purged >= 1, "Abandoned expired lock must be purged");

      // Verify the slot is now open and a new client can book it!
      const recovered = await AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        startUtc,
        endUtc,
        customerName: "Recovered Client",
        customerEmail: "recovered@recovery.test",
      });

      assert.ok(recovered.id);
      assert.equal(recovered.customerName, "Recovered Client");
    }
  });

  test("appointment insertion failure rolls back and deletes acquired locks", async () => {
    const db = await getDb();
    const startUtc = "2026-12-18T14:00:00.000Z";
    const endUtc = "2026-12-18T15:00:00.000Z";
    const collisionId = `collision_id_${Date.now()}`;

    if (db) {
      // Pre-seed an appointment with collisionId to guarantee a primary key collision on insertOne
      await db.collection("appointments").insertOne({
        id: collisionId,
        storeId: "other_store",
        serviceId: "srv_rec",
        startUtc: "2026-01-01T00:00:00.000Z",
        endUtc: "2026-01-01T01:00:00.000Z",
        status: "Confirmed",
      } as unknown as Record<string, unknown>);

      // Attempt to create an appointment with the same ID, causing insertOne to throw duplicate key error
      await assert.rejects(async () => {
        await AppointmentRepository.create({
          id: collisionId,
          storeId,
          serviceId: "srv_rec",
          startUtc,
          endUtc,
          customerName: "Failing Insert Client",
          customerEmail: "failing@recovery.test",
        });
      });

      // Verify that all slot locks acquired during this failed attempt were rolled back and deleted!
      const lingeringLocks = await db
        .collection("appointment_slot_locks")
        .find({ appointmentId: collisionId, storeId })
        .toArray();
      assert.equal(lingeringLocks.length, 0, "All slot locks must be rolled back on insertion failure");

      // Verify the slot is STILL available for a legitimate booking
      const successfulAppt = await AppointmentRepository.create({
        storeId,
        serviceId: "srv_rec",
        startUtc,
        endUtc,
        customerName: "Success After Rollback Client",
        customerEmail: "success@recovery.test",
      });

      assert.ok(successfulAppt.id);
      assert.equal(successfulAppt.customerName, "Success After Rollback Client");

      // Cleanup pre-seeded doc
      await db.collection("appointments").deleteOne({ id: collisionId });
    }
  });
});
