"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Store,
  Users,
  Palette,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { MAIN_NAV_ITEMS, NavItem } from "@/constants/navigation";
import { cn } from "@/utils/cn";

const ICON_MAP = {
  LayoutDashboard,
  Store,
  Users,
  Palette,
  Package,
  Settings,
};

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "AM";

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#18231E]/40 backdrop-blur-xs md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-[#E4E9E5] transition-all duration-300 ease-in-out",
          // Desktop collapse widths
          collapsed ? "w-20" : "w-64",
          // Mobile responsive slide-over
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "md:static md:h-screen md:shrink-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#F0F4F1] shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group focus-visible:outline-hidden"
            onClick={onMobileClose}
          >
            {/* Geometric GridRetail Brand Icon */}
            <div className="h-9 w-9 rounded-lg bg-[#176B4D] flex items-center justify-center text-white font-bold shadow-xs transition-transform group-hover:scale-105">
              <span className="text-base tracking-tighter">GR</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-base text-[#18231E] tracking-tight leading-tight">
                  GridRetail
                </span>
                <span className="text-[10px] text-[#66736C] font-medium tracking-wide uppercase">
                  Internal Platform
                </span>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:flex p-1.5 rounded-lg text-[#66736C] hover:text-[#18231E] hover:bg-[#F0F4F1] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 mb-2 text-[11px] font-semibold text-[#66736C] uppercase tracking-wider">
              Workspace
            </div>
          )}

          {MAIN_NAV_ITEMS.map((item: NavItem) => {
            const Icon = ICON_MAP[item.iconName];
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                  isActive
                    ? "bg-[#E2F5E9] text-[#176B4D] font-semibold"
                    : "text-[#4F5D56] hover:bg-[#FAF9F6] hover:text-[#18231E]"
                )}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#176B4D] rounded-r-md" />
                )}

                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-[#176B4D]" : "text-[#66736C] group-hover:text-[#18231E]"
                  )}
                />

                {!collapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                      isActive
                        ? "bg-[#176B4D] text-white"
                        : "bg-[#F0F4F1] text-[#66736C] group-hover:bg-[#E4E9E5]"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User & Environment Card */}
        <div className="p-3 border-t border-[#F0F4F1] bg-[#FAF9F6]/80 shrink-0">
          {!collapsed ? (
            <div className="space-y-3">
              {/* Environment badge */}
              <div className="flex items-center justify-between text-xs px-2 py-1 bg-white rounded-md border border-[#E4E9E5] text-[#66736C]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16804A]" />
                  <span>Phase 2 Platform</span>
                </span>
                <span className="text-[10px] bg-[#E2F5E9] text-[#176B4D] px-1.5 py-0.5 rounded font-mono">
                  v2.0.0
                </span>
              </div>

              {/* User profile capsule */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white border border-[#E4E9E5]">
                <div className="h-8 w-8 rounded-full bg-[#176B4D] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#18231E] truncate">
                    {session?.user?.name || "Alex Mercer"}
                  </p>
                  <p className="text-[11px] text-[#66736C] truncate capitalize">
                    {session?.user?.role === "admin" ? "Internal Admin" : "Retail Employee"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="h-9 w-9 rounded-full bg-[#176B4D] text-white flex items-center justify-center text-xs font-semibold cursor-pointer"
                title={`${session?.user?.name || "Alex Mercer"} (${session?.user?.role || "admin"})`}
              >
                {initials}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
