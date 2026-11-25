import crypto from "crypto";
import { Store } from "@/types/store";
import {
  Appointment,
  AppointmentConfig,
  AppointmentProvider,
  AppointmentService,
  AvailableSlot,
  DayOperatingHours,
} from "@/types/appointment";

export const DEFAULT_WEEKLY_HOURS: DayOperatingHours[] = [
  { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" }, // Sunday closed
  { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" }, // Monday
  { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" }, // Tuesday
  { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" }, // Wednesday
  { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" }, // Thursday
  { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" }, // Friday
  { dayOfWeek: 6, isOpen: false, openTime: "10:00", closeTime: "16:00" }, // Saturday closed
];

export const DEFAULT_APPOINTMENT_CONFIG: AppointmentConfig = {
  timezone: "Asia/Kolkata",
  weeklyHours: DEFAULT_WEEKLY_HOURS,
  bufferMinutes: 15,
  minNoticeHours: 2,
  maxAdvanceDays: 30,
  requireApproval: false,
  cancellationPolicy: {
    allowed: true,
    noticeHours: 24,
    policyText: "Cancellations are accepted up to 24 hours prior to appointment time.",
  },
  meetingLocation: "Office Consultation / Video Link upon Confirmation",
};

/**
 * Generate a cryptographically secure cancellation token and its SHA-256 hash.
 * The raw token is returned to the customer, while only the hash is persisted.
 */
export function generateCancellationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashCancellationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Format minutes into "HH:MM" 24hr string
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Parse "HH:MM" 24hr string into total minutes from start of day
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Format "HH:MM" into 12hr time format e.g. "09:30 AM"
 */
export function format12HourTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const hours = h || 0;
  const mins = String(m || 0).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${mins} ${period}`;
}

/**
 * Compute UTC date-time from local date string ("YYYY-MM-DD"), local time string ("HH:MM"),
 * and standard timezone offset.
 */
export function getUtcInstant(dateStr: string, timeStr: string, timezone: string): Date {
  // Construct an ISO string with the local time
  // Using native Date and Intl or offset parsing
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Use Intl to determine timezone offset or create a localized timestamp
  const targetDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  // Determine timezone offset for the given timezone at this instant
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Format targetDate in target timezone to find delta
    const parts = formatter.formatToParts(targetDate);
    const tzYear = Number(parts.find((p) => p.type === "year")?.value);
    const tzMonth = Number(parts.find((p) => p.type === "month")?.value);
    const tzDay = Number(parts.find((p) => p.type === "day")?.value);
    const tzHour = Number(parts.find((p) => p.type === "hour")?.value);
    const tzMinute = Number(parts.find((p) => p.type === "minute")?.value);

    // Difference in milliseconds between targetDate in UTC and target timezone representation
    const tzDateAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0);
    const offsetMs = tzDateAsUtc - targetDate.getTime();

    // Adjust targetDate so when viewed in timezone, it equals [hours, minutes]
    return new Date(targetDate.getTime() - offsetMs);
  } catch {
    // Fallback if timezone is invalid: assume UTC or Asia/Kolkata (+05:30)
    if (timezone === "Asia/Kolkata") {
      const offsetMs = (5 * 60 + 30) * 60 * 1000;
      return new Date(targetDate.getTime() - offsetMs);
    }
    return targetDate;
  }
}

export interface CalculateSlotsParams {
  store: Store;
  service: AppointmentService;
  providerId?: string;
  dateStr: string; // "YYYY-MM-DD"
  existingAppointments: Appointment[];
  providers?: AppointmentProvider[];
  nowUtc?: Date;
}

/**
 * Calculate available booking time slots for a given store, service, date, and provider.
 */
export function calculateAvailableSlots({
  store,
  service,
  providerId,
  dateStr,
  existingAppointments,
  providers = [],
  nowUtc = new Date(),
}: CalculateSlotsParams): AvailableSlot[] {
  const config = store.appointmentConfig || DEFAULT_APPOINTMENT_CONFIG;
  const timezone = config.timezone || "Asia/Kolkata";
  const weeklyHours = config.weeklyHours || DEFAULT_WEEKLY_HOURS;
  const bufferMinutes = typeof config.bufferMinutes === "number" ? config.bufferMinutes : 15;
  const minNoticeHours = typeof config.minNoticeHours === "number" ? config.minNoticeHours : 2;
  const maxAdvanceDays = typeof config.maxAdvanceDays === "number" ? config.maxAdvanceDays : 30;

  // 1. Validate date format (YYYY-MM-DD)
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  if (!dateMatch) return [];

  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDateObj = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = targetDateObj.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // 2. Check advance window: cannot book past maxAdvanceDays or in the past
  const maxDate = new Date(nowUtc.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
  if (targetDateObj.getTime() > maxDate.getTime()) {
    return [];
  }

  // 3. Find operating hours for this day of week
  const daySchedule = weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.isOpen) {
    return [];
  }

  const openMinutes = timeStringToMinutes(daySchedule.openTime || "09:00");
  const closeMinutes = timeStringToMinutes(daySchedule.closeTime || "18:00");
  const breakStartMinutes = daySchedule.breakStart ? timeStringToMinutes(daySchedule.breakStart) : null;
  const breakEndMinutes = daySchedule.breakEnd ? timeStringToMinutes(daySchedule.breakEnd) : null;

  const duration = service.durationMinutes || 30;
  // Step between start times: align with 30-min intervals or duration
  const stepMinutes = duration <= 30 ? 30 : 60;

  // Selected provider info
  const selectedProvider = providerId ? providers.find((p) => p.id === providerId) : providers[0];

  const slots: AvailableSlot[] = [];
  const minNoticeTime = new Date(nowUtc.getTime() + minNoticeHours * 60 * 60 * 1000);

  for (let currentMin = openMinutes; currentMin + duration <= closeMinutes; currentMin += stepMinutes) {
    const slotEndMin = currentMin + duration;

    // Check lunch/break overlap
    if (breakStartMinutes !== null && breakEndMinutes !== null) {
      if (currentMin < breakEndMinutes && slotEndMin > breakStartMinutes) {
        continue; // Overlaps break
      }
    }

    const timeStr = minutesToTimeString(currentMin);
    const endTimeStr = minutesToTimeString(slotEndMin);

    const slotStartUtc = getUtcInstant(dateStr, timeStr, timezone);
    const slotEndUtc = getUtcInstant(dateStr, endTimeStr, timezone);

    // Check minimum lead time
    if (slotStartUtc.getTime() < minNoticeTime.getTime()) {
      continue;
    }

    const slotStartIso = slotStartUtc.toISOString();
    const slotEndIso = slotEndUtc.toISOString();

    // Check provider time off
    if (selectedProvider && selectedProvider.timeOff && selectedProvider.timeOff.length > 0) {
      const isBlocked = selectedProvider.timeOff.some(
        (to) => slotStartIso < to.endUtc && slotEndIso > to.startUtc
      );
      if (isBlocked) continue;
    }

    // Check existing appointments overlap
    // Active appointments: Confirmed or Pending
    const isConflict = existingAppointments.some((appt) => {
      if (appt.status !== "Confirmed" && appt.status !== "Pending") return false;
      if (providerId && appt.providerId && appt.providerId !== providerId) return false;

      // Include buffer time for conflict checking:
      // existing appointment end + buffer
      const apptEndWithBuffer = new Date(
        new Date(appt.endUtc).getTime() + bufferMinutes * 60 * 1000
      ).toISOString();

      return slotStartIso < apptEndWithBuffer && slotEndIso > appt.startUtc;
    });

    if (isConflict) {
      continue;
    }

    slots.push({
      startUtc: slotStartIso,
      endUtc: slotEndIso,
      formattedTime: format12HourTime(timeStr),
      formattedDate: dateStr,
      providerId: selectedProvider?.id,
      providerName: selectedProvider?.name,
    });
  }

  return slots;
}
