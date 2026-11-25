/**
 * GridRetail — Strict Isolated Test Fixture Store Registry
 *
 * Provides a strictly controlled in-memory registry of store IDs that the
 * automated E2E test runner is permitted to access exclusively in isolated test environments.
 *
 * Security Controls & Hardening:
 * 1. No Heuristic Bypasses: Slugs (demo-*, test-*), ID prefixes (str_test_*), creatorId,
 *    and boolean flags alone are NEVER treated as proof of fixture authorization.
 * 2. Isolated Test Setup Only: Fixtures are NOT automatically trusted in every non-production environment.
 *    Access strictly requires an isolated test environment (NODE_ENV === "test" or ENABLE_E2E_TEST_USER === "true").
 * 3. Client & Production Immunity: No external API route or client request can register or modify fixtures.
 *    Attempted registration in production or outside isolated test setup throws a fatal Security Violation error.
 * 4. Exact ID Matching: Evaluates exact string identity. Accidental collisions or substring resemblances are rejected.
 */

const dynamicTrustedFixtureIds = new Set<string>();
let hasInitializedDefaultFixtures = false;

/**
 * Validates whether the current execution context is an authorized isolated test environment.
 * Strictly false in production.
 */
export function isIsolatedTestEnvironment(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    process.env.NODE_ENV === "test" ||
    process.env.ENABLE_E2E_TEST_USER === "true" ||
    process.env.ALLOW_TEST_FIXTURES === "true"
  );
}

/**
 * Checks whether a given store ID belongs to the trusted fixture registry.
 * Returns false unconditionally if not in an authorized isolated test environment.
 */
export function isRegisteredTestFixtureStore(storeId: string): boolean {
  if (!storeId || typeof storeId !== "string") {
    return false;
  }
  if (!isIsolatedTestEnvironment()) {
    return false;
  }
  if (!hasInitializedDefaultFixtures) {
    hasInitializedDefaultFixtures = true;
    initIsolatedTestFixtures();
  }
  return dynamicTrustedFixtureIds.has(storeId.trim());
}

/**
 * Registers an exact store ID as an authorized test fixture.
 * Strictly forbidden in production and outside isolated test environments.
 */
export function registerTestFixtureStore(storeId: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Security Violation: Cannot register test fixture stores in production.");
  }
  if (!isIsolatedTestEnvironment()) {
    throw new Error("Security Violation: Cannot register test fixture stores outside isolated test environments.");
  }
  if (!storeId || typeof storeId !== "string" || storeId.trim() === "") {
    return;
  }
  hasInitializedDefaultFixtures = true;
  dynamicTrustedFixtureIds.add(storeId.trim());
}

/**
 * Removes an exact store ID from the test fixture registry.
 */
export function unregisterTestFixtureStore(storeId: string): void {
  dynamicTrustedFixtureIds.delete(storeId.trim());
}

/**
 * Clears all registered test fixtures from memory.
 */
export function clearDynamicTestFixtures(): void {
  hasInitializedDefaultFixtures = true;
  dynamicTrustedFixtureIds.clear();
}

/**
 * Pre-seeds baseline test fixtures for isolated test suites (e.g. Playwright or unit tests).
 * Operates only within an authorized isolated test environment.
 */
export function initIsolatedTestFixtures(
  fixtureIds: string[] = [
    "str_01",
    "str_07",
    "str_08",
    "str_test_store_101",
    "str_test_fixture_42",
  ]
): void {
  if (!isIsolatedTestEnvironment()) {
    return;
  }
  hasInitializedDefaultFixtures = true;
  for (const id of fixtureIds) {
    if (id && typeof id === "string") {
      dynamicTrustedFixtureIds.add(id.trim());
    }
  }
}

/**
 * Returns a read-only list of all currently registered fixture store IDs.
 */
export function getRegisteredTestFixtureStoreIds(): string[] {
  if (!isIsolatedTestEnvironment()) {
    return [];
  }
  return Array.from(dynamicTrustedFixtureIds);
}

// In authorized test environments, initialize default test fixtures
if (isIsolatedTestEnvironment()) {
  initIsolatedTestFixtures();
}
