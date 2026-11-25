"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { SessionWrapper } from "@/components/shared/SessionWrapper";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSubdomainHost, setIsSubdomainHost] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname.endsWith(".localhost") && hostname !== "localhost") {
        setIsSubdomainHost(true);
      }
    }
  }, []);

  // If on login screen or rendered standalone storefront preview or pitch presentation, render cleanly without dashboard shell
  const isStandalone =
    pathname === "/login" ||
    pathname.startsWith("/store/") ||
    pathname.startsWith("/preview/") ||
    pathname.endsWith("/present") ||
    isSubdomainHost;

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans">
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

            {/* Platform Footer */}
            <footer className="border-t border-[#E4E9E5] bg-white px-6 py-4 text-xs text-[#66736C] flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-[#18231E]">GridRetail Platform</span> — Internal Website Generation Platform
              </div>
              <div className="flex items-center gap-4">
                <span>Version 1.0.0</span>
                <span>•</span>
                <span className="text-[#176B4D] font-medium">Production Release</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
