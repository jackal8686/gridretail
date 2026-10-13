import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRepository } from "@/lib/repositories/user.repository";
import { verifyPassword, normalizeEmail } from "@/lib/validation/user";
import { UserRole } from "@/types";

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

        // Record last login
        await UserRepository.updateLastLogin(user.id);

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
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours session duration
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || "gridretail_dev_secret_key_minimum_32_characters_long",
  trustHost: true,
});
