import bcrypt from "bcryptjs";
import { UserRole } from "@/types";

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export const VALID_USER_ROLES: UserRole[] = [
  "admin",
  "sales_director",
  "account_manager",
  "employee",
];

export function isValidRole(role: string): role is UserRole {
  return VALID_USER_ROLES.includes(role as UserRole);
}
