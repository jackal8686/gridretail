import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { generateCancellationToken } from "@/lib/scheduling/availability";

// In-memory fallback dataset for seamless dev/testing without database
let memoryAppointments: Appointment[] = [
  {
    id: "apt_mock_01",
    storeId: "str_07",
    serviceId: "srv_mock_01",
    serviceName: "Corporate Mergers & Acquisitions Advisory",
    providerId: "prv_mock_01",
    providerName: "Adv. Eleanor Vance, Senior Partner",
    customerName: "David Sterling",
    customerEmail: "david.sterling@sterlingholdings.internal",
    customerPhone: "+91 98765 43210",
    customerNotes: "Initial strategic discovery on cross-border asset acquisition.",
    startUtc: new Date(Date.now() + 86400000 * 2).toISOString(),
    endUtc: new Date(Date.now() + 86400000 * 2 + 3600000).toISOString(),
    durationMinutes: 60,
    price: 15000,
    currency: "INR",
    meetingType: "video_call",
    status: "Confirmed",
    confirmationNumber: "APT-SUM-829104",
    cancellationTokenHash: "mock_hash_01",
    cancellationDeadlineUtc: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
let memorySlotLocks: {
  storeId: string;
  providerKey: string;
  sliceUtc: string;
  appointmentId: string;
  createdAt?: string;
  leaseExpiresAt?: string;
  committed?: boolean;
}[] = [];

// Active in-flight reservation lease registry (protects live bookings from cleanup races)
interface ActiveReservationLease {
  appointmentId: string;
  storeId: string;
  providerKey: string;
  leaseExpiresAt: number;
}
const activeReservationLeases = new Map<string, ActiveReservationLease>();
const DEFAULT_RESERVATION_LEASE_MS = 120_000; // 2 minutes active lease for in-flight bookings

// Concurrency Mutex map per (storeId:providerKey)
const mutexMap = new Map<string, Promise<void>>();

async function runWithLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const current = mutexMap.get(key) || Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  mutexMap.set(key, current.then(() => next));
  await current;
  try {
    return await task();
  } finally {
    release!();
    if (mutexMap.get(key) === next) {
      mutexMap.delete(key);
    }
  }
}

function computeMinuteSlices(startUtc: string, endUtc: string): string[] {
  const slices: string[] = [];
  const start = new Date(startUtc).getTime();
  const end = new Date(endUtc).getTime();
  const ONE_MINUTE_MS = 60 * 1000;

  for (let t = start; t < end; t += ONE_MINUTE_MS) {
    slices.push(new Date(t).toISOString());
  }
  return slices;
}

export const AppointmentRepository = {
  async findByStoreId(
    storeId: string,
    filter?: {
      status?: AppointmentStatus;
      providerId?: string;
      serviceId?: string;
      fromUtc?: string;
      toUtc?: string;
    }
  ): Promise<Appointment[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = { storeId };
        if (filter?.status) {
          query.status = filter.status;
        }
        if (filter?.providerId) {
          query.providerId = filter.providerId;
        }
        if (filter?.serviceId) {
          query.serviceId = filter.serviceId;
        }
        if (filter?.fromUtc || filter?.toUtc) {
          query.startUtc = {};
          if (filter.fromUtc) {
            (query.startUtc as Record<string, string>).$gte = filter.fromUtc;
          }
          if (filter.toUtc) {
            (query.startUtc as Record<string, string>).$lte = filter.toUtc;
          }
        }

        const appointments = await db
          .collection<Appointment>("appointments")
          .find(query)
          .sort({ startUtc: 1 })
          .toArray();

        return appointments.map((a) => {
          const raw = { ...a } as Record<string, unknown>;
          const id = a.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as Appointment;
        });
      } catch (err) {
        console.warn("MongoDB query error in AppointmentRepository.findByStoreId, falling back to memory:", err);
      }
    }

    return memoryAppointments
      .filter((a) => {
        if (a.storeId !== storeId) return false;
        if (filter?.status && a.status !== filter.status) return false;
        if (filter?.providerId && a.providerId !== filter.providerId) return false;
        if (filter?.serviceId && a.serviceId !== filter.serviceId) return false;
        if (filter?.fromUtc && a.startUtc < filter.fromUtc) return false;
        if (filter?.toUtc && a.startUtc > filter.toUtc) return false;
        return true;
      })
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  },

  async findById(id: string): Promise<Appointment | null> {
    const db = await getDb();
    if (db) {
      try {
        const appointment = await db
          .collection<Appointment>("appointments")
          .findOne({ id });
        if (appointment) {
          const raw = { ...appointment } as Record<string, unknown>;
          const cleanId = appointment.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id: cleanId } as unknown as Appointment;
        }
      } catch (err) {
        console.warn("MongoDB query error in AppointmentRepository.findById, falling back to memory:", err);
      }
    }

    return memoryAppointments.find((a) => a.id === id) || null;
  },

  async findByCancellationTokenHash(hash: string): Promise<Appointment | null> {
    const db = await getDb();
    if (db) {
      try {
        const appointment = await db
          .collection<Appointment>("appointments")
          .findOne({ cancellationTokenHash: hash });
        if (appointment) {
          const raw = { ...appointment } as Record<string, unknown>;
          const cleanId = appointment.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id: cleanId } as unknown as Appointment;
        }
      } catch (err) {
        console.warn("MongoDB query error in AppointmentRepository.findByCancellationTokenHash:", err);
      }
    }

    return memoryAppointments.find((a) => a.cancellationTokenHash === hash) || null;
  },

  async findByConfirmationNumber(storeId: string, confirmationNumber: string): Promise<Appointment | null> {
    const db = await getDb();
    if (db) {
      try {
        const appointment = await db
          .collection<Appointment>("appointments")
          .findOne({ storeId, confirmationNumber });
        if (appointment) {
          const raw = { ...appointment } as Record<string, unknown>;
          const cleanId = appointment.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id: cleanId } as unknown as Appointment;
        }
      } catch (err) {
        console.warn("MongoDB query error in AppointmentRepository.findByConfirmationNumber:", err);
      }
    }

    return memoryAppointments.find((a) => a.storeId === storeId && a.confirmationNumber === confirmationNumber) || null;
  },

  async findByCustomerEmail(storeId: string, customerEmail: string): Promise<Appointment[]> {
    const normalizedEmail = customerEmail.trim().toLowerCase();
    const db = await getDb();
    if (db) {
      try {
        const appointments = await db
          .collection<Appointment>("appointments")
          .find({
            storeId,
            customerEmail: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
          })
          .sort({ startUtc: -1 })
          .toArray();

        return appointments.map((a) => {
          const raw = { ...a } as Record<string, unknown>;
          const id = a.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as Appointment;
        });
      } catch (err) {
        console.warn("MongoDB query error in AppointmentRepository.findByCustomerEmail, falling back to memory:", err);
      }
    }

    return memoryAppointments
      .filter((a) => a.storeId === storeId && a.customerEmail.toLowerCase().trim() === normalizedEmail)
      .sort((a, b) => b.startUtc.localeCompare(a.startUtc));
  },

  /**
   * Double-booking and overlap validation.
   * Two intervals [startA, endA) and [startB, endB) overlap if startA < endB AND endA > startB.
   * Only active appointments (Confirmed or Pending) are considered conflicts.
   */
  async checkOverlap(
    storeId: string,
    providerIdOrStartUtc: string | undefined,
    startUtcOrEndUtc: string,
    endUtcOrExcludeId?: string,
    maybeExcludeAppointmentId?: string
  ): Promise<boolean> {
    let providerId: string | undefined;
    let startUtc: string;
    let endUtc: string;
    let excludeAppointmentId: string | undefined;

    if (endUtcOrExcludeId === undefined) {
      providerId = undefined;
      startUtc = providerIdOrStartUtc as string;
      endUtc = startUtcOrEndUtc;
      excludeAppointmentId = undefined;
    } else if (
      maybeExcludeAppointmentId === undefined &&
      (endUtcOrExcludeId.startsWith("apt_") || endUtcOrExcludeId.startsWith("app_"))
    ) {
      providerId = undefined;
      startUtc = providerIdOrStartUtc as string;
      endUtc = startUtcOrEndUtc;
      excludeAppointmentId = endUtcOrExcludeId;
    } else {
      providerId = providerIdOrStartUtc;
      startUtc = startUtcOrEndUtc;
      endUtc = endUtcOrExcludeId;
      excludeAppointmentId = maybeExcludeAppointmentId;
    }

    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {
          storeId,
          status: { $in: ["Confirmed", "Pending"] },
          startUtc: { $lt: endUtc },
          endUtc: { $gt: startUtc },
        };
        if (providerId) {
          query.providerId = providerId;
        }
        if (excludeAppointmentId) {
          query.id = { $ne: excludeAppointmentId };
        }

        const count = await db.collection<Appointment>("appointments").countDocuments(query);
        return count > 0;
      } catch (err) {
        console.warn("MongoDB query error in checkOverlap, falling back to memory:", err);
      }
    }

    const hasConflict = memoryAppointments.some((a) => {
      if (a.storeId !== storeId) return false;
      if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
      if (a.status !== "Confirmed" && a.status !== "Pending") return false;
      if (providerId && a.providerId && a.providerId !== providerId) return false;

      // Check overlap: a.startUtc < endUtc && a.endUtc > startUtc
      return a.startUtc < endUtc && a.endUtc > startUtc;
    });

    return hasConflict;
  },

  async create(
    appointmentData: Partial<Appointment> & { storeId: string; serviceId: string; startUtc: string; endUtc: string },
    options?: {
      beforeInsertHook?: (appointmentId: string) => Promise<void>;
    }
  ): Promise<Appointment> {
    const providerKey = appointmentData.providerId || "__all__";
    const lockKey = `${appointmentData.storeId}:${providerKey}`;

    return runWithLock(lockKey, async () => {
      const db = await getDb();
      if (!db && !isFallbackAllowed()) {
        throw new DatabaseUnavailableError("Cannot create appointment: database is unavailable in production.");
      }

      if (new Date(appointmentData.endUtc).getTime() <= new Date(appointmentData.startUtc).getTime()) {
        throw new Error("Appointment end time must be after start time.");
      }

      // Check for overlap against existing active bookings
      const isOverlapping = await this.checkOverlap(
        appointmentData.storeId,
        appointmentData.providerId,
        appointmentData.startUtc,
        appointmentData.endUtc
      );

      if (isOverlapping) {
        throw new Error("This appointment time slot is no longer available. Please select another time.");
      }

      const id = appointmentData.id || `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const confirmationNumber =
        appointmentData.confirmationNumber ||
        `GR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const defaultToken = generateCancellationToken();
      const cancellationTokenHash =
        appointmentData.cancellationTokenHash || defaultToken.tokenHash;
      const cancellationDeadlineUtc =
        appointmentData.cancellationDeadlineUtc ||
        new Date(new Date(appointmentData.startUtc).getTime() - 24 * 60 * 60 * 1000).toISOString();

      const fullAppointment: Appointment = {
        serviceName: "Consultation Service",
        durationMinutes: 45,
        price: 0,
        currency: "INR",
        customerName: "Client",
        customerEmail: "client@example.com",
        status: "Confirmed",
        meetingType: "video_call",
        ...appointmentData,
        id,
        confirmationNumber,
        cancellationTokenHash,
        cancellationDeadlineUtc,
        createdAt: appointmentData.createdAt || new Date().toISOString(),
        updatedAt: appointmentData.updatedAt || new Date().toISOString(),
      };

      const slices = computeMinuteSlices(fullAppointment.startUtc, fullAppointment.endUtc);
      const leaseExpiresAtEpoch = Date.now() + DEFAULT_RESERVATION_LEASE_MS;
      const leaseExpiresAtIso = new Date(leaseExpiresAtEpoch).toISOString();

      // Register live in-process reservation lease
      activeReservationLeases.set(id, {
        appointmentId: id,
        storeId: fullAppointment.storeId,
        providerKey,
        leaseExpiresAt: leaseExpiresAtEpoch,
      });

      try {
        if (db) {
          // Multi-process atomic reservation using unique compound index + lease expiration
          const lockDocs = slices.map((sliceUtc) => ({
            storeId: fullAppointment.storeId,
            providerKey,
            sliceUtc,
            appointmentId: id,
            createdAt: new Date().toISOString(),
            leaseExpiresAt: leaseExpiresAtIso,
            committed: false,
          }));

          try {
            if (lockDocs.length > 0) {
              await db.collection("appointment_slot_locks").insertMany(lockDocs, { ordered: true });
            }
          } catch (err: unknown) {
            // Always clean up any partial slices inserted for this specific appointmentId
            try {
              await db.collection("appointment_slot_locks").deleteMany({ appointmentId: id });
            } catch (cleanupErr) {
              console.warn("Failed to clean up partial slot locks:", cleanupErr);
            }

            const msg = err instanceof Error ? err.message : String(err);
            const code = (err as { code?: number })?.code;
            if (code === 11000 || msg.includes("E11000")) {
              throw new Error("This appointment time slot is no longer available. Please select another time.");
            }
            if (!isFallbackAllowed()) throw err;
          }

          // Optional hook for simulating delay or testing race conditions
          if (options?.beforeInsertHook) {
            await options.beforeInsertHook(id);
          }

          // Pre-commit validation: verify our slot locks are still owned and intact
          const heldLockCount = await db.collection("appointment_slot_locks").countDocuments({ appointmentId: id });
          if (heldLockCount !== slices.length) {
            throw new Error("Reservation lease expired or was lost during booking. Please select another time.");
          }

          try {
            await db.collection<Appointment>("appointments").insertOne({ ...fullAppointment });
            // Mark locks committed
            await db.collection("appointment_slot_locks").updateMany(
              { appointmentId: id },
              { $set: { committed: true } }
            );
            return fullAppointment;
          } catch (err) {
            try {
              await db.collection("appointment_slot_locks").deleteMany({ appointmentId: id });
            } catch (cleanupErr) {
              console.warn("Failed to clean up slot locks after appointment insertion failure:", cleanupErr);
            }
            if (!isFallbackAllowed()) throw err;
            console.warn("MongoDB insert error in AppointmentRepository.create:", err);
          }
        }

        // In-memory slot locking for offline/test environments
        for (const sliceUtc of slices) {
          const exists = memorySlotLocks.some(
            (l) => l.storeId === fullAppointment.storeId && l.providerKey === providerKey && l.sliceUtc === sliceUtc
          );
          if (exists) {
            throw new Error("This appointment time slot is no longer available. Please select another time.");
          }
        }

        for (const sliceUtc of slices) {
          memorySlotLocks.push({
            storeId: fullAppointment.storeId,
            providerKey,
            sliceUtc,
            appointmentId: id,
            createdAt: new Date().toISOString(),
            leaseExpiresAt: leaseExpiresAtIso,
            committed: false,
          });
        }

        // Optional hook for simulating delay in-memory
        if (options?.beforeInsertHook) {
          await options.beforeInsertHook(id);
        }

        const heldCount = memorySlotLocks.filter((l) => l.appointmentId === id).length;
        if (heldCount !== slices.length) {
          throw new Error("Reservation lease expired or was lost during booking. Please select another time.");
        }

        memorySlotLocks.forEach((l) => {
          if (l.appointmentId === id) l.committed = true;
        });

        memoryAppointments.push(fullAppointment);
        return fullAppointment;
      } finally {
        activeReservationLeases.delete(id);
      }
    });
  },

  async update(id: string, updates: Partial<Appointment>): Promise<Appointment | null> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update appointment: database is unavailable in production.");
    }

    const now = new Date().toISOString();
    const dataToUpdate = { ...updates, updatedAt: now };

    // Release slot locks if appointment is cancelled
    if (updates.status === "Cancelled") {
      if (db) {
        try {
          await db.collection("appointment_slot_locks").deleteMany({ appointmentId: id });
        } catch (err) {
          console.warn("MongoDB delete error in slot locks on cancel:", err);
        }
      }
      memorySlotLocks = memorySlotLocks.filter((l) => l.appointmentId !== id);
    }

    if (db) {
      try {
        await db
          .collection<Appointment>("appointments")
          .updateOne({ id }, { $set: dataToUpdate });
        return this.findById(id);
      } catch (err) {
        if (!isFallbackAllowed()) throw err;
        console.warn("MongoDB update error in AppointmentRepository.update:", err);
      }
    }

    const index = memoryAppointments.findIndex((a) => a.id === id);
    if (index !== -1) {
      memoryAppointments[index] = { ...memoryAppointments[index], ...dataToUpdate };
      return memoryAppointments[index];
    }
    return null;
  },

  async reschedule(
    id: string,
    newStartUtc: string,
    newEndUtc: string,
    providerId?: string
  ): Promise<Appointment> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Appointment not found");
    }
    if (existing.status === "Cancelled" || existing.status === "Completed") {
      throw new Error(`Cannot reschedule an appointment with status "${existing.status}".`);
    }

    if (new Date(newEndUtc).getTime() <= new Date(newStartUtc).getTime()) {
      throw new Error("Appointment end time must be after start time.");
    }

    const targetProviderId = providerId !== undefined ? providerId : existing.providerId;
    const lockKey = `${existing.storeId}:${targetProviderId || "__all__"}`;

    return runWithLock(lockKey, async () => {
      const isOverlapping = await this.checkOverlap(
        existing.storeId,
        targetProviderId,
        newStartUtc,
        newEndUtc,
        existing.id
      );

      if (isOverlapping) {
        throw new Error("The requested time slot is no longer available. Please select another time.");
      }

      const updates: Partial<Appointment> = {
        startUtc: newStartUtc,
        endUtc: newEndUtc,
        providerId: targetProviderId,
        updatedAt: new Date().toISOString(),
      };

      const updated = await this.update(id, updates);
      if (!updated) {
        throw new Error("Failed to reschedule appointment.");
      }
      return updated;
    });
  },

  async cancel(id: string, reason?: string): Promise<Appointment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    if (existing.status === "Cancelled") return existing;

    const now = new Date().toISOString();
    return this.update(id, {
      status: "Cancelled",
      cancelledAtUtc: now,
      cancellationReason: reason || "Cancelled by user",
    });
  },

  async cancelByTokenHash(
    tokenHash: string,
    reason?: string,
    cancelledBy: "Customer" | "Staff" = "Customer"
  ): Promise<Appointment | null> {
    const existing = await this.findByCancellationTokenHash(tokenHash);
    if (!existing) return null;
    if (existing.status === "Cancelled") return existing;

    const now = new Date().toISOString();
    return this.update(existing.id, {
      status: "Cancelled",
      cancelledAtUtc: now,
      cancelledBy,
      cancellationReason: reason || `Cancelled by ${cancelledBy.toLowerCase()}`,
    });
  },

  async deleteByStoreId(storeId: string): Promise<number> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection("appointment_slot_locks").deleteMany({ storeId });
        const result = await db
          .collection<Appointment>("appointments")
          .deleteMany({ storeId });
        return result.deletedCount;
      } catch (err) {
        console.warn("MongoDB deleteMany error in AppointmentRepository.deleteByStoreId:", err);
      }
    }

    memorySlotLocks = memorySlotLocks.filter((l) => l.storeId !== storeId);
    const initialLen = memoryAppointments.length;
    memoryAppointments = memoryAppointments.filter((a) => a.storeId !== storeId);
    return initialLen - memoryAppointments.length;
  },

  /**
   * Identifies and purges orphaned or stale slot locks where the corresponding appointment
   * either does not exist (and has an expired reservation lease) or has been cancelled.
   * Active in-flight bookings within their lease window are NEVER purged.
   * Guarantees safe recovery from aborted writes or unhandled node crashes.
   */
  async cleanupStaleLocks(storeId?: string, olderThanMs = 60000): Promise<number> {
    const db = await getDb();
    let purged = 0;
    const cutoffIso = new Date(Date.now() - olderThanMs).toISOString();
    const nowIso = new Date().toISOString();

    if (db) {
      try {
        const query: Record<string, unknown> = {
          createdAt: { $lt: cutoffIso },
        };
        if (storeId) query.storeId = storeId;

        const candidateLocks = await db
          .collection<{ appointmentId: string; leaseExpiresAt?: string; committed?: boolean }>("appointment_slot_locks")
          .find(query)
          .toArray();

        const uniqueApptIds = Array.from(new Set(candidateLocks.map((l) => l.appointmentId)));

        for (const apptId of uniqueApptIds) {
          // Guard 1: In-process live reservation lease active
          const activeLease = activeReservationLeases.get(apptId);
          if (activeLease && Date.now() < activeLease.leaseExpiresAt) {
            continue; // Live in-progress reservation — NEVER purge
          }

          const appt = await db.collection<Appointment>("appointments").findOne({ id: apptId });
          if (!appt) {
            // Guard 2: Database lease check. If lock documents have unexpired lease and not committed, skip!
            const unexpired = await db.collection("appointment_slot_locks").findOne({
              appointmentId: apptId,
              leaseExpiresAt: { $gt: nowIso },
              committed: { $ne: true },
            });
            if (unexpired) {
              continue; // Live unexpired reservation lease — NEVER purge
            }

            // Both in-process and database leases expired: safe to purge abandoned reservation
            const del = await db.collection("appointment_slot_locks").deleteMany({ appointmentId: apptId });
            purged += del.deletedCount;
          } else if (appt.status === "Cancelled") {
            const del = await db.collection("appointment_slot_locks").deleteMany({ appointmentId: apptId });
            purged += del.deletedCount;
          }
        }
        return purged;
      } catch (err) {
        console.warn("Error running cleanupStaleLocks in MongoDB:", err);
      }
    }

    // In-memory stale lock cleanup
    const initialLen = memorySlotLocks.length;
    memorySlotLocks = memorySlotLocks.filter((lock) => {
      if (storeId && lock.storeId !== storeId) return true;
      const activeLease = activeReservationLeases.get(lock.appointmentId);
      if (activeLease && Date.now() < activeLease.leaseExpiresAt) {
        return true; // Live reservation in-progress — NEVER purge
      }
      if (lock.leaseExpiresAt && new Date(lock.leaseExpiresAt).getTime() > Date.now() && !lock.committed) {
        return true; // Live unexpired lease
      }
      const appt = memoryAppointments.find((a) => a.id === lock.appointmentId);
      if (!appt || appt.status === "Cancelled") {
        return false;
      }
      return true;
    });
    return initialLen - memorySlotLocks.length;
  },

  isReservationActive(appointmentId: string): boolean {
    const lease = activeReservationLeases.get(appointmentId);
    return Boolean(lease && Date.now() < lease.leaseExpiresAt);
  },

  getActiveLeasesCount(): number {
    return activeReservationLeases.size;
  },

  _clearMemory(): void {
    memoryAppointments = [];
    memorySlotLocks = [];
    activeReservationLeases.clear();
  },
};
