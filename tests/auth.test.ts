import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  normalizeEmail,
  validateEmail,
  validatePassword,
  isValidRole,
} from "../src/lib/validation/user";
import { UserRepository } from "../src/lib/repositories/user.repository";
import { bootstrapAdmin } from "../src/lib/db/bootstrap-admin";
import { authConfig } from "../src/auth.config";
import { canAccessStore } from "../src/lib/auth/permissions";
import { Store } from "../src/types";

test("Password Hashing & Security Test", async (t) => {
  await t.test("hashes passwords securely with bcrypt and verifies correctly", async () => {
    const raw = "SecureSecretPassword2026!";
    const hash = await hashPassword(raw);

    assert.notEqual(raw, hash);
    assert.ok(hash.startsWith("$2b$"));

    const isMatch = await verifyPassword(raw, hash);
    assert.equal(isMatch, true);

    const isMismatch = await verifyPassword("WrongPassword123", hash);
    assert.equal(isMismatch, false);
  });

  await t.test("password validator rejects short passwords", () => {
    const short = validatePassword("12345");
    assert.equal(short.valid, false);

    const valid = validatePassword("Password123!");
    assert.equal(valid.valid, true);
  });

  await t.test("verifyPassword handles empty inputs and corrupted hashes safely", async () => {
    assert.equal(await verifyPassword("", "somehash"), false);
    assert.equal(await verifyPassword("password", ""), false);
    assert.equal(await verifyPassword("password", "invalid_corrupted_hash"), false);
  });
});

test("Email Normalization & Validation Test", (t) => {
  t.test("normalizes email to lowercase and trims whitespace", () => {
    const raw = "   Alex.Mercer@GridRetail.Internal  ";
    assert.equal(normalizeEmail(raw), "alex.mercer@gridretail.internal");
  });

  t.test("validates standard corporate email formats", () => {
    assert.equal(validateEmail("user@example.com"), true);
    assert.equal(validateEmail("invalid-email"), false);
    assert.equal(validateEmail("@missing-username.com"), false);
  });
});

test("Role Permissions & User Repository Test", async (t) => {
  await t.test("role validator recognizes only admin and employee", () => {
    assert.equal(isValidRole("admin"), true);
    assert.equal(isValidRole("employee"), true);
    assert.equal(isValidRole("superuser"), false);
    assert.equal(isValidRole("guest"), false);
  });

  await t.test("UserRepository retrieves seeded admin account and hides password in findAll", async () => {
    const admin = await UserRepository.findByEmail("alex.mercer@gridretail.internal");
    assert.ok(admin);
    assert.equal(admin?.role, "admin");
    assert.equal(admin?.status, "active");

    const allUsers = await UserRepository.findAll();
    assert.ok(allUsers.length >= 1);
    allUsers.forEach((u) => {
      // passwordHash must not be exposed in safe user projection
      assert.equal((u as Record<string, unknown>).passwordHash, undefined);
    });
  });

  await t.test("UserRepository disables and reactivates accounts correctly", async () => {
    const user = await UserRepository.findByEmail("sarah.chen@gridretail.internal");
    assert.ok(user);

    await UserRepository.updateStatus(user!.id, "disabled");
    const disabledUser = await UserRepository.findById(user!.id);
    assert.equal(disabledUser?.status, "disabled");

    await UserRepository.updateStatus(user!.id, "active");
    const activeUser = await UserRepository.findById(user!.id);
    assert.equal(activeUser?.status, "active");
  });
});

