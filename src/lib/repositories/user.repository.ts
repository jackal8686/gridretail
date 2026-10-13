import { getDb } from "@/lib/db/mongodb";
import { User, SafeUser } from "@/types";
import { normalizeEmail } from "@/lib/validation/user";

// Default bootstrap user hash for "AdminGrid2026!"
// Generated using bcrypt.hashSync("AdminGrid2026!", 10)
const DEFAULT_ADMIN_HASH = "$2b$10$O6vR5v.X/X0m8d/dZJ63UegtLdD8cR7J3g7L0J3WJbK.7C9fG7rK2";

let memoryUsers: User[] = [
  {
    id: "usr_admin_01",
    name: "Alex Mercer (Admin)",
    email: "alex.mercer@gridretail.internal",
    passwordHash: DEFAULT_ADMIN_HASH,
    role: "admin",
    status: "active",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "usr_emp_01",
    name: "Sarah Chen (Employee)",
    email: "sarah.chen@gridretail.internal",
    passwordHash: DEFAULT_ADMIN_HASH,
    role: "employee",
    status: "active",
    createdAt: "2026-10-02T00:00:00Z",
    updatedAt: "2026-10-02T00:00:00Z",
  },
];

export const UserRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
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
      } catch (err) {
        console.warn("MongoDB query error in UserRepository.findByEmail:", err);
      }
    }

    return memoryUsers.find((u) => normalizeEmail(u.email) === normalized) || null;
  },

  async findById(id: string): Promise<User | null> {
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
      } catch (err) {
        console.warn("MongoDB query error in UserRepository.findById:", err);
      }
    }

    return memoryUsers.find((u) => u.id === id) || null;
  },

  async findAll(): Promise<SafeUser[]> {
    const db = await getDb();
    if (db) {
      try {
        const users = await db
          .collection<User>("users")
          .find({}, { projection: { passwordHash: 0 } })
          .sort({ createdAt: -1 })
          .toArray();

        if (users.length > 0) {
          return users.map((u) => ({
            id: u.id || (u as unknown as { _id: { toString: () => string } })._id?.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            lastLoginAt: u.lastLoginAt,
          }));
        }
      } catch (err) {
        console.warn("MongoDB query error in UserRepository.findAll:", err);
      }
    }

    return memoryUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt,
    }));
  },

  async create(user: User): Promise<User> {
    const normalizedUser = {
      ...user,
      email: normalizeEmail(user.email),
    };

    const db = await getDb();
    if (db) {
      try {
        await db.collection<User>("users").insertOne({ ...normalizedUser });
      } catch (err) {
        console.warn("MongoDB insert error in UserRepository.create:", err);
      }
    }

    memoryUsers.push(normalizedUser);
    return normalizedUser;
  },

  async updateStatus(id: string, status: "active" | "disabled"): Promise<boolean> {
    const now = new Date().toISOString();
    const db = await getDb();
    if (db) {
      try {
        await db.collection<User>("users").updateOne({ id }, { $set: { status, updatedAt: now } });
      } catch (err) {
        console.warn("MongoDB update error in UserRepository.updateStatus:", err);
      }
    }

    const user = memoryUsers.find((u) => u.id === id);
    if (user) {
      user.status = status;
      user.updatedAt = now;
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

    const user = memoryUsers.find((u) => u.id === id);
    if (user) {
      user.lastLoginAt = now;
    }
  },

  _resetMemory(users?: User[]) {
    memoryUsers = users ? [...users] : [
      {
        id: "usr_admin_01",
        name: "Alex Mercer (Admin)",
        email: "alex.mercer@gridretail.internal",
        passwordHash: DEFAULT_ADMIN_HASH,
        role: "admin",
        status: "active",
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ];
  },
};
