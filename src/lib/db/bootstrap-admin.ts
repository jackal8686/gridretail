import { UserRepository } from "@/lib/repositories/user.repository";
import { hashPassword, normalizeEmail } from "@/lib/validation/user";
import { User } from "@/types";

export async function bootstrapAdmin(customEmail?: string, customPassword?: string): Promise<{
  success: boolean;
  message: string;
  email: string;
}> {
  const email = normalizeEmail(customEmail || process.env.ADMIN_EMAIL || "admin@gridretail.internal");
  const password = customPassword || process.env.ADMIN_PASSWORD || "AdminGrid2026!";

  const existing = await UserRepository.findByEmail(email);
  if (existing) {
    return {
      success: false,
      message: `Administrator account for ${email} already exists. Will not overwrite existing account.`,
      email,
    };
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const newAdmin: User = {
    id: `usr_${Date.now()}`,
    name: "Platform Administrator",
    email,
    passwordHash,
    role: "admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await UserRepository.create(newAdmin);

  return {
    success: true,
    message: `Initial administrator account created for ${email}.`,
    email,
  };
}

if (require.main === module) {
  bootstrapAdmin()
    .then((res) => {
      console.log("[Bootstrap Admin]", res.message);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Bootstrap Admin Error]", err);
      process.exit(1);
    });
}
