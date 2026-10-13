import { redirect } from "next/navigation";

/**
 * Root Route: Application Entry Point
 * In Phase 1 (Foundation & UI), redirects seamlessly to the main Dashboard overview.
 * Authentication guards and protected routing will be introduced in Phase 2.
 */
export default function RootPage() {
  redirect("/dashboard");
}
