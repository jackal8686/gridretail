import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Logger } from "../src/lib/logger";
import { ConsoleMockEmailProvider } from "../src/lib/notifications/email-provider";
import { EmailNotification } from "../src/types/notification";
import nextConfig from "../next.config";

describe("Phase 11.1 Security: Sensitive Value Redaction & Log Integrity", () => {
  test("Logger sanitizes raw 64-character hex cancellation tokens", () => {
    const rawToken = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const logged = Logger.sanitizeString(`Token generated: ${rawToken}`);
    assert.ok(!logged.includes(rawToken), "Raw token must not appear in sanitized string");
    assert.ok(logged.includes("[REDACTED_HEX_TOKEN]"), "Raw token should be replaced by redaction tag");
  });

  test("Logger sanitizes cancellation paths and URLs", () => {
    const rawToken = "f0e1d2c3b4a5968778695a4b3c2d1e0ff0e1d2c3b4a5968778695a4b3c2d1e0f";
    const path = `/store/legal-partners/appointments/${rawToken}/cancel`;
    const logged = Logger.sanitizeString(`Direct customer link: https://gridretail.internal${path}`);
    assert.ok(!logged.includes(rawToken), "Token in URL must be redacted");
    assert.ok(logged.includes("/appointments/[REDACTED_TOKEN]/cancel"), "Path must be masked");
  });

  test("Logger sanitizes customer emails and phone numbers", () => {
    const email = "jane.client@privatedomain.com";
    const phone = "+91 9876543210";
    const sanitizedEmail = Logger.sanitizeString(`Customer contact email: ${email}`);
    const sanitizedPhone = Logger.sanitizeString(`Customer contact phone: ${phone}`);

    assert.ok(!sanitizedEmail.includes(email), "Email address must be redacted");
    assert.ok(sanitizedEmail.includes("[REDACTED_EMAIL]"), "Email should be replaced by redaction tag");

    assert.ok(!sanitizedPhone.includes(phone), "Phone number must be redacted");
    assert.ok(sanitizedPhone.includes("[REDACTED_PHONE]"), "Phone should be replaced by redaction tag");
  });

  test("Logger sanitizes sensitive dictionary keys in structured contexts", () => {
    const rawContext = {
      storeId: "store_123",
      cancellationToken: "abc123secretTokenValueHere4567890",
      customerName: "Jane Doe",
      customerEmail: "jane@test.org",
      customerPhone: "+1-555-0199",
      customerNotes: "Confidential legal dispute details",
      adminNotes: "Internal review note: high profile client",
    };

    const sanitized = Logger.sanitize(rawContext) as Record<string, unknown>;
    assert.equal(sanitized.storeId, "store_123");
    assert.equal(sanitized.cancellationToken, "[REDACTED]");
    assert.equal(sanitized.customerName, "[REDACTED]");
    assert.equal(sanitized.customerEmail, "[REDACTED]");
    assert.equal(sanitized.customerPhone, "[REDACTED]");
    assert.equal(sanitized.customerNotes, "[REDACTED]");
    assert.equal(sanitized.adminNotes, "[REDACTED]");
  });

  test("Logger output streams do not leak raw sensitive values", () => {
    const rawToken = "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff";
    const secretEmail = "confidential-user@example.com";

    const capturedLogs: string[] = [];
    const originalStdoutWrite = process.stdout.write;
    const originalStderrWrite = process.stderr.write;

    // Capture stdout and stderr
    process.stdout.write = ((chunk: string | Uint8Array) => {
      capturedLogs.push(chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string | Uint8Array) => {
      capturedLogs.push(chunk.toString());
      return true;
    }) as typeof process.stderr.write;

    try {
      Logger.info("Customer booked appointment", {
        cancellationToken: rawToken,
        customerEmail: secretEmail,
        customerName: "Alice Client",
        notes: `Urgent case: ${secretEmail}`,
      });

      Logger.error("Error processing booking token", `${rawToken} was invalid for ${secretEmail}`);
    } finally {
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
    }

    const allOutput = capturedLogs.join("\n");
    assert.ok(!allOutput.includes(rawToken), "Raw token must not appear anywhere in stdout/stderr");
    assert.ok(!allOutput.includes(secretEmail), "Customer email must not appear anywhere in stdout/stderr");
    assert.ok(!allOutput.includes("Alice Client"), "Customer name must not appear in stdout/stderr");
  });

  test("Mock email provider indicates simulated dispatch and does not claim real transmission", async () => {
    const provider = new ConsoleMockEmailProvider();
    const notification: EmailNotification = {
      id: "notif_1",
      storeId: "store_123",
      storeName: "Legal Consulting",
      to: "recipient@clientdomain.com",
      from: "no-reply@gridretail.internal",
      subject: "Appointment Confirmed",
      textBody: "Your booking is confirmed with link: https://gridretail.internal/appointments/xyz",
      htmlBody: "<p>Your booking is confirmed</p>",
      status: "queued",
      event: "delivery_completed",
      createdAt: new Date().toISOString(),
    };

    const result = await provider.sendEmail(notification);
    assert.equal(result.success, true);
    assert.ok(result.messageId?.startsWith("mock-"), "Message ID must reflect mock/simulation");
    assert.equal(provider.getOutbox().length, 1);
  });

  test("Next.js configuration specifies Referrer-Policy and Cache-Control headers for cancellation routes", async () => {
    if (typeof nextConfig.headers === "function") {
      const headerConfigs = await nextConfig.headers();
      const cancelHeaderConfig = headerConfigs.find((h) =>
        h.source.includes("appointments") && h.source.includes("cancel")
      );

      assert.ok(cancelHeaderConfig, "Cancellation route headers must be defined in next.config.ts");
      const referrerHeader = cancelHeaderConfig.headers.find(
        (h) => h.key.toLowerCase() === "referrer-policy"
      );
      assert.ok(referrerHeader, "Referrer-Policy header must be present");
      assert.equal(referrerHeader.value, "no-referrer", "Referrer-Policy must be no-referrer");

      const cacheHeader = cancelHeaderConfig.headers.find(
        (h) => h.key.toLowerCase() === "cache-control"
      );
      assert.ok(cacheHeader, "Cache-Control header must be present");
      assert.ok(cacheHeader.value.includes("no-store"), "Cache-Control must prohibit storing sensitive URLs");
    }
  });

  test("Token invalidation: cancellation token hash verification and rejection of invalid tokens", async () => {
    const { generateCancellationToken, hashCancellationToken } = await import("../src/lib/scheduling/availability");
    const { AppointmentRepository } = await import("../src/lib/repositories/appointment.repository");

    const storeId = `token_test_store_${Date.now()}`;
    const { rawToken, tokenHash } = generateCancellationToken();

    // 1. Verify hash matches deterministic sha256
    assert.equal(hashCancellationToken(rawToken), tokenHash);

    // 2. Querying invalid/tampered token returns null
    const bogusHash = hashCancellationToken("tampered_or_invalid_raw_token_value_here");
    const bogusLookup = await AppointmentRepository.findByCancellationTokenHash(bogusHash);
    assert.equal(bogusLookup, null, "Tampered/invalid token must return null");

    // 3. Create appointment with the valid token
    const appt = await AppointmentRepository.create({
      storeId,
      serviceId: "srv_token_test",
      startUtc: "2026-12-25T10:00:00.000Z",
      endUtc: "2026-12-25T11:00:00.000Z",
      customerName: "Token Subject",
      customerEmail: "token@subject.test",
      cancellationTokenHash: tokenHash,
    });
    assert.ok(appt.id);

    // 4. Find by token hash succeeds while active
    const activeFound = await AppointmentRepository.findByCancellationTokenHash(tokenHash);
    assert.ok(activeFound);
    assert.equal(activeFound.id, appt.id);
    assert.equal(activeFound.status, "Confirmed");

    // 5. Cancel by token hash
    const cancelled = await AppointmentRepository.cancelByTokenHash(tokenHash, "Customer self-service cancel");
    assert.equal(cancelled?.status, "Cancelled");
    assert.ok(cancelled?.cancelledAtUtc);

    // 6. Token Invalidation: Re-cancelling with the same token does not mutate status or update timestamp
    const secondCancel = await AppointmentRepository.cancelByTokenHash(tokenHash, "Attempted override");
    assert.equal(secondCancel?.status, "Cancelled");
    assert.equal(secondCancel?.cancelledAtUtc, cancelled?.cancelledAtUtc, "Cancelled timestamp must be immutable");
    assert.equal(secondCancel?.cancellationReason, "Customer self-service cancel", "Original reason must be preserved");

    // 7. Cleanup
    await AppointmentRepository.deleteByStoreId(storeId);
  });
});
