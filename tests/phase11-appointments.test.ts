import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import {
  calculateAvailableSlots,
  generateCancellationToken,
  hashCancellationToken,
  DEFAULT_APPOINTMENT_CONFIG,
} from "@/lib/scheduling/availability";
import { validateStoreInput } from "@/lib/validation/store";
import {
  AppointmentConfig,
  AppointmentService,
  DayOperatingHours,
  Appointment,
} from "@/types/appointment";
import { Store } from "@/types/store";

describe("Phase 11 — Appointment Scheduling Core Engine & Isolation", () => {
  const storeA = "store_legal_test_001";
  const storeB = "store_clinic_test_002";

  // 1. Service Repository & Tenant Isolation
  it("creates, retrieves, updates, and deletes services with strict store isolation", async () => {
    const s1 = await ServiceRepository.create({
      storeId: storeA,
      name: "Initial Legal Consultation",
      description: "60-minute case review",
      durationMinutes: 60,
      price: 3500,
      currency: "INR",
      category: "Legal Practice & Advisory",
      meetingType: "video_call",
      isActive: true,
      order: 0,
    });

    const s2 = await ServiceRepository.create({
      storeId: storeB,
      name: "General Health Checkup",
      description: "30-minute primary health review",
      durationMinutes: 30,
      price: 800,
      currency: "INR",
      category: "Healthcare & Medical Clinic",
      meetingType: "in_person",
      isActive: true,
      order: 0,
    });

    assert.ok(s1.id, "Service A should have generated an ID");
    assert.ok(s2.id, "Service B should have generated an ID");

    // Tenant isolation: Store A only sees its own services
    const storeAServices = await ServiceRepository.findByStoreId(storeA);
    assert.equal(storeAServices.length, 1);
    assert.equal(storeAServices[0].name, "Initial Legal Consultation");

    const storeBServices = await ServiceRepository.findByStoreId(storeB);
    assert.equal(storeBServices.length, 1);
    assert.equal(storeBServices[0].name, "General Health Checkup");

    // Update service pricing
    const updated = await ServiceRepository.update(s1.id, { price: 4000 });
    assert.ok(updated);
    assert.equal(updated.price, 4000);

    // Delete service
    const deleted = await ServiceRepository.delete(s1.id);
    assert.equal(deleted, true);
    const storeAServicesAfter = await ServiceRepository.findByStoreId(storeA);
    assert.equal(storeAServicesAfter.length, 0);

    // Store B's service is untouched
    const storeBServicesAfter = await ServiceRepository.findByStoreId(storeB);
    assert.equal(storeBServicesAfter.length, 1);
  });

  // 2. Provider Repository & Tenant Isolation
  it("creates, retrieves, and updates providers with practitioner-specific isolation", async () => {
    const p1 = await ProviderRepository.create({
      storeId: storeA,
      name: "Adv. Rajesh Iyer",
      role: "Senior Managing Counsel",
      bio: "20 years experience in corporate and civil litigation.",
      email: "rajesh@example.in",
      isActive: true,
    });

    assert.ok(p1.id);
    const storeAProviders = await ProviderRepository.findByStoreId(storeA);
    assert.equal(storeAProviders.length, 1);
    assert.equal(storeAProviders[0].name, "Adv. Rajesh Iyer");

    // Update provider bio and add time-off
    const timeOff = [
      {
        startUtc: "2026-11-01T00:00:00.000Z",
        endUtc: "2026-11-03T23:59:59.000Z",
        reason: "Annual Bar Association Conference",
      },
    ];
    const updated = await ProviderRepository.update(p1.id, {
      timeOff,
      role: "Managing Partner",
    });

    assert.ok(updated);
    assert.equal(updated.role, "Managing Partner");
    assert.equal(updated.timeOff?.length, 1);
  });

  // 3. Availability Engine Slot Calculations
  it("computes valid booking slots respecting operating hours, lunch breaks, and buffers", () => {
    const weeklyHours: DayOperatingHours[] = [
      { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" }, // Sunday Closed
      {
        dayOfWeek: 1, // Monday
        isOpen: true,
        openTime: "09:00",
        closeTime: "13:00", // 4 hours window = 240 mins
        breakStart: "11:00",
        breakEnd: "12:00", // 60 min lunch break
      },
      { dayOfWeek: 2, isOpen: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 3, isOpen: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 4, isOpen: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 5, isOpen: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 6, isOpen: false, openTime: "09:00", closeTime: "18:00" },
    ];

    const config: AppointmentConfig = {
      timezone: "Asia/Kolkata",
      slotIntervalMinutes: 15,
      bufferMinutes: 15, // 15 min buffer after each appointment
      minNoticeHours: 1,
      maxAdvanceDays: 60,
      weeklyHours,
      cancellationPolicy: {
        allowed: true,
        noticeHours: 24,
      },
      requireApproval: false,
    };

    const mockStore: Store = {
      id: storeA,
      name: "Legal Chambers",
      slug: "legal-chambers",
      clientId: "client_1",
      clientName: "Legal Client",
      industry: "Health & Wellness",
      templateId: "editorial",
      templateName: "Editorial Minimal",
      status: "Published",
      productCount: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Legal practice",
      appointmentConfig: config,
    };

    const service: AppointmentService = {
      id: "srv_test_45",
      storeId: storeA,
      name: "Consultation",
      description: "45 min consultation",
      durationMinutes: 45, // 45 min consultation + 15 min buffer = 60 min block
      price: 2000,
      isFreeConsultation: false,
      currency: "INR",
      meetingType: "video_call",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // A future Monday date: 2026-11-09 is a Monday
    const slots = calculateAvailableSlots({
      store: mockStore,
      service,
      dateStr: "2026-11-09",
      existingAppointments: [],
      nowUtc: new Date("2026-11-01T00:00:00Z"),
    });

    // Between 09:00 and 11:00:
    // Slot 1: 09:00 - 09:45 (buffer to 10:00)
    // Slot 2: 10:00 - 10:45 (buffer to 11:00)
    // Lunch break: 11:00 - 12:00
    // Slot 3: 12:00 - 12:45 (buffer to 13:00)
    // Total should be exactly 3 slots!
    assert.equal(slots.length, 3, "Expected 3 slots for Monday schedule with lunch break and buffer");
    assert.equal(slots[0].formattedTime, "9:00 AM");
    assert.equal(slots[1].formattedTime, "10:00 AM");
    assert.equal(slots[2].formattedTime, "12:00 PM");

    // Sunday (closed day) should yield 0 slots
    const sundaySlots = calculateAvailableSlots({
      store: mockStore,
      service,
      dateStr: "2026-11-08", // Sunday
      existingAppointments: [],
      nowUtc: new Date("2026-11-01T00:00:00Z"),
    });
    assert.equal(sundaySlots.length, 0, "Closed day must yield 0 slots");
  });

  // 4. Existing Booking Collisions & Provider Time-Off Filtering
  it("filters out slots that overlap with active bookings or provider time-off", () => {
    const weeklyHours: DayOperatingHours[] = [
      { dayOfWeek: 1, isOpen: true, openTime: "10:00", closeTime: "14:00" },
    ];
    // Fill remaining days as closed
    for (let d = 0; d < 7; d++) {
      if (d !== 1) weeklyHours.push({ dayOfWeek: d as 0 | 1 | 2 | 3 | 4 | 5 | 6, isOpen: false, openTime: "09:00", closeTime: "17:00" });
    }

    const config: AppointmentConfig = {
      ...DEFAULT_APPOINTMENT_CONFIG,
      timezone: "UTC",
      slotIntervalMinutes: 30,
      bufferMinutes: 0,
      minNoticeHours: 0,
      maxAdvanceDays: 30,
      weeklyHours,
    };

    const mockStore: Store = {
      id: storeA,
      name: "Advisory Store",
      slug: "advisory-store",
      clientId: "client_1",
      clientName: "Advisory Client",
      industry: "Health & Wellness",
      templateId: "editorial",
      templateName: "Editorial Minimal",
      status: "Published",
      productCount: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Advisory store",
      appointmentConfig: config,
    };

    const service: AppointmentService = {
      id: "srv_30",
      storeId: storeA,
      name: "Quick Advisory",
      description: "Quick 30m advisory",
      durationMinutes: 30,
      price: 1500,
      isFreeConsultation: false,
      currency: "INR",
      meetingType: "video_call",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Date: Monday 2026-11-09
    // Without bookings, slots would be 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30 (8 slots)
    // Let's add an active booking from 11:00 to 12:00 UTC
    const existingBookings: Appointment[] = [
      {
        id: "apt_exist_1",
        storeId: storeA,
        serviceId: "srv_30",
        serviceName: "Existing",
        durationMinutes: 60,
        price: 1500,
        currency: "INR",
        startUtc: "2026-11-09T11:00:00.000Z",
        endUtc: "2026-11-09T12:00:00.000Z",
        customerName: "Active Client",
        customerEmail: "active@example.com",
        status: "Confirmed",
        meetingType: "video_call",
        confirmationNumber: "GR-EXIST1",
        cancellationTokenHash: "hash1",
        cancellationDeadlineUtc: "2026-11-08T11:00:00.000Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const slotsWithBooking = calculateAvailableSlots({
      store: mockStore,
      service,
      dateStr: "2026-11-09",
      existingAppointments: existingBookings,
      nowUtc: new Date("2026-11-01T00:00:00Z"),
    });

    // Slots at 11:00 and 11:30 should be excluded
    const times = slotsWithBooking.map((s) => s.formattedTime);
    assert.ok(times.includes("10:00 AM"));
    assert.ok(times.includes("10:30 AM"));
    assert.ok(!times.includes("11:00 AM"), "11:00 must be blocked by active booking");
    assert.ok(!times.includes("11:30 AM"), "11:30 must be blocked by active booking");
    assert.ok(times.includes("12:00 PM"));
    assert.equal(slotsWithBooking.length, 6);
  });

  // 5. Atomic Overlap Detection in AppointmentRepository
  it("detects and rejects overlapping concurrent bookings in AppointmentRepository", async () => {
    const storeId = "store_concurrency_test";

    // Create an initial confirmed appointment: 14:00 - 15:00 UTC
    const initialBooking = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_legal",
      serviceName: "Corporate Review",
      durationMinutes: 60,
      price: 5000,
      currency: "INR",
      startUtc: "2026-11-10T14:00:00.000Z",
      endUtc: "2026-11-10T15:00:00.000Z",
      customerName: "Priya Sharma",
      customerEmail: "priya@example.in",
      customerPhone: "+91 98765 43210",
      status: "Confirmed",
      meetingType: "video_call",
    });

    assert.ok(initialBooking.id);

    // Overlap Test A: Exact duplicate time
    const hasExactOverlap = await AppointmentRepository.checkOverlap(
      storeId,
      "2026-11-10T14:00:00.000Z",
      "2026-11-10T15:00:00.000Z"
    );
    assert.equal(hasExactOverlap, true, "Exact duplicate interval must collide");

    // Overlap Test B: Partial overlap (starts during active booking)
    const hasStartOverlap = await AppointmentRepository.checkOverlap(
      storeId,
      "2026-11-10T14:30:00.000Z",
      "2026-11-10T15:30:00.000Z"
    );
    assert.equal(hasStartOverlap, true, "Booking starting during existing slot must collide");

    // Overlap Test C: Partial overlap (ends during active booking)
    const hasEndOverlap = await AppointmentRepository.checkOverlap(
      storeId,
      "2026-11-10T13:30:00.000Z",
      "2026-11-10T14:30:00.000Z"
    );
    assert.equal(hasEndOverlap, true, "Booking ending during existing slot must collide");

    // Overlap Test D: Non-overlapping slot immediately adjacent
    const hasAdjacentOverlap = await AppointmentRepository.checkOverlap(
      storeId,
      "2026-11-10T15:00:00.000Z",
      "2026-11-10T16:00:00.000Z"
    );
    assert.equal(hasAdjacentOverlap, false, "Adjacent slot must not collide");

    // Overlap Test E: Different store on same time does not collide (tenant isolation)
    const hasDifferentStoreOverlap = await AppointmentRepository.checkOverlap(
      "different_store_id",
      "2026-11-10T14:00:00.000Z",
      "2026-11-10T15:00:00.000Z"
    );
    assert.equal(hasDifferentStoreOverlap, false, "Different store on same interval must not collide");
  });

  // 6. Cancellation Token Generation, Hashing & Slot Release
  it("issues secure tokens, validates cancellation hash, releases slots upon cancellation", async () => {
    const { rawToken, tokenHash } = generateCancellationToken();
    assert.equal(rawToken.length, 64, "Cancellation token must be 32 bytes hex (64 chars)");
    assert.equal(tokenHash.length, 64, "Token hash must be SHA-256 hex (64 chars)");
    const hash = hashCancellationToken(rawToken);
    assert.equal(hash, tokenHash, "Hash must match generated tokenHash");
    assert.notEqual(rawToken, hash, "Hash must be different from plain token");
    assert.equal(hashCancellationToken(rawToken), hash, "Hash must be deterministic");

    const storeId = "store_cancellation_test";
    const appt = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_cancel",
      serviceName: "Cancellation Test Service",
      durationMinutes: 45,
      price: 2500,
      currency: "INR",
      startUtc: "2026-11-12T10:00:00.000Z",
      endUtc: "2026-11-12T10:45:00.000Z",
      customerName: "Vikram Rathore",
      customerEmail: "vikram@example.in",
      customerPhone: "+91 99887 76655",
      status: "Confirmed",
      meetingType: "in_person",
      cancellationTokenHash: hash,
    });

    assert.ok(appt.id);
    assert.equal(appt.cancellationTokenHash, hash);

    // Verify slot is currently blocked
    const isOccupiedBefore = await AppointmentRepository.checkOverlap(
      storeId,
      "2026-11-12T10:00:00.000Z",
      "2026-11-12T10:45:00.000Z"
    );
    assert.equal(isOccupiedBefore, true);

    // Cancel by token hash
    const cancelled = await AppointmentRepository.cancelByTokenHash(
      hash,
      "Customer schedule conflict",
      "Customer"
    );
    assert.ok(cancelled);
    assert.equal(cancelled.status, "Cancelled");
    assert.equal(cancelled.cancellationReason, "Customer schedule conflict");
    assert.equal(cancelled.cancelledBy, "Customer");
    assert.ok(cancelled.cancelledAtUtc);

    // Verify slot is now immediately released and free for re-booking!
    const isOccupiedAfter = await AppointmentRepository.checkOverlap(
      storeId,
      "2026-11-12T10:00:00.000Z",
      "2026-11-12T10:45:00.000Z"
    );
    assert.equal(isOccupiedAfter, false, "Cancelled appointment must immediately release slot");
  });

  // 7. Store Input Validation & Backward Compatibility
  it("validates appointment stores while preserving strict e-commerce compatibility", () => {
    // 7A: E-commerce store creation (baseline regression)
    const ecomInput = {
      name: "Artisan Leather Crafts",
      slug: "artisan-leather",
      clientId: "client_1",
      industry: "Fashion & Apparel" as const,
      templateId: "editorial",
      websiteType: "ecommerce" as const,
    };
    const ecomRes = validateStoreInput(ecomInput);
    assert.equal(ecomRes.valid, true);
    assert.equal(ecomRes.sanitized?.websiteType, "ecommerce");
    assert.equal(ecomRes.sanitized?.industry, "Fashion & Apparel");

    // 7B: Appointment store creation
    const apptInput = {
      name: "Iyer Legal Advisory",
      slug: "iyer-legal",
      clientId: "client_1",
      websiteType: "appointments" as const,
      appointmentIndustry: "Legal Practice & Advisory" as const,
      templateId: "editorial",
    };
    const apptRes = validateStoreInput(apptInput);
    assert.equal(apptRes.valid, true);
    assert.equal(apptRes.sanitized?.websiteType, "appointments");
    assert.equal(apptRes.sanitized?.appointmentIndustry, "Legal Practice & Advisory");
    assert.equal(apptRes.sanitized?.industry, "Health & Wellness", "Maps to valid retail industry for schema safety");

    // 7C: Backward compatibility — store without websiteType defaults to ecommerce
    const legacyInput = {
      name: "Vintage Watches Co",
      slug: "vintage-watches",
      clientId: "client_2",
      industry: "Luxury Goods" as const,
      templateId: "boutique",
    };
    const legacyRes = validateStoreInput(legacyInput);
    assert.equal(legacyRes.valid, true);
    assert.equal(legacyRes.sanitized?.websiteType, "ecommerce");
  });

  // 8. Store Repository Persistence & Default Website Type
  it("persists appointmentConfig and handles legacy store retrieval safely", async () => {
    const store: Store = {
      id: "store_persist_test_001",
      name: "Apex Strategy Consultants",
      slug: "apex-strategy-consultants",
      clientId: "client_99",
      clientName: "Client 99",
      industry: "Health & Wellness",
      websiteType: "appointments",
      appointmentIndustry: "Consulting & Strategy",
      templateId: "editorial",
      templateName: "Editorial Minimal",
      status: "Draft",
      productCount: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Boutique management consulting",
      appointmentConfig: DEFAULT_APPOINTMENT_CONFIG,
    };

    const created = await StoreRepository.create(store);
    assert.equal(created.websiteType, "appointments");
    assert.equal(created.appointmentIndustry, "Consulting & Strategy");
    assert.ok(created.appointmentConfig);
    assert.equal(created.appointmentConfig?.timezone, "Asia/Kolkata");

    const retrieved = await StoreRepository.findById(store.id);
    assert.ok(retrieved);
    assert.equal(retrieved.websiteType, "appointments");
    assert.equal(retrieved.appointmentConfig?.timezone, "Asia/Kolkata");
  });
});
