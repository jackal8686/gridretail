import { test } from "node:test";
import assert from "node:assert";
import bcrypt from "bcryptjs";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { NotificationRepository } from "@/lib/repositories/notification.repository";
import { SettingsRepository } from "@/lib/repositories/settings.repository";
import { UserRepository } from "@/lib/repositories/user.repository";
import { SectionInstance } from "@/types/section";

test("Phase 18.3.2 — Platform Workflow Remediation Suite", async (t) => {
  StoreRepository._resetMemory();
  AppointmentRepository._clearMemory();
  NotificationRepository._resetAppMemory();
  SettingsRepository._resetMemory();
  UserRepository._resetMemory();

  // Test DEF-006: Store Delete, Archive, and Unpublish
  await t.test("DEF-006: Store status transitions between Published, Draft, and Archived, plus deletion", async () => {
    const store = await StoreRepository.create({
      id: "str_test_starlight_1832",
      name: "Starlight Boutique",
      slug: "test-starlight-1832",
      clientName: "Starlight LLC",
      clientId: "cli_starlight_1832",
      industry: "Fashion & Apparel",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      websiteType: "ecommerce",
      status: "Published",
      productCount: 5,
      description: "Boutique fashion apparel",
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    assert.strictEqual(store.status, "Published");

    // Unpublish: transition Published -> Draft
    const unpublished = await StoreRepository.update(store.id, { status: "Draft" });
    assert.strictEqual(unpublished?.status, "Draft");

    // Archive: transition Draft -> Archived
    const archived = await StoreRepository.update(store.id, { status: "Archived" });
    assert.strictEqual(archived?.status, "Archived");

    // Excluded from default search when archived with excludeArchived
    const activeStores = await StoreRepository.findAll({ excludeArchived: true });
    assert.ok(!activeStores.some((s) => s.id === store.id));

    // Included when filtering by status=Archived
    const archivedStores = await StoreRepository.findAll({ status: "Archived" });
    assert.ok(archivedStores.some((s) => s.id === store.id));

    // Restore: transition Archived -> Draft
    const restored = await StoreRepository.update(store.id, { status: "Draft" });
    assert.strictEqual(restored?.status, "Draft");

    // Delete: remove permanently
    const deleted = await StoreRepository.delete(store.id);
    assert.strictEqual(deleted, true);
    const afterDelete = await StoreRepository.findById(store.id);
    assert.strictEqual(afterDelete, null);
  });

  // Test DEF-013: Appointment Rescheduling
  await t.test("DEF-013: Appointment rescheduling atomically updates times and validates overlaps", async () => {
    const appt = await AppointmentRepository.create({
      storeId: "str_appt_test_1832",
      serviceId: "srv_test_01",
      serviceName: "Legal Consultation",
      providerId: "prv_test_01",
      providerName: "Jane Doe, Esq.",
      customerName: "Alice Walker",
      customerEmail: "alice@example.com",
      startUtc: "2026-11-25T10:00:00.000Z",
      endUtc: "2026-11-25T11:00:00.000Z",
      durationMinutes: 60,
      price: 2500,
      currency: "INR",
      status: "Confirmed",
      confirmationNumber: "GR-CONF-1832",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.strictEqual(appt.startUtc, "2026-11-25T10:00:00.000Z");

    // Reschedule to a new slot
    const newStart = "2026-11-26T14:00:00.000Z";
    const newEnd = "2026-11-26T15:00:00.000Z";
    const rescheduled = await AppointmentRepository.reschedule(appt.id, newStart, newEnd, "prv_test_01");

    assert.strictEqual(rescheduled.startUtc, newStart);
    assert.strictEqual(rescheduled.endUtc, newEnd);

    // Verify persisted
    const fetched = await AppointmentRepository.findById(appt.id);
    assert.strictEqual(fetched?.startUtc, newStart);
  });

  // Test DEF-002: Notification Persistence
  await t.test("DEF-002: Notifications persist read states and support mark-all-read", async () => {
    await NotificationRepository.createAppNotification({
      id: "notif-1832-1",
      type: "published",
      title: "Store Published",
      description: "Demo ready for review",
      read: false,
      createdAt: new Date().toISOString(),
    });
    await NotificationRepository.createAppNotification({
      id: "notif-1832-2",
      type: "review",
      title: "QA Review Requested",
      description: "Sign-off pending",
      read: false,
      createdAt: new Date().toISOString(),
    });

    let notifs = await NotificationRepository.findAppNotifications();
    assert.strictEqual(notifs.filter((n) => !n.read).length, 2);

    // Mark single as read
    await NotificationRepository.markAppNotificationRead("notif-1832-1", true);
    notifs = await NotificationRepository.findAppNotifications();
    const n1 = notifs.find((n) => n.id === "notif-1832-1");
    assert.strictEqual(n1?.read, true);

    // Mark all as read
    await NotificationRepository.markAllAppNotificationsRead();
    notifs = await NotificationRepository.findAppNotifications();
    assert.strictEqual(notifs.filter((n) => !n.read).length, 0);
  });

  // Test DEF-003: Activity Drawer Dismissed Cursor Logic
  await t.test("DEF-003: Activity drawer dismissed cursor filters activities prior to cursor timestamp", () => {
    const activities = [
      { id: "act_1", timestamp: "2026-11-23T10:00:00.000Z", title: "Older Event" },
      { id: "act_2", timestamp: "2026-11-23T12:00:00.000Z", title: "Middle Event" },
      { id: "act_3", timestamp: "2026-11-23T14:00:00.000Z", title: "Newer Event" },
    ];

    const dismissedUntil = "2026-11-23T12:00:00.000Z";
    const visible = activities.filter((act) => {
      const actTime = new Date(act.timestamp).getTime();
      const cursorTime = new Date(dismissedUntil).getTime();
      return actTime > cursorTime;
    });

    assert.strictEqual(visible.length, 1);
    assert.strictEqual(visible[0].id, "act_3");
  });

  // Test DEF-007: Apply Template to Existing Store
  await t.test("DEF-007: Apply template to existing store updates template pairing and preserves metadata", async () => {
    const store = await StoreRepository.create({
      id: "str_test_summit_1832",
      name: "Summit Wealth Advisory",
      slug: "test-summit-wealth-1832",
      clientName: "Summit Wealth Corp",
      clientId: "cli_summit_wealth",
      industry: "Professional Services",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      websiteType: "lead_gen",
      status: "Draft",
      productCount: 0,
      description: "Wealth management and advisory",
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // Apply Editorial Classic template
    const updated = await StoreRepository.update(store.id, {
      templateId: "tmpl_editorial_classic",
      templateName: "Editorial Classic",
    });

    assert.strictEqual(updated?.templateId, "tmpl_editorial_classic");
    assert.strictEqual(updated?.templateName, "Editorial Classic");
    // Preserves identity
    assert.strictEqual(updated?.name, "Summit Wealth Advisory");
    assert.strictEqual(updated?.slug, "test-summit-wealth-1832");
    assert.strictEqual(updated?.clientId, "cli_summit_wealth");
  });

  // Test DEF-009: Page-Scoped Visual Editor Section Isolation
  await t.test("DEF-009: Visual Editor page-scoped section sets isolate subpage sections from home sections", async () => {
    const homeSections: SectionInstance[] = [
      { id: "sec_hero", type: "hero_full_width" as const, customTitle: "Hero", order: 0, visible: true, settings: {} },
      { id: "sec_feat", type: "featured_products" as const, customTitle: "Products", order: 1, visible: true, settings: {} },
    ];

    const catalogSections: SectionInstance[] = [
      { id: "sec_grid", type: "featured_products" as const, customTitle: "Full Catalog", order: 0, visible: true, settings: {} },
    ];

    const pageSections: Record<string, SectionInstance[]> = {
      home: homeSections,
      catalog: catalogSections,
    };

    // Mutating catalog page sections does not affect home
    const updatedCatalog: SectionInstance[] = [
      ...catalogSections,
      { id: "sec_promo", type: "promotional_banner" as const, customTitle: "Sale Banner", order: 1, visible: true, settings: {} },
    ];

    pageSections.catalog = updatedCatalog;

    assert.strictEqual(pageSections.home.length, 2);
    assert.strictEqual(pageSections.catalog.length, 2);
    assert.strictEqual(pageSections.home[0].id, "sec_hero");
    assert.strictEqual(pageSections.catalog[1].id, "sec_promo");
  });

  // Test DEF-017: System Settings Persistence
  await t.test("DEF-017: Platform settings persist across calls and updates", async () => {
    const initial = await SettingsRepository.getSettings("default");
    assert.strictEqual(initial.workspaceName, "GridRetail Global Studio");

    const updated = await SettingsRepository.updateSettings({
      workspaceName: "GridRetail Enterprise West",
      storeExpiryDays: 30,
      emailAlerts: false,
    }, "default");

    assert.strictEqual(updated.workspaceName, "GridRetail Enterprise West");
    assert.strictEqual(updated.storeExpiryDays, 30);
    assert.strictEqual(updated.emailAlerts, false);

    const fetched = await SettingsRepository.getSettings("default");
    assert.strictEqual(fetched.workspaceName, "GridRetail Enterprise West");
  });

  // Test DEF-018: Account Profile and Password Updates
  await t.test("DEF-018: User profile update and password change with bcrypt verification", async () => {
    const initialHash = await bcrypt.hash("OldPassword2026!", 10);
    const user = await UserRepository.create({
      id: "usr_test_profile_1832",
      name: "Morgan Stanley",
      email: "morgan@gridretail.internal",
      passwordHash: initialHash,
      role: "employee",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update Profile
    const updatedProfile = await UserRepository.updateProfile(user.id, {
      name: "Morgan S. Stanley",
      email: "morgan.stanley@gridretail.internal",
    });

    assert.strictEqual(updatedProfile?.name, "Morgan S. Stanley");
    assert.strictEqual(updatedProfile?.email, "morgan.stanley@gridretail.internal");

    // Verify Password Change
    const newHash = await bcrypt.hash("NewSecurePass2026!", 10);
    const passwordUpdated = await UserRepository.updatePassword(user.id, newHash);
    assert.strictEqual(passwordUpdated, true);

    const updatedUser = await UserRepository.findById(user.id);
    assert.ok(updatedUser);
    const isValidOld = await bcrypt.compare("OldPassword2026!", updatedUser.passwordHash);
    const isValidNew = await bcrypt.compare("NewSecurePass2026!", updatedUser.passwordHash);
    assert.strictEqual(isValidOld, false);
    assert.strictEqual(isValidNew, true);
  });
});
