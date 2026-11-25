import { redirect } from "next/navigation";

/**
 * Root Route: Application Entry Point
 * Redirects seamlessly to the main Dashboard overview.
 */
export default function RootPage() {
  redirect("/dashboard");
}
