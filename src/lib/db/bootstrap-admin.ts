import { UserRepository } from "@/lib/repositories/user.repository";
import { hashPassword, normalizeEmail, validatePassword } from "@/lib/validation/user";
import { User } from "@/types";

export async function bootstrapAdmin(customEmail?: string, customPassword?: string): Promise<{
  success: boolean;
  message: string;
  email: string;
}> {
  const email = normalizeEmail(customEmail || process.env.ADMIN_EMAIL || "admin@gridretail.internal");
  const password = customPassword || process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD environment variable or CLI argument is required. Usage: ADMIN_PASSWORD=\"your-secure-password\" npm run bootstrap-admin, or tsx src/lib/db/bootstrap-admin.ts admin@domain.com \"your-secure-password\""
    );
  }

  const passValidation = validatePassword(password);
  if (!passValidation.valid) {
    throw new Error(passValidation.error || "Password must be at least 8 characters long.");
  }

  const existing = await UserRepository.findByEmail(email);
  if (existing) {
    return {
      success: false,
      message: `Administrator account for ${email} already exists. Existing credentials were not modified.`,
      email,
    };
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const newAdmin: User = {
    id: `usr_admin_${Date.now()}`,
    name: process.env.ADMIN_NAME || "Platform Administrator",
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

function loadLocalEnvIfPresent(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignore environment file read errors
  }
}

if (require.main === module) {
  loadLocalEnvIfPresent();
  const cliEmail = process.argv[2];
  const cliPassword = process.argv[3];
  bootstrapAdmin(cliEmail, cliPassword)
    .then((res) => {
      console.log("[Bootstrap Admin]", res.message);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Bootstrap Admin Error]", err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
