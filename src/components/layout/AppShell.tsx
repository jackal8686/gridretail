"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { DemoBanner } from "@/components/shared/DemoBanner";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If on login screen or rendered standalone storefront preview, render cleanly without dashboard shell
  const isStandalone =
    pathname === "/login" ||
    pathname.startsWith("/store/") ||
    pathname.startsWith("/preview/");

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
      {/* Top Demo Notification Banner */}
      <DemoBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Left App Sidebar */}
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Content Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Application Header */}
          <AppHeader
            onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          />

          {/* Main Workspace Body */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
            {children}
          </main>

          {/* Minimal Platform Footer */}
          <footer className="border-t border-[#E4E9E5] bg-white px-6 py-4 text-xs text-[#66736C] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-[#18231E]">GridRetail Platform</span> — Internal Retail Generation Engine
            </div>
            <div className="flex items-center gap-4">
              <span>Phase 2 Database & Engine</span>
              <span>•</span>
              <span className="text-[#176B4D] font-medium">Design System v1.0</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
