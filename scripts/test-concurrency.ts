import { AppointmentRepository } from "../src/lib/repositories/appointment.repository";

async function main() {
  const storeId = "race_test_" + Date.now();
  const startUtc = "2026-11-10T10:00:00.000Z";
  const endUtc = "2026-11-10T11:00:00.000Z";

  console.log("Firing 2 concurrent booking requests for the exact same slot...");
  const [res1, res2] = await Promise.allSettled([
    AppointmentRepository.create({
      storeId,
      serviceId: "srv_race",
      startUtc,
      endUtc,
      customerName: "Customer 1",
      customerEmail: "c1@example.com",
    }),
    AppointmentRepository.create({
      storeId,
      serviceId: "srv_race",
      startUtc,
      endUtc,
      customerName: "Customer 2",
      customerEmail: "c2@example.com",
    }),
  ]);

  console.log("Result 1 status:", res1.status, res1.status === "rejected" ? (res1 as PromiseRejectedResult).reason.message : "");
  console.log("Result 2 status:", res2.status, res2.status === "rejected" ? (res2 as PromiseRejectedResult).reason.message : "");
  const appointments = await AppointmentRepository.findByStoreId(storeId);
  console.log("Total appointments saved for slot:", appointments.length);
  if (appointments.length > 1) {
    console.error("VULNERABILITY CONFIRMED: Double-booking occurred under concurrent requests!");
    process.exit(1);
  } else if (appointments.length === 1) {
    console.log("SUCCESS: Exactly one appointment was created! Double booking was strictly prevented.");
    process.exit(0);
  } else {
    console.error("ERROR: Neither appointment was created!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
