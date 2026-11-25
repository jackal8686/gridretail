import { UserRole } from "@/types/user";
import { Store } from "@/types/store";
import { isRegisteredTestFixtureStore } from "./test-fixture-registry";

export type AppCapability =
  | "view_analytics"
  | "create_store"
  | "edit_store"
  | "delete_store"
  | "generate_preview_share"
  | "revoke_preview_share"
  | "export_store"
  | "deploy_staging"
  | "manage_users"
  | "view_internal_notes";

const CAPABILITY_MATRIX: Record<UserRole, AppCapability[]> = {
  admin: [
    "view_analytics",
    "create_store",
    "edit_store",
    "delete_store",
    "generate_preview_share",
    "revoke_preview_share",
    "export_store",
    "deploy_staging",
    "manage_users",
    "view_internal_notes",
  ],
  sales_director: [
    "view_analytics",
    "create_store",
    "edit_store",
    "delete_store",
    "generate_preview_share",
    "revoke_preview_share",
    "export_store",
    "deploy_staging",
    "view_internal_notes",
  ],
  account_manager: [
    "view_analytics",
    "create_store",
    "edit_store",
    "generate_preview_share",
    "revoke_preview_share",
    "export_store",
    "deploy_staging",
    "view_internal_notes",
  ],
  employee: [
    "create_store",
    "edit_store",
    "generate_preview_share",
    "revoke_preview_share",
    "export_store",
    "view_internal_notes",
  ],
};

export function hasCapability(role: UserRole, capability: AppCapability): boolean {
  const allowed = CAPABILITY_MATRIX[role];
  if (!allowed) return false;
  return allowed.includes(capability);
}

export interface AuthUserContext {
  id: string;
  role: UserRole;
  email?: string;
  name?: string;
}

export type StoreAction = "view" | "edit" | "delete" | "deploy" | "share";

export function canAccessStore(
  user: AuthUserContext,
  store: Store,
  action: StoreAction
): boolean {
  // Security Preflight Guard: Automated Test Runner Containment
  if (user.id === "usr_test_runner_01" || user.email?.toLowerCase().endsWith("@gridretail.test")) {
    // 1. Absolute production lockout: Test runner can NEVER access ANY store in production
    if (process.env.NODE_ENV === "production") {
      return false;
    }

    // 2. Real merchant store explicit protection: Deny if flagged as real/live/production
    const anyStore = store as unknown as Record<string, unknown>;
    if (
      anyStore.isRealMerchant === true ||
      anyStore.isLiveMerchant === true ||
      anyStore.environment === "production"
    ) {
      return false;
    }

    // 3. Strict Exact Test Fixture Allowlist Registry Check (Deny-by-default):
    // Slugs (demo-*, test-*), ID prefixes (str_test_*), creatorId, or isTestStore flags
    // ALONE ARE NOT PROOF of a fixture.
    // Access is permitted ONLY if store.id is an exact registered test fixture ID in the trusted registry.
    if (!store.id || !isRegisteredTestFixtureStore(store.id)) {
      return false;
    }

    // Within verified, registered test fixtures, test runner is permitted test actions
    return true;
  }

  // Admin and Sales Director have organization-wide access
  if (user.role === "admin" || user.role === "sales_director") {
    return true;
  }

  // Account Manager can view, edit, deploy, share stores, but cannot delete
  if (user.role === "account_manager") {
    if (action === "delete") {
      return false; // Only Admin and Sales Director can delete stores
    }
    return true;
  }

  // Standard employee:
  // - Cannot delete
  // - Cannot deploy staging (requires manager/director/admin)
  if (action === "delete" || action === "deploy") {
    return false;
  }

  // An employee can view, edit, and share stores they created or if no creator is set
  if (!store.creatorId || store.creatorId === user.id) {
    return true;
  }

  // Viewing demo storefronts is allowed across the team for presentation reference
  if (action === "view") {
    return true;
  }

  // Editing another employee's store is restricted for standard employees
  return false;
}
