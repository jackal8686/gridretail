import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@/types";

export const authConfig: NextAuthConfig = {
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
        token.role = (user as { role: UserRole }).role;
        token.status = (user as { status: string }).status;
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
  providers: [],
  secret: process.env.AUTH_SECRET || "gridretail_dev_secret_key_minimum_32_characters_long",
  trustHost: true,
};
