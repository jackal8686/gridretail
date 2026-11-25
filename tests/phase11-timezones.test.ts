import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAvailableSlots,
  getUtcInstant,
} from "../src/lib/scheduling/availability";
import { Store } from "../src/types/store";
import { AppointmentService, Appointment } from "../src/types/appointment";

describe("Phase 11: Availability & Timezone Edge Cases", () => {
  const dummyStore: Store = {
    id: "store_tz_test",
    name: "Timezone Legal Practice",
    slug: "tz-legal",
    clientId: "client_tz",
    clientName: "TZ Client",
    description: "TZ Legal Practice",
    templateId: "editorial",
    templateName: "Editorial Minimal",
    themeId: "corporate-navy",
    themeName: "Corporate Navy",
    industry: "Health & Wellness",
    status: "Published",
    productCount: 0,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    branding: { logoUrl: "", fontFamily: "sans-serif", primaryColor: "#1A365D" },
    appointmentConfig: {
      timezone: "Asia/Kolkata",
      weeklyHours: [
        { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "17:00", breakStart: "13:00", breakEnd: "14:00" },
      ],
      bufferMinutes: 15,
      minNoticeHours: 2,
      maxAdvanceDays: 14,
      requireApproval: false,
      cancellationPolicy: { allowed: true, noticeHours: 24 },
    },
  };

  const dummyService: AppointmentService = {
    id: "srv_60",
    storeId: "store_tz_test",
    name: "Comprehensive Strategy",
    durationMinutes: 60,
    price: 3000,
    currency: "INR",
    meetingType: "video_call",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("getUtcInstant correctly handles Asia/Kolkata (+05:30)", () => {
    // 09:00 AM IST on Nov 9, 2026 should be 03:30 AM UTC
    const utc = getUtcInstant("2026-11-09", "09:00", "Asia/Kolkata");
    assert.equal(utc.toISOString(), "2026-11-09T03:30:00.000Z");
  });

  test("getUtcInstant correctly handles UTC midnight boundary crossing", () => {
    // 04:00 AM IST on Nov 10, 2026 is 10:30 PM UTC on the PREVIOUS day (Nov 9)
    const utc = getUtcInstant("2026-11-10", "04:00", "Asia/Kolkata");
    assert.equal(utc.toISOString(), "2026-11-09T22:30:00.000Z");
  });

  test("getUtcInstant correctly handles America/New_York across DST transitions", () => {
    // Summer EDT is UTC-4 (July 15)
    const summerUtc = getUtcInstant("2026-07-15", "09:00", "America/New_York");
    assert.equal(summerUtc.toISOString(), "2026-07-15T13:00:00.000Z");

    // Winter EST is UTC-5 (December 15)
    const winterUtc = getUtcInstant("2026-12-15", "09:00", "America/New_York");
    assert.equal(winterUtc.toISOString(), "2026-12-15T14:00:00.000Z");
  });

  test("respects opening, closing, and break boundaries", () => {
    // Nov 9, 2026 is a Monday (dayOfWeek: 1)
    // Hours: 09:00 - 17:00, break 13:00 - 14:00, duration 60 mins (step 60 mins)
    // Expected slots: 09:00, 10:00, 11:00, 12:00 (ends 13:00, before break), 14:00, 15:00, 16:00 (ends 17:00)
    // 13:00 is during break -> excluded!
    const slots = calculateAvailableSlots({
      store: dummyStore,
      service: dummyService,
      dateStr: "2026-11-09",
      existingAppointments: [],
      nowUtc: new Date("2026-11-01T00:00:00.000Z"), // well before minNotice
    });

    const times = slots.map((s) => s.formattedTime);
    assert.ok(times.includes("9:00 AM"), "Must include opening slot");
    assert.ok(times.includes("4:00 PM"), "Must include last slot (ends at closing 17:00)");
    assert.ok(!times.includes("1:00 PM"), "Must exclude 1:00 PM slot due to lunch break");
    assert.ok(!times.includes("5:00 PM"), "Must exclude slots past closing time");
  });

  test("enforces minimum notice hours", () => {
    // now is 08:00 AM IST on Monday Nov 9 (02:30 UTC)
    // minNoticeHours is 2 -> earliest bookable slot is after 10:00 AM IST
    const nowUtc = new Date("2026-11-09T02:30:00.000Z"); // 08:00 IST

    const slots = calculateAvailableSlots({
      store: dummyStore,
      service: dummyService,
      dateStr: "2026-11-09",
      existingAppointments: [],
      nowUtc,
    });

    const times = slots.map((s) => s.formattedTime);
    assert.ok(!times.includes("9:00 AM"), "9:00 AM is within 2-hour notice window and must be rejected");
    assert.ok(times.includes("11:00 AM"), "11:00 AM is outside notice window and must be available");
  });

  test("enforces maximum advance booking days", () => {
    // maxAdvanceDays is 14 days
    // now is Nov 1, 2026
    const nowUtc = new Date("2026-11-01T00:00:00.000Z");

    // Nov 23, 2026 is 22 days in future (> 14 days)
    const slots = calculateAvailableSlots({
      store: dummyStore,
      service: dummyService,
      dateStr: "2026-11-23",
      existingAppointments: [],
      nowUtc,
    });

    assert.equal(slots.length, 0, "Must return 0 slots for dates beyond maxAdvanceDays");
  });

  test("enforces buffer minutes between appointments", () => {
    // Existing appointment: 09:00 - 10:00 IST (03:30 - 04:30 UTC)
    // Buffer is 15 minutes.
    // Next slot: 10:00 AM IST starts at 04:30 UTC.
    // Appt end (04:30) + 15 min buffer = 04:45 UTC.
    // Slot 10:00 AM IST starts at 04:30 UTC, which is < 04:45 UTC -> MUST CONFLICT due to buffer!
    const existing: Appointment = {
      id: "apt_exist",
      storeId: "store_tz_test",
      serviceId: "srv_60",
      serviceName: "Strategy",
      startUtc: "2026-11-09T03:30:00.000Z", // 09:00 IST
      endUtc: "2026-11-09T04:30:00.000Z", // 10:00 IST
      durationMinutes: 60,
      price: 3000,
      currency: "INR",
      customerName: "Existing Client",
      customerEmail: "exist@example.com",
      status: "Confirmed",
      confirmationNumber: "GR-EXIST",
      cancellationTokenHash: "hash123",
      cancellationDeadlineUtc: "2026-11-08T03:30:00.000Z",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slots = calculateAvailableSlots({
      store: dummyStore,
      service: dummyService,
      dateStr: "2026-11-09",
      existingAppointments: [existing],
      nowUtc: new Date("2026-11-01T00:00:00.000Z"),
    });

    const times = slots.map((s) => s.formattedTime);
    assert.ok(!times.includes("9:00 AM"), "9:00 AM must be unavailable due to existing appointment");
    assert.ok(!times.includes("10:00 AM"), "10:00 AM must be unavailable due to 15-min buffer requirement");
    assert.ok(times.includes("11:00 AM"), "11:00 AM starts well after buffer and must be available");
  });
});
