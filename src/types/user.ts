export type UserRole = "admin" | "employee";
export type UserStatus = "active" | "disabled";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type SafeUser = Omit<User, "passwordHash">;
