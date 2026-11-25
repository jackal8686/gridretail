export type WebsiteType = "ecommerce" | "appointments" | "lead_gen";

export type AppointmentIndustry =
  | "Legal Practice & Advisory"
  | "Consulting & Strategy"
  | "Healthcare & Medical Clinic"
  | "Salon, Spa & Wellness"
  | "Education & Private Tutoring"
  | "Coaching & Personal Training"
  | "Creative & Design Services"
  | "Other Professional Services";

export type MeetingType = "in_person" | "video_call" | "phone_call";

export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Cancelled"
  | "Completed"
  | "No-show";

export interface DayOperatingHours {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isOpen: boolean;
  openTime: string; // "09:00" in 24hr format
  closeTime: string; // "18:00" in 24hr format
  breakStart?: string; // e.g. "13:00"
  breakEnd?: string; // e.g. "14:00"
}

export interface CancellationPolicy {
  allowed: boolean;
  noticeHours: number; // Hours prior to appointment required to cancel (e.g. 24)
  policyText?: string;
}

export interface AppointmentConfig {
  timezone: string; // e.g. "Asia/Kolkata", "America/New_York", "UTC"
  weeklyHours: DayOperatingHours[];
  bufferMinutes: number; // Buffer between appointments (e.g. 10, 15, 30)
  minNoticeHours: number; // Minimum notice before booking (e.g. 2 hours)
  maxAdvanceDays: number; // Maximum days in advance to book (e.g. 30, 60)
  slotIntervalMinutes?: number;
  cancellationPolicy: CancellationPolicy;
  requireApproval: boolean; // false = instant confirmation, true = pending approval
  meetingLocation?: string; // Physical office address or virtual link description
  supportEmail?: string;
  supportPhone?: string;
}

export interface AppointmentService {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isFreeConsultation?: boolean;
  currency: string;
  meetingType: MeetingType;
  category?: string;
  status?: "active" | "inactive";
  isActive?: boolean;
  order?: number;
  providerIds?: string[];
  bookingInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentProvider {
  id: string;
  storeId: string;
  name: string;
  role: string;
  bio?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  serviceIds?: string[];
  status?: "active" | "inactive";
  isActive?: boolean;
  timeOff?: { startUtc: string; endUtc: string; reason?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  storeId: string;
  serviceId: string;
  serviceName: string;
  providerId?: string;
  providerName?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes?: string;
  startUtc: string; // ISO 8601 UTC instant (e.g. "2026-10-25T10:00:00.000Z")
  endUtc: string; // ISO 8601 UTC instant
  durationMinutes: number;
  price: number;
  currency: string;
  meetingType?: MeetingType;
  meetingLocation?: string;
  status: AppointmentStatus;
  confirmationNumber: string; // e.g. "APT-SIM-829104"
  cancellationTokenHash: string; // SHA-256 hash of random cancellation token
  cancellationDeadlineUtc: string;
  cancelledAtUtc?: string;
  cancelledBy?: "Customer" | "Staff";
  cancellationReason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableSlot {
  startUtc: string;
  endUtc: string;
  formattedTime: string; // e.g. "10:00 AM" in local/business timezone
  formattedDate: string; // e.g. "2026-10-25"
  providerId?: string;
  providerName?: string;
}

export interface CreateAppointmentInput {
  serviceId: string;
  providerId?: string;
  startUtc: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes?: string;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  isFreeConsultation?: boolean;
  currency?: string;
  meetingType?: MeetingType;
  providerIds?: string[];
  bookingInstructions?: string;
  status?: "active" | "inactive";
}

export interface CreateProviderInput {
  name: string;
  role: string;
  bio?: string;
  email: string;
  phone?: string;
  serviceIds?: string[];
  status?: "active" | "inactive";
}
