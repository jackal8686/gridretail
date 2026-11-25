"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Sliders,
  User as UserIcon,
  Bell,
  Check,
  Shield,
  Save,
  Users,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { SafeUser } from "@/types";
import { cn } from "@/utils/cn";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"general" | "account" | "notifications" | "team">("general");

  // Local interactive state with server & localStorage persistence
  const [workspaceName, setWorkspaceName] = useState("GridRetail Global Studio");
  const [storeExpiry, setStoreExpiry] = useState("14");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [reviewAlerts, setReviewAlerts] = useState(true);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Profile and Password State
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Admin Team Management State
  const [teamUsers, setTeamUsers] = useState<SafeUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"employee" | "admin">("employee");
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const tabs = [
    { id: "general", label: "General", icon: Sliders },
    { id: "account", label: "Account Profile", icon: UserIcon },
    { id: "team", label: "Team & Security", icon: Users },
    { id: "notifications", label: "Notifications", icon: Bell },
  ] as const;

  const showNotification = (message: string) => {
    setFeedbackNotice(message);
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 4500);
  };

  // Sync profile fields from session on load
  useEffect(() => {
    if (session?.user) {
      if (!profileName) setProfileName(session.user.name || "");
      if (!profileEmail) setProfileEmail(session.user.email || "");
    }
  }, [session, profileName, profileEmail]);

  // Load persisted general settings on mount from API with localStorage fallback
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setWorkspaceName(data.settings.workspaceName || "GridRetail Global Studio");
            setStoreExpiry(String(data.settings.storeExpiryDays || 14));
            setEmailAlerts(data.settings.emailAlerts !== false);
            setReviewAlerts(data.settings.reviewAlerts !== false);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch settings from API:", err);
      }

      if (typeof window !== "undefined") {
        const savedName = localStorage.getItem("gridretail_workspace_name");
        if (savedName) setWorkspaceName(savedName);
        const savedExpiry = localStorage.getItem("gridretail_store_expiry");
        if (savedExpiry) setStoreExpiry(savedExpiry);
        const savedEmailAlerts = localStorage.getItem("gridretail_email_alerts");
        if (savedEmailAlerts !== null) setEmailAlerts(savedEmailAlerts === "true");
        const savedReviewAlerts = localStorage.getItem("gridretail_review_alerts");
        if (savedReviewAlerts !== null) setReviewAlerts(savedReviewAlerts === "true");
      }
    }
    loadSettings();
  }, []);

  const handleSaveGeneral = async () => {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceName,
          storeExpiryDays: parseInt(storeExpiry, 10) || 14,
        }),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("gridretail_workspace_name", workspaceName);
        localStorage.setItem("gridretail_store_expiry", storeExpiry);
      }
      showNotification("Workspace settings saved to server successfully.");
    } catch {
      showNotification("Failed to save workspace settings.");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailAlerts,
          reviewAlerts,
        }),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("gridretail_email_alerts", String(emailAlerts));
        localStorage.setItem("gridretail_review_alerts", String(reviewAlerts));
      }
      showNotification("Notification preferences saved to server successfully.");
    } catch {
      showNotification("Failed to save notifications.");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to update profile.");
        return;
      }
      setProfileMessage("Profile updated successfully.");
      showNotification("Account profile updated successfully.");
    } catch {
      setProfileError("Network error while updating profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      setIsUpdatingPassword(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password.");
        return;
      }
      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showNotification("Account password changed successfully.");
    } catch {
      setPasswordError("Network error while updating password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    if (activeTab === "team" && isAdmin) {
      loadTeamUsers();
    }
  }, [activeTab, isAdmin]);

  const loadTeamUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setTeamUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleUserStatus = async (user: SafeUser) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      if (res.ok) {
        setTeamUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
        );
        showNotification(`Account status for ${user.name} changed to ${nextStatus}.`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update account status.");
      }
    } catch {
      alert("Network error updating status.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    setIsAddingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeamUsers((prev) => [data.user, ...prev]);
        setAddUserModalOpen(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        showNotification(`Employee account created for ${data.user.email}.`);
      } else {
        const err = await res.json();
        setAddUserError(err.error || "Failed to create user account.");
      }
    } catch {
      setAddUserError("Network error while creating account.");
    } finally {
      setIsAddingUser(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Platform Settings"
        description="Configure workspace preferences, internal design tokens, account details, team permissions, and notification thresholds."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            Workspace Settings
          </span>
        }
      />

      {feedbackNotice && (
        <div className="p-3.5 rounded-lg bg-[#E2F5E9] border border-[#C8E8D5] text-xs text-[#176B4D] flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-60 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer",
                  isActive
                    ? "bg-white text-[#176B4D] border border-[#E4E9E5] shadow-xs font-semibold"
                    : "text-[#66736C] hover:bg-[#F0F4F1] hover:text-[#18231E]"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", isActive ? "text-[#176B4D]" : "text-[#66736C]")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 space-y-6">
          {activeTab === "general" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>General Workspace Settings</CardTitle>
                  <CardDescription>
                    Workstation identifier and default demo store parameters (Stored in local browser workspace storage).
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  />
                  <p className="text-[11px] text-[#66736C]">
                    Displayed on client presentation headers and generated demo URLs.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Default Demo Store Expiry
                  </label>
                  <select
                    value={storeExpiry}
                    onChange={(e) => setStoreExpiry(e.target.value)}
                    className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  >
                    <option value="7">7 Days after generation</option>
                    <option value="14">14 Days after generation (Recommended)</option>
                    <option value="30">30 Days after generation</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-[#66736C]">Saved to local browser workspace storage</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveGeneral}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save General Settings
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === "account" && (
            <div className="space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Account Profile</CardTitle>
                    <CardDescription>
                      Update your operator profile details, display name, and contact email.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4 pb-4 border-b border-[#F0F4F1]">
                    <div className="h-14 w-14 rounded-full bg-[#176B4D] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                      {profileName ? profileName.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#18231E]">
                        {profileName || session?.user?.name || "Alex Mercer"}
                      </h3>
                      <p className="text-xs text-[#66736C]">
                        {profileEmail || session?.user?.email || "alex.mercer@gridretail.internal"}
                      </p>
                      <span className="inline-block mt-1 text-[11px] font-medium text-[#176B4D] bg-[#E2F5E9] px-2 py-0.5 rounded capitalize">
                        Role: {session?.user?.role || "admin"}
                      </span>
                    </div>
                  </div>

                  {profileMessage && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                      {profileMessage}
                    </div>
                  )}
                  {profileError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                      {profileError}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#18231E]">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          required
                          className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#18231E]">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          required
                          className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isUpdatingProfile}
                        className="bg-[#176B4D] text-white hover:bg-[#12533B]"
                      >
                        {isUpdatingProfile ? "Saving Profile..." : "Save Profile Changes"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Password Change Card */}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your account password. Requires your current password for security verification.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passwordMessage && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                      {passwordMessage}
                    </div>
                  )}
                  {passwordError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#18231E]">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Enter your current password"
                        className="w-full max-w-md rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#18231E]">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Min 8 characters"
                          className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#18231E]">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Confirm new password"
                          className="w-full rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isUpdatingPassword}
                        className="bg-[#176B4D] text-white hover:bg-[#12533B]"
                      >
                        {isUpdatingPassword ? "Updating Password..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "team" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Team & Account Access</CardTitle>
                  <CardDescription>
                    Administrator-managed employee accounts and authorization controls.
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setAddUserModalOpen(true)}
                    leftIcon={<UserPlus className="h-4 w-4" />}
                  >
                    Add Employee
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!isAdmin ? (
                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E4E9E5] text-xs text-[#66736C] flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#B7791F]" />
                    <span>
                      User account provisioning is restricted to workspace administrators. Contact an administrator to adjust team roles.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isLoadingUsers ? (
                      <p className="text-xs text-[#66736C] py-4">Loading team roster...</p>
                    ) : teamUsers.length === 0 ? (
                      <p className="text-xs text-[#66736C] py-4">No employee records found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#F0F4F1] text-[11px] font-semibold text-[#66736C] uppercase">
                              <th className="py-2.5 px-3">Name & Email</th>
                              <th className="py-2.5 px-3">Role</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Created</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F0F4F1]">
                            {teamUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-[#FAF9F6]">
                                <td className="py-3 px-3">
                                  <p className="font-semibold text-[#18231E]">{u.name}</p>
                                  <p className="text-[#66736C]">{u.email}</p>
                                </td>
                                <td className="py-3 px-3 capitalize">
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#F0F4F1] font-medium text-[#4F5D56]">
                                    {u.role}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                                      u.status === "active"
                                        ? "bg-[#EAF7EE] text-[#16804A]"
                                        : "bg-[#FDEAEA] text-[#C43D3D]"
                                    )}
                                  >
                                    {u.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[#66736C]">
                                  {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u)}
                                    className="text-[11px] text-[#176B4D] hover:underline font-medium cursor-pointer"
                                  >
                                    {u.status === "active" ? "Disable" : "Reactivate"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Configure alerts for demo publishing and client review requests.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#F0F4F1] hover:bg-[#FAF9F6] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#CCD5CE] text-[#176B4D] focus:ring-[#176B4D]"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#18231E]">
                      Storefront Generation Alerts
                    </p>
                    <p className="text-[11px] text-[#66736C]">
                      Notify when a new demo store completes HTML/CSS rendering.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-[#F0F4F1] hover:bg-[#FAF9F6] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewAlerts}
                    onChange={(e) => setReviewAlerts(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#CCD5CE] text-[#176B4D] focus:ring-[#176B4D]"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#18231E]">
                      Client Review Status Updates
                    </p>
                    <p className="text-[11px] text-[#66736C]">
                      Receive updates when a client views or signs off on a preview link.
                    </p>
                  </div>
                </label>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-[#66736C]">Saved to local browser notification preferences</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveNotifications}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        title="Create Employee Account"
        description="Provision authorized credentials for retail team members."
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          {addUserError && (
            <div className="p-2.5 rounded-lg bg-[#FDEAEA] border border-[#F7BCBC] text-xs text-[#C43D3D] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{addUserError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. David Kim"
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1">Corporate Email</label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="david.kim@gridretail.internal"
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1">Temporary Password</label>
            <input
              type="password"
              required
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231E] mb-1">Platform Role</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as "employee" | "admin")}
              className="w-full rounded-lg border border-[#E4E9E5] px-3 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
            >
              <option value="employee">Employee (Store generation & catalog preview)</option>
              <option value="admin">Administrator (Full team management & settings)</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#F0F4F1]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isAddingUser}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
