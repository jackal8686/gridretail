import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { User, SafeUser } from "@/types";
import { normalizeEmail } from "@/lib/validation/user";

// Authentic bcrypt hash for development fallback accounts ("AdminGrid2026!")
// Generated using bcrypt.hashSync("AdminGrid2026!", 10)
const DEFAULT_DEV_HASH = "$2b$10$BgTygAdBOBKXRGHnI4qWhulsEsj2GXl0LSHvsrwQHigyWew8luYPy";

const DEFAULT_USERS: User[] = [
  {
    id: "usr_admin_00",
    name: "Platform Administrator",
    email: "admin@gridretail.internal",
    passwordHash: DEFAULT_DEV_HASH,
    role: "admin",
    status: "active",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "usr_admin_01",
    name: "Alex Mercer (Admin)",
    email: "alex.mercer@gridretail.internal",
    passwordHash: DEFAULT_DEV_HASH,
    role: "admin",
    status: "active",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "usr_emp_01",
    name: "Sarah Chen (Employee)",
    email: "sarah.chen@gridretail.internal",
    passwordHash: DEFAULT_DEV_HASH,
    role: "employee",
    status: "active",
    createdAt: "2026-10-02T00:00:00Z",
    updatedAt: "2026-10-02T00:00:00Z",
  },
];

/**
 * Isolated E2E Test Runner Account
 * Mandatory Security Preflight Controls:
 * 1. Strictly null in production (NODE_ENV === "production" returns null).
 * 2. Only active when ENABLE_E2E_TEST_USER === "true".
 * 3. Requires dynamic E2E_ADMIN_PASSWORD from isolated test config (no hardcoded fallback).
 * 4. Never persisted to disk (storage/fallback-users.json) or production databases.
 */
export function getIsolatedE2ETestRunnerUser(): User | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  if (process.env.ENABLE_E2E_TEST_USER !== "true") {
    return null;
  }
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    return null;
  }
  const email = normalizeEmail(process.env.E2E_ADMIN_EMAIL || "test-runner@gridretail.test");
  return {
    id: "usr_test_runner_01",
    name: "Automated E2E Test Runner",
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "admin",
    status: "active",
    createdAt: "2026-11-21T00:00:00Z",
    updatedAt: "2026-11-21T00:00:00Z",
  };
}

const FALLBACK_FILE_PATH = path.join(process.cwd(), "storage", "fallback-users.json");

function getFallbackUsers(): User[] {
  if (!isFallbackAllowed()) {
    return [];
  }
  try {
    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      const raw = fs.readFileSync(FALLBACK_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const emails = new Set(parsed.map((u: User) => u.email.toLowerCase()));
        for (const defUser of DEFAULT_USERS) {
          if (!emails.has(defUser.email.toLowerCase())) {
            parsed.push(defUser);
          }
        }
        return parsed;
      }
    }
  } catch {
    // fallback to memory
  }
  return [...DEFAULT_USERS];
}

