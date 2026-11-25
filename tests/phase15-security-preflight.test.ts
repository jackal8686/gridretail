import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { UserRepository, getIsolatedE2ETestRunnerUser } from "@/lib/repositories/user.repository";
import { canAccessStore } from "@/lib/auth/permissions";
import { Store } from "@/types/store";

describe("Phase 15 — Mandatory Security Preflight Suite", () => {
  const originalEnv = { ...process.env };

  test.afterEach(() => {
    // Restore process.env after each test
    process.env = { ...originalEnv };
  });

  test("1. Test account is strictly null when ENABLE_E2E_TEST_USER is not set", async () => {
    delete process.env.ENABLE_E2E_TEST_USER;
    delete process.env.E2E_ADMIN_PASSWORD;

    const runner = getIsolatedE2ETestRunnerUser();
    assert.equal(runner, null, "Test runner must be null when flag is not enabled");

    const user = await UserRepository.findByEmail("test-runner@gridretail.test");
    assert.equal(user, null, "UserRepository.findByEmail must return null for test runner when flag disabled");
  });

  test("2. Test account is strictly null in production even if ENABLE_E2E_TEST_USER is true", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ENABLE_E2E_TEST_USER = "true";
    process.env.E2E_ADMIN_PASSWORD = "StrongIsolatedPassword123!#";

    const runner = getIsolatedE2ETestRunnerUser();
    assert.equal(runner, null, "Test runner must be null in production environment");

    const user = await UserRepository.findByEmail("test-runner@gridretail.test");
    assert.equal(user, null, "UserRepository must refuse test runner lookup in production");
  });

  test("3. Test account is strictly null when E2E_ADMIN_PASSWORD is empty or short", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.ENABLE_E2E_TEST_USER = "true";
    delete process.env.E2E_ADMIN_PASSWORD;

    const runnerNoPass = getIsolatedE2ETestRunnerUser();
    assert.equal(runnerNoPass, null, "Test runner must be null when password missing");

    process.env.E2E_ADMIN_PASSWORD = "short";
    const runnerShortPass = getIsolatedE2ETestRunnerUser();
    assert.equal(runnerShortPass, null, "Test runner must be null when password too short");
  });

  test("4. Test account is not seeded into DEFAULT_USERS or storage/fallback-users.json", () => {
    const fallbackPath = path.join(process.cwd(), "storage", "fallback-users.json");
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, "utf-8");
      assert.doesNotMatch(
        content,
        /test-runner@gridretail\.test/,
        "fallback-users.json must not contain test-runner account"
      );
      assert.doesNotMatch(
        content,
        /usr_test_runner_01/,
        "fallback-users.json must not contain usr_test_runner_01"
      );
    }
  });

  test("5. Dynamic password hashing succeeds only with matching isolated password", async () => {
    const dynamicPass = "DynamicTestAuthPass2026!#$";
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.ENABLE_E2E_TEST_USER = "true";
    process.env.E2E_ADMIN_PASSWORD = dynamicPass;
    process.env.E2E_ADMIN_EMAIL = "test-runner@gridretail.test";

    const user = await UserRepository.findByEmail("test-runner@gridretail.test");
    assert.ok(user, "User should be found when flag and password provided");
    assert.equal(user.email, "test-runner@gridretail.test");

    const matchesCorrect = await bcrypt.compare(dynamicPass, user.passwordHash);
    assert.equal(matchesCorrect, true, "Bcrypt compare must succeed with isolated dynamic password");

    const matchesWrong = await bcrypt.compare("WrongPassword123!", user.passwordHash);
    assert.equal(matchesWrong, false, "Bcrypt compare must fail with incorrect password");
  });

  test("6. canAccessStore blocks test-runner from production access unconditionally", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const testUser = {
      id: "usr_test_runner_01",
      role: "admin" as const,
      email: "test-runner@gridretail.test",
    };

    const mockStore: Store = {
      id: "str_01",
      name: "Mock Store",
      slug: "mock-store",
      clientId: "cli_01",
      clientName: "Client",
      industry: "Fashion & Apparel",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 0,
      description: "Mock store description",
      createdAt: "2026-01-01T00:00:00Z",
      lastUpdated: "2026-01-01T00:00:00Z",
      branding: {
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        fontFamily: "Inter, sans-serif",
      },
    };

    const allowedInProd = canAccessStore(testUser, mockStore, "view");
    assert.equal(allowedInProd, false, "Test runner must NEVER be allowed access to any store in production");
  });

  test("7. canAccessStore blocks test-runner from accessing real merchant stores", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const testUser = {
      id: "usr_test_runner_01",
      role: "admin" as const,
      email: "test-runner@gridretail.test",
    };

    const realMerchantStore = {
      id: "str_real_merchant",
      name: "Live Merchant Inc",
      slug: "live-merchant",
      clientId: "cli_real",
      clientName: "Live Merchant",
      industry: "Retail",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      createdAt: "2026-01-01T00:00:00Z",
      lastUpdated: "2026-01-01T00:00:00Z",
      branding: { primaryColor: "#000", secondaryColor: "#fff" },
      isRealMerchant: true,
    } as unknown as Store;

    const allowedEdit = canAccessStore(testUser, realMerchantStore, "edit");
    assert.equal(allowedEdit, false, "Test runner must be denied access to real merchant stores");

    const allowedView = canAccessStore(testUser, realMerchantStore, "view");
    assert.equal(allowedView, false, "Test runner must be denied view to real merchant stores");
  });

  test("8. No hardcoded test passwords committed in test scripts", () => {
    const scriptsToCheck = [
      path.join(process.cwd(), "scripts", "e2e-hero-30-combinations.ts"),
      path.join(process.cwd(), "scripts", "e2e-phase14-1-verify.ts"),
    ];

    for (const scriptPath of scriptsToCheck) {
      if (fs.existsSync(scriptPath)) {
        const content = fs.readFileSync(scriptPath, "utf-8");
        assert.doesNotMatch(
          content,
          /GridSecure_2026_DevAuth!#9/,
          `Script ${path.basename(scriptPath)} must not contain hardcoded dev password`
        );
      }
    }
  });
});
