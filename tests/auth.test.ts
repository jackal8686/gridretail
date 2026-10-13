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