function persistFallbackUsers(users: User[]): void {
  if (!isFallbackAllowed()) {
    return;
  }
  try {
    const dir = path.dirname(FALLBACK_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // ignore filesystem write errors in restricted environments
  }
}

let memoryUsers: User[] = getFallbackUsers();

export const UserRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);

    // Isolated E2E Test Runner check
    const testRunner = getIsolatedE2ETestRunnerUser();
    if (testRunner && normalized === testRunner.email) {
      return testRunner;
    }

    const db = await getDb();
    if (db) {
      try {
        const user = await db.collection<User>("users").findOne({ email: normalized });
        if (user) {
          return {
            ...user,
            id: user.id || (user as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
        }
        return null;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB query error in UserRepository.findByEmail:", err);
      }
    }

    if (!isFallbackAllowed() && !db) {
      return null;
    }

    const currentUsers = getFallbackUsers();
    return currentUsers.find((u) => normalizeEmail(u.email) === normalized) || null;
  },

  async findById(id: string): Promise<User | null> {
    // Isolated E2E Test Runner check
    const testRunner = getIsolatedE2ETestRunnerUser();
    if (testRunner && id === testRunner.id) {
      return testRunner;
    }

    const db = await getDb();
    if (db) {
      try {
        const user = await db.collection<User>("users").findOne({ id });
        if (user) {
          return {
            ...user,
            id: user.id || (user as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
        }
        return null;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB query error in UserRepository.findById:", err);
      }
    }

    if (!isFallbackAllowed() && !db) {
      return null;
    }

    const currentUsers = getFallbackUsers();
    return currentUsers.find((u) => u.id === id) || null;
  },

  async findAll(): Promise<SafeUser[]> {
    const testRunner = getIsolatedE2ETestRunnerUser();
    const db = await getDb();
    if (db) {
      try {
        const users = await db
          .collection<User>("users")
          .find({}, { projection: { passwordHash: 0 } })
          .sort({ createdAt: -1 })
          .toArray();

        const mapped: SafeUser[] = users.map((u) => ({
          id: u.id || (u as unknown as { _id: { toString: () => string } })._id?.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          lastLoginAt: u.lastLoginAt,
        }));

        if (testRunner && !mapped.some((u) => u.id === testRunner.id)) {
          mapped.push({
            id: testRunner.id,
            name: testRunner.name,
            email: testRunner.email,
            role: testRunner.role,
            status: testRunner.status,
            createdAt: testRunner.createdAt,
            updatedAt: testRunner.updatedAt,
          });
        }

        return mapped;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB query error in UserRepository.findAll:", err);
      }
    }

    if (!isFallbackAllowed() && !db) {
      return testRunner
        ? [
            {
              id: testRunner.id,
              name: testRunner.name,
              email: testRunner.email,
              role: testRunner.role,
              status: testRunner.status,
              createdAt: testRunner.createdAt,
              updatedAt: testRunner.updatedAt,
            },
          ]
        : [];
    }

    const currentUsers = getFallbackUsers();
    const mapped: SafeUser[] = currentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt,
    }));

    if (testRunner && !mapped.some((u) => u.id === testRunner.id)) {
      mapped.push({
        id: testRunner.id,
        name: testRunner.name,
        email: testRunner.email,
        role: testRunner.role,
        status: testRunner.status,
        createdAt: testRunner.createdAt,
        updatedAt: testRunner.updatedAt,
      });
    }

    return mapped;
  },

  async create(user: User): Promise<User> {
    const normalizedUser = {
      ...user,
      email: normalizeEmail(user.email),
    };

    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create user: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<User>("users").insertOne({ ...normalizedUser });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in UserRepository.create:", err);
      }
    }

    const currentUsers = getFallbackUsers();
    const existingIndex = currentUsers.findIndex((u) => normalizeEmail(u.email) === normalizedUser.email);
    if (existingIndex >= 0) {
      currentUsers[existingIndex] = normalizedUser;
    } else {
      currentUsers.push(normalizedUser);
    }
    memoryUsers = currentUsers;
    persistFallbackUsers(currentUsers);
    return normalizedUser;
  },

  async updateStatus(id: string, status: "active" | "disabled"): Promise<boolean> {
    const now = new Date().toISOString();
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update user status: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<User>("users").updateOne({ id }, { $set: { status, updatedAt: now } });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB update error in UserRepository.updateStatus:", err);
      }
    }

    const currentUsers = getFallbackUsers();
    const user = currentUsers.find((u) => u.id === id);
    if (user) {
      user.status = status;
      user.updatedAt = now;
      memoryUsers = currentUsers;
      persistFallbackUsers(currentUsers);
      return true;
    }
    return false;
  },

  async updateLastLogin(id: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    if (db) {
      try {
        await db.collection<User>("users").updateOne({ id }, { $set: { lastLoginAt: now } });
      } catch (err) {
        console.warn("MongoDB update error in UserRepository.updateLastLogin:", err);
      }
    }

    const currentUsers = getFallbackUsers();
    const user = currentUsers.find((u) => u.id === id);
    if (user) {
      user.lastLoginAt = now;
      memoryUsers = currentUsers;
      persistFallbackUsers(currentUsers);
    }
  },

  async updateProfile(id: string, updates: { name?: string; email?: string }): Promise<SafeUser | null> {
    const now = new Date().toISOString();
    const patch: Partial<User> = { updatedAt: now };
    if (updates.name) patch.name = updates.name.trim();
    if (updates.email) patch.email = normalizeEmail(updates.email);

    const db = await getDb();
    if (db) {
      try {
        await db.collection<User>("users").updateOne({ id }, { $set: patch });
      } catch (err) {
        console.warn("MongoDB update error in UserRepository.updateProfile:", err);
      }
    }

    const currentUsers = getFallbackUsers();
    const user = currentUsers.find((u) => u.id === id);
    if (user) {
      if (patch.name) user.name = patch.name;
      if (patch.email) user.email = patch.email;
      user.updatedAt = now;
      memoryUsers = currentUsers;
      persistFallbackUsers(currentUsers);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      };
    }
    return null;
  },

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const now = new Date().toISOString();
    const db = await getDb();
    if (db) {
      try {
        await db.collection<User>("users").updateOne({ id }, { $set: { passwordHash, updatedAt: now } });
      } catch (err) {
        console.warn("MongoDB update error in UserRepository.updatePassword:", err);
      }
    }

    const currentUsers = getFallbackUsers();
    const user = currentUsers.find((u) => u.id === id);
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = now;
      memoryUsers = currentUsers;
      persistFallbackUsers(currentUsers);
      return true;
    }
    return false;
  },

  _resetMemory(users?: User[]) {
    memoryUsers = users ? [...users] : [...DEFAULT_USERS];
    if (isFallbackAllowed()) {
      persistFallbackUsers(memoryUsers);
    }
  },
};
