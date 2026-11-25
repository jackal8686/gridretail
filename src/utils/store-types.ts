export type CanonicalWebsiteType = "ecommerce" | "appointments" | "lead_gen";

export function normalizeWebsiteType(type?: string): CanonicalWebsiteType {
  if (!type) return "ecommerce";
  const lower = type.toLowerCase().trim();
  if (
    lower === "appointments" ||
    lower === "appointment" ||
    lower === "appointment_scheduling" ||
    lower === "scheduling"
  ) {
    return "appointments";
  }
  if (
    lower === "lead_gen" ||
    lower === "lead-gen" ||
    lower === "lead_generation" ||
    lower === "lead-generation" ||
    lower === "leadgen"
  ) {
    return "lead_gen";
  }
  return "ecommerce";
}

export function getWebsiteTypeLabel(type?: string): string {
  const norm = normalizeWebsiteType(type);
  switch (norm) {
    case "appointments":
      return "Appointment Scheduling";
    case "lead_gen":
      return "Lead Generation";
    case "ecommerce":
    default:
      return "E-Commerce";
  }
}

export function getWebsiteTypeBadgeClass(type?: string): string {
  const norm = normalizeWebsiteType(type);
  switch (norm) {
    case "appointments":
      return "bg-[#EBF0F5] text-[#2D6A9F] border-[#C3D7E8]";
    case "lead_gen":
      return "bg-[#F3EBF5] text-[#7B3F9E] border-[#E2CEE6]";
    case "ecommerce":
    default:
      return "bg-[#EBF3EF] text-[#176B4D] border-[#C8E0D2]";
  }
}

export function getWebsiteTypeFilterOptions() {
  return [
    { value: "ALL", label: "All Website Types" },
    { value: "ecommerce", label: "E-Commerce" },
    { value: "appointments", label: "Appointment Scheduling" },
    { value: "lead_gen", label: "Lead Generation" },
  ];
}
