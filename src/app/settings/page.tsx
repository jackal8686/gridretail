"use client";

import React, { useState } from "react";
import {
  Sliders,
  Palette,
  User,
  Bell,
  Check,
  Shield,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "account" | "notifications">("general");

  // Local interactive state (demonstrates immediate UI response without claiming fake server persistence)
  const [workspaceName, setWorkspaceName] = useState("GridRetail Global Studio");
  const [primaryBrandColor, setPrimaryBrandColor] = useState("#176B4D");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [reviewAlerts, setReviewAlerts] = useState(true);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const tabs = [
    { id: "general", label: "General", icon: Sliders },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "account", label: "Account Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
  ] as const;

  const handleSaveSimulation = (sectionName: string) => {
    setDemoNotice(`Local UI preference updated for "${sectionName}". (Note: Session persistence will be wired to MongoDB in Phase 2).`);
    setTimeout(() => {
      setDemoNotice(null);
    }, 4500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Platform Settings"
        description="Configure workspace preferences, internal design tokens, account details, and notification thresholds."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5]">
            Workspace Settings
          </span>
        }
      />

      {demoNotice && (
        <div className="p-3.5 rounded-lg bg-[#E2F5E9] border border-[#C8E8D5] text-xs text-[#176B4D] flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>{demoNotice}</span>
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
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
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
                    Workspace identifier, default demo naming conventions, and localization.
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
                    Default Currency & Locale
                  </label>
                  <select
                    defaultValue="USD"
                    className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  >
                    <option value="USD">USD ($) — United States Dollar</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#18231E]">
                    Default Demo Store Expiry
                  </label>
                  <select
                    defaultValue="14"
                    className="w-full max-w-lg rounded-lg border border-[#E4E9E5] px-3.5 py-2 text-sm text-[#18231E] focus:outline-hidden focus:ring-1 focus:ring-[#176B4D]"
                  >
                    <option value="7">7 Days after generation</option>
                    <option value="14">14 Days after generation (Recommended)</option>
                    <option value="30">30 Days after generation</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-[#66736C]">Changes update local session state</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveSimulation("General Workspace")}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save General Settings
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Appearance & Design Tokens</CardTitle>
                  <CardDescription>
                    Customise the dashboard color emphasis and layout density.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-[#18231E] block mb-2">
                    Primary Accent Theme
                  </label>
                  <div className="flex items-center gap-3">
                    {[
                      { name: "Grid Forest (Default)", color: "#176B4D" },
                      { name: "Deep Emerald", color: "#104D38" },
                      { name: "Nordic Sage", color: "#3D604E" },
                      { name: "Classic Navy", color: "#1E3A5F" },
                    ].map((palette) => (
                      <button
                        key={palette.color}
                        type="button"
                        onClick={() => setPrimaryBrandColor(palette.color)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                          primaryBrandColor === palette.color
                            ? "border-[#176B4D] bg-[#E2F5E9] text-[#176B4D]"
                            : "border-[#E4E9E5] bg-white text-[#4F5D56] hover:bg-[#FAF9F6]"
                        )}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: palette.color }}
                        />
                        <span>{palette.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#18231E] block mb-2">
                    Display Density
                  </label>
                  <div className="grid grid-cols-2 max-w-md gap-3">
                    <button
                      type="button"
                      onClick={() => setDensity("comfortable")}
                      className={cn(
                        "p-3 rounded-lg border text-left text-xs transition-all",
                        density === "comfortable"
                          ? "border-[#176B4D] bg-[#E2F5E9] text-[#176B4D]"
                          : "border-[#E4E9E5] bg-white text-[#4F5D56] hover:bg-[#FAF9F6]"
                      )}
                    >
                      <p className="font-semibold">Comfortable</p>
                      <p className="text-[11px] text-[#66736C] mt-0.5">Spacious cards and generous padding</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDensity("compact")}
                      className={cn(
                        "p-3 rounded-lg border text-left text-xs transition-all",
                        density === "compact"
                          ? "border-[#176B4D] bg-[#E2F5E9] text-[#176B4D]"
                          : "border-[#E4E9E5] bg-white text-[#4F5D56] hover:bg-[#FAF9F6]"
                      )}
                    >
                      <p className="font-semibold">Compact</p>
                      <p className="text-[11px] text-[#66736C] mt-0.5">High-density lists and tighter spacing</p>
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-[#66736C]">Preview updates active immediately</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveSimulation("Appearance")}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Apply Appearance
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Account Profile</CardTitle>
                  <CardDescription>
                    Internal operator profile and role privileges.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-[#F0F4F1]">
                  <div className="h-14 w-14 rounded-full bg-[#176B4D] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    AM
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#18231E]">Alex Mercer</h3>
                    <p className="text-xs text-[#66736C]">alex.mercer@gridretail.internal</p>
                    <span className="inline-block mt-1 text-[11px] font-medium text-[#176B4D] bg-[#E2F5E9] px-2 py-0.5 rounded">
                      Role: Retail Solutions Architect
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#66736C] p-3 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#176B4D] shrink-0" />
                  <span>
                    SSO and multi-tenant authentication provider integration will be connected in Phase 2.
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <span className="text-xs text-[#66736C]">Read-only during Phase 1</span>
                <Button variant="outline" size="sm" disabled>
                  Manage SSO Roles
                </Button>
              </CardFooter>
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
                <span className="text-xs text-[#66736C]">Local notification toggles</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveSimulation("Notifications")}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
