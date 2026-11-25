import test from "node:test";
import assert from "node:assert/strict";
import {
  hasCapability,
  canAccessStore,
  AppCapability,
} from "../src/lib/auth/permissions";
import { isValidRole, VALID_USER_ROLES } from "../src/lib/validation/user";
import { Store } from "../src/types/store";
import { UserRole } from "../src/types/user";

const testStore: Store = {
  id: "str_perm_01",
  name: "Perm Test Store",
  slug: "perm-test-store",
  clientId: "cl_1",
  clientName: "Client Alpha",
  industry: "Fashion & Apparel",
  templateId: "tpl_1",
  templateName: "Template 1",
  status: "Draft",
  productCount: 5,
  creatorId: "user_employee_01",
  creatorName: "Jane Doe",
  lastUpdated: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  description: "Test store for permissions",
};

test("Role Hierarchy & Capability Matrix Enforcement", () => {
  // 1. Admin has every single capability
  const allCapabilities: AppCapability[] = [
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
  ];

  for (const cap of allCapabilities) {
    assert.equal(hasCapability("admin", cap), true, `Admin should have capability: ${cap}`);
  }

  // 2. Sales Director has all store & analytics capabilities, but CANNOT manage users
  assert.equal(hasCapability("sales_director", "view_analytics"), true);
  assert.equal(hasCapability("sales_director", "delete_store"), true);
  assert.equal(hasCapability("sales_director", "deploy_staging"), true);
  assert.equal(hasCapability("sales_director", "manage_users"), false);

  // 3. Account Manager has analytics and staging, but CANNOT delete stores or manage users
  assert.equal(hasCapability("account_manager", "view_analytics"), true);
  assert.equal(hasCapability("account_manager", "deploy_staging"), true);
  assert.equal(hasCapability("account_manager", "delete_store"), false);
  assert.equal(hasCapability("account_manager", "manage_users"), false);

  // 4. Employee has store authoring rights, but CANNOT delete, deploy staging, view global analytics, or manage users
  assert.equal(hasCapability("employee", "create_store"), true);
  assert.equal(hasCapability("employee", "edit_store"), true);
  assert.equal(hasCapability("employee", "export_store"), true);
  assert.equal(hasCapability("employee", "delete_store"), false);
  assert.equal(hasCapability("employee", "deploy_staging"), false);
  assert.equal(hasCapability("employee", "view_analytics"), false);
  assert.equal(hasCapability("employee", "manage_users"), false);
});

test("Store Ownership & Access Control Boundary Checks", () => {
  const adminUser = { id: "usr_admin", role: "admin" as UserRole };
  const salesDirector = { id: "usr_sd", role: "sales_director" as UserRole };
  const accountManager = { id: "usr_am", role: "account_manager" as UserRole };
  const storeOwner = { id: "user_employee_01", role: "employee" as UserRole };
  const otherEmployee = { id: "user_employee_99", role: "employee" as UserRole };

  // Admin & Sales Director can perform any action on any store
  assert.equal(canAccessStore(adminUser, testStore, "view"), true);
  assert.equal(canAccessStore(adminUser, testStore, "edit"), true);
  assert.equal(canAccessStore(adminUser, testStore, "delete"), true);
  assert.equal(canAccessStore(adminUser, testStore, "deploy"), true);

  assert.equal(canAccessStore(salesDirector, testStore, "view"), true);
  assert.equal(canAccessStore(salesDirector, testStore, "edit"), true);
  assert.equal(canAccessStore(salesDirector, testStore, "delete"), true);
  assert.equal(canAccessStore(salesDirector, testStore, "deploy"), true);

  // Account Manager can view, edit, deploy, but CANNOT delete
  assert.equal(canAccessStore(accountManager, testStore, "view"), true);
  assert.equal(canAccessStore(accountManager, testStore, "edit"), true);
  assert.equal(canAccessStore(accountManager, testStore, "deploy"), true);
  assert.equal(canAccessStore(accountManager, testStore, "delete"), false);

  // Store creator employee can view and edit, but CANNOT delete or deploy staging
  assert.equal(canAccessStore(storeOwner, testStore, "view"), true);
  assert.equal(canAccessStore(storeOwner, testStore, "edit"), true);
  assert.equal(canAccessStore(storeOwner, testStore, "delete"), false);
  assert.equal(canAccessStore(storeOwner, testStore, "deploy"), false);

  // Non-owner employee can view for pitch reference, but CANNOT edit, delete, or deploy
  assert.equal(canAccessStore(otherEmployee, testStore, "view"), true);
  assert.equal(canAccessStore(otherEmployee, testStore, "edit"), false);
  assert.equal(canAccessStore(otherEmployee, testStore, "delete"), false);
  assert.equal(canAccessStore(otherEmployee, testStore, "deploy"), false);
});

test("Expanded Role Validation recognizes 4 official enterprise roles", () => {
  assert.equal(VALID_USER_ROLES.length, 4);
  assert.equal(isValidRole("admin"), true);
  assert.equal(isValidRole("sales_director"), true);
  assert.equal(isValidRole("account_manager"), true);
  assert.equal(isValidRole("employee"), true);

  // Rejects invalid strings
  assert.equal(isValidRole("guest"), false);
  assert.equal(isValidRole("superadmin"), false);
  assert.equal(isValidRole("lead"), false);
  assert.equal(isValidRole(""), false);
});