test("Authentication & Credentials Verification Suite", async (t) => {
  await t.test("validates valid credentials for default administrator account", async () => {
    const admin = await UserRepository.findByEmail("admin@gridretail.internal");
    assert.ok(admin, "Default administrator account must exist in fallback store");
    assert.equal(admin?.role, "admin");
    assert.equal(admin?.status, "active");

    const isValid = await verifyPassword("AdminGrid2026!", admin!.passwordHash);
    assert.equal(isValid, true, "Default administrator password must match password hash");
  });

  await t.test("rejects invalid passwords for existing account", async () => {
    const admin = await UserRepository.findByEmail("admin@gridretail.internal");
    assert.ok(admin);

    const isMatch = await verifyPassword("IncorrectPassword2026!", admin!.passwordHash);
    assert.equal(isMatch, false, "Invalid password must not authenticate");
  });

  await t.test("rejects unknown accounts gracefully", async () => {
    const unknown = await UserRepository.findByEmail("nonexistent.user@gridretail.internal");
    assert.equal(unknown, null, "Unknown account must return null");
  });

  await t.test("detects inactive/disabled accounts", async () => {
    const testDisabledId = "usr_disabled_test";
    const testDisabledEmail = "disabled.tester@gridretail.internal";
    const hash = await hashPassword("ValidPassword2026!");

    await UserRepository.create({
      id: testDisabledId,
      name: "Disabled Tester",
      email: testDisabledEmail,
      passwordHash: hash,
      role: "employee",
      status: "disabled",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const user = await UserRepository.findByEmail(testDisabledEmail);
    assert.ok(user);
    assert.equal(user?.status, "disabled");
  });

  await t.test("enforces persistence across read-write operations in development fallback", async () => {
    const testId = `usr_persist_${Date.now()}`;
    const testEmail = `persist.test.${Date.now()}@gridretail.internal`;
    const hash = await hashPassword("PersistPass2026!");

    await UserRepository.create({
      id: testId,
      name: "Persistence Test User",
      email: testEmail,
      passwordHash: hash,
      role: "employee",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const retrieved = await UserRepository.findByEmail(testEmail);
    assert.ok(retrieved, "User created in fallback must be retrievable");
    assert.equal(retrieved?.id, testId);
  });
});

test("Administrator Bootstrap Behavior Suite", async (t) => {
  await t.test("rejects bootstrap when password is missing", async () => {
    const originalEnv = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;

    await assert.rejects(
      async () => {
        await bootstrapAdmin("new.admin@gridretail.internal");
      },
      /ADMIN_PASSWORD environment variable or CLI argument is required/
    );

    if (originalEnv) {
      process.env.ADMIN_PASSWORD = originalEnv;
    }
  });

  await t.test("rejects bootstrap when password does not meet minimum complexity", async () => {
    await assert.rejects(
      async () => {
        await bootstrapAdmin("new.admin@gridretail.internal", "short");
      },
      /Password must be at least 8 characters long/
    );
  });

  await t.test("bootstraps new administrator with valid operator-supplied password", async () => {
    const bootstrapEmail = `bootstrap.admin.${Date.now()}@gridretail.internal`;
    const bootstrapPassword = "OperatorSuppliedSecret2026!";

    const result = await bootstrapAdmin(bootstrapEmail, bootstrapPassword);
    assert.equal(result.success, true);
    assert.ok(result.message.includes("Initial administrator account created"));

    const created = await UserRepository.findByEmail(bootstrapEmail);
    assert.ok(created);
    assert.equal(created?.role, "admin");
    assert.equal(created?.status, "active");

    const match = await verifyPassword(bootstrapPassword, created!.passwordHash);
    assert.equal(match, true);
  });

  await t.test("is idempotent and does not overwrite existing administrator credentials", async () => {
    const existingEmail = "admin@gridretail.internal";
    const initialUser = await UserRepository.findByEmail(existingEmail);
    const initialHash = initialUser?.passwordHash;

    const result = await bootstrapAdmin(existingEmail, "NewAttemptedPassword2026!");
    assert.equal(result.success, false);
    assert.ok(result.message.includes("already exists"));

    const afterAttempt = await UserRepository.findByEmail(existingEmail);
    assert.equal(afterAttempt?.passwordHash, initialHash, "Existing password hash must remain untouched");
  });
});

test("Session & JWT Creation Suite", async (t) => {
  await t.test("jwt callback attaches user id, role, and status", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    assert.ok(jwtCallback);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = await (jwtCallback as any)({
      token: { id: "existing", role: "employee", status: "active" },
      user: {
        id: "usr_admin_00",
        name: "Platform Administrator",
        email: "admin@gridretail.internal",
        role: "admin",
        status: "active",
      },
    });

    assert.equal(token?.id, "usr_admin_00");
    assert.equal(token?.role, "admin");
    assert.equal(token?.status, "active");
  });

  await t.test("session callback propagates id and role to session user object", async () => {
    const sessionCallback = authConfig.callbacks?.session;
    assert.ok(sessionCallback);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await (sessionCallback as any)({
      session: {
        user: {
          id: "",
          role: "employee",
          name: "Platform Administrator",
          email: "admin@gridretail.internal",
        },
        expires: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      },
      token: {
        id: "usr_admin_00",
        role: "admin",
        status: "active",
      },
    });

    assert.ok(session?.user);
    assert.equal(session.user.id, "usr_admin_00");
    assert.equal(session.user.role, "admin");
  });
});

test("Test Runner Tenant Isolation & Role Authorization Boundaries", async (t) => {
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = env.NODE_ENV;

  const testRunnerUser = {
    id: "usr_test_runner_01",
    role: "admin" as const,
    email: "test-runner@gridretail.test",
  };

  const realStoreUnflagged: Store = {
    id: "str_real_merchant_prod_88",
    name: "Live Boutique Store",
    slug: "live-boutique-store",
    clientId: "cli_live_01",
    clientName: "Live Boutique Corp",
    industry: "Fashion & Apparel",
    templateId: "tmpl_minimal",
    templateName: "Minimal",
    status: "Published",
    productCount: 12,
    description: "Live merchant boutique description",
    createdAt: "2026-01-01T00:00:00Z",
    lastUpdated: "2026-01-01T00:00:00Z",
    branding: { primaryColor: "#111", secondaryColor: "#eee", fontFamily: "Inter" },
  };

  await t.test("exact registered test fixture: allowed in non-production", () => {
    env.NODE_ENV = "development";
    env.ENABLE_E2E_TEST_USER = "true";
    const registeredStore: Store = {
      ...realStoreUnflagged,
      id: "str_test_fixture_42",
      slug: "fixture-store-42",
    };
    assert.equal(canAccessStore(testRunnerUser, registeredStore, "view"), true);
    assert.equal(canAccessStore(testRunnerUser, registeredStore, "edit"), true);
  });

  await t.test("unregistered store with demo- slug: denied", () => {
    env.NODE_ENV = "development";
    const demoSlugStore: Store = {
      ...realStoreUnflagged,
      id: "str_unreg_demo_01",
      slug: "demo-fashion-boutique",
    };
    assert.equal(canAccessStore(testRunnerUser, demoSlugStore, "edit"), false);
  });

  await t.test("unregistered store with test- slug: denied", () => {
    env.NODE_ENV = "development";
    const testSlugStore: Store = {
      ...realStoreUnflagged,
      id: "str_unreg_test_slug",
      slug: "test-fashion-boutique",
    };
    assert.equal(canAccessStore(testRunnerUser, testSlugStore, "edit"), false);
  });

  await t.test("unregistered store with str_test_ prefix: denied", () => {
    env.NODE_ENV = "development";
    const prefixStore: Store = {
      ...realStoreUnflagged,
      id: "str_test_unregistered_prefix",
      slug: "unregistered-prefix-store",
    };
    assert.equal(canAccessStore(testRunnerUser, prefixStore, "edit"), false);
  });

  await t.test("store with creatorId equal to test-runner ID but not registered: denied", () => {
    env.NODE_ENV = "development";
    const creatorIdStore: Store = {
      ...realStoreUnflagged,
      id: "str_unregistered_creator_match",
      creatorId: "usr_test_runner_01",
    };
    assert.equal(canAccessStore(testRunnerUser, creatorIdStore, "edit"), false);
  });

  await t.test("store with isTestStore: true but not registered: denied", () => {
    env.NODE_ENV = "development";
    const flagStore = {
      ...realStoreUnflagged,
      id: "str_unregistered_flagged",
      isTestStore: true,
    } as unknown as Store;
    assert.equal(canAccessStore(testRunnerUser, flagStore, "edit"), false);
  });

  await t.test("ordinary merchant store with no environment flags: denied", () => {
    env.NODE_ENV = "development";
    assert.equal(canAccessStore(testRunnerUser, realStoreUnflagged, "view"), false);
    assert.equal(canAccessStore(testRunnerUser, realStoreUnflagged, "edit"), false);
    assert.equal(canAccessStore(testRunnerUser, realStoreUnflagged, "delete"), false);
  });

  await t.test("every store, including registered fixtures, denied to test runners in production", () => {
    try {
      env.NODE_ENV = "production";
      const registeredFixture: Store = {
        ...realStoreUnflagged,
        id: "str_test_fixture_42",
        slug: "fixture-store-42",
      };
      assert.equal(canAccessStore(testRunnerUser, registeredFixture, "view"), false);
      assert.equal(canAccessStore(testRunnerUser, registeredFixture, "edit"), false);
      assert.equal(canAccessStore(testRunnerUser, realStoreUnflagged, "view"), false);
      assert.equal(canAccessStore(testRunnerUser, realStoreUnflagged, "edit"), false);
    } finally {
      env.NODE_ENV = originalEnv;
    }
  });

  await t.test("normal administrator and employee permissions remain unchanged", () => {
    env.NODE_ENV = "development";
    const adminUser = {
      id: "usr_admin_00",
      role: "admin" as const,
      email: "admin@gridretail.internal",
    };
    assert.equal(canAccessStore(adminUser, realStoreUnflagged, "edit"), true);

    const employeeUser = {
      id: "usr_emp_01",
      role: "employee" as const,
      email: "sarah.chen@gridretail.internal",
    };
    const foreignStore: Store = {
      ...realStoreUnflagged,
      creatorId: "usr_emp_someone_else",
    };
    assert.equal(canAccessStore(employeeUser, foreignStore, "edit"), false);
  });
});
