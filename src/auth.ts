import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRepository } from "@/lib/repositories/user.repository";
import { verifyPassword, normalizeEmail } from "@/lib/validation/user";
import { UserRole } from "@/types";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    status: string;
  }
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    status: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "GridRetail Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = normalizeEmail(credentials.email as string);
        const password = credentials.password as string;

        const user = await UserRepository.findByEmail(email);
        if (!user) {
          return null;
        }

        if (user.status === "disabled") {
          throw new Error("ACCOUNT_DISABLED: Your account has been disabled by an administrator.");
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Record last login asynchronously without blocking the authentication response
        UserRepository.updateLastLogin(user.id).catch((err) => {
          console.error("Failed to update last login timestamp:", err);
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
});
