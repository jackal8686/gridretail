"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  Bell,
  Search,
  CheckCircle2,
  Clock,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { MAIN_NAV_ITEMS } from "@/constants/navigation";
import { PlaceholderModal } from "@/components/shared/PlaceholderModal";

interface AppHeaderProps {
  onMobileMenuToggle: () => void;
}

export function AppHeader({ onMobileMenuToggle }: AppHeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [placeholderOpen, setPlaceholderOpen] = useState(false);
  const [placeholderFeature, setPlaceholderFeature] = useState("");

  const currentNav = MAIN_NAV_ITEMS.find(
    (item) => item.href === pathname || (item.href !== "/dashboard" && pathname.startsWith(item.href))
  ) || { title: "Dashboard", description: "Overview" };

  const userName = session?.user?.name || "Alex Mercer";
  const userEmail = session?.user?.email || "alex.mercer@gridretail.internal";
  const userRole = session?.user?.role || "admin";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AM";

  const handleOpenPlaceholder = (feature: string) => {
    setPlaceholderFeature(feature);
    setPlaceholderOpen(true);
    setProfileOpen(false);
    setNotificationsOpen(false);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E4E9E5] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
        {/* Left: Mobile Toggle & Breadcrumb / Page Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-lg text-[#66736C] hover:text-[#18231E] hover:bg-[#F0F4F1] focus-visible:outline-hidden"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#66736C]">
              <span>GridRetail</span>
              <span>/</span>
              <span className="text-[#18231E] font-medium">{currentNav.title}</span>
            </div>
            <h1 className="text-sm font-semibold text-[#18231E] hidden sm:block">
              {currentNav.title}
            </h1>
          </div>
        </div>

        {/* Right: Search Affordance, Notification Bell, User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Button Affordance */}
          <button
            type="button"
            onClick={() => handleOpenPlaceholder("Global Spotlight Search")}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#66736C] bg-[#FAF9F6] border border-[#E4E9E5] rounded-lg hover:border-[#CCD5CE] hover:text-[#18231E] transition-colors"
            title="Search stores, clients, templates..."
          >
            <Search className="h-3.5 w-3.5 text-[#66736C]" />
            <span className="hidden md:inline">Search platform...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-white border border-[#E4E9E5] rounded text-[#66736C]">
              ⌘K
            </kbd>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 rounded-lg text-[#66736C] hover:text-[#18231E] hover:bg-[#F0F4F1] transition-colors"
              aria-label="View notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#16804A] ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#E4E9E5] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-[#F0F4F1] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#18231E]">Notifications</span>
                  <span className="text-[10px] bg-[#E2F5E9] text-[#176B4D] px-2 py-0.5 rounded-full font-medium">
                    2 New
                  </span>
                </div>
                <div className="divide-y divide-[#F0F4F1] max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-[#FAF9F6] transition-colors text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[#16804A] font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Demo Published</span>
                    </div>
                    <p className="text-[#4F5D56]">Aura Minimalist Living demo storefront is live for review.</p>
                    <span className="text-[10px] text-[#909D96]">2 hours ago</span>
                  </div>
                  <div className="px-4 py-3 hover:bg-[#FAF9F6] transition-colors text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[#B7791F] font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Review Requested</span>
                    </div>
                    <p className="text-[#4F5D56]">Botanica Apothecary awaiting internal QA sign-off.</p>
                    <span className="text-[10px] text-[#909D96]">Yesterday</span>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-[#F0F4F1] text-center">
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholder("Activity Audit Log")}
                    className="text-[11px] text-[#176B4D] hover:underline font-medium"
                  >
                    View all platform activity
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#F0F4F1] transition-colors cursor-pointer"
              aria-label="User profile menu"
            >
              <div className="h-8 w-8 rounded-full bg-[#176B4D] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {initials}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#66736C] hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E4E9E5] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                <div className="px-4 py-2.5 border-b border-[#F0F4F1]">
                  <p className="font-semibold text-[#18231E]">{userName}</p>
                  <p className="text-[#66736C] text-[11px] truncate">{userEmail}</p>
                  <span className="mt-1.5 inline-block text-[10px] bg-[#E2F5E9] text-[#176B4D] px-2 py-0.5 rounded font-medium capitalize">
                    {userRole === "admin" ? "Internal Admin" : "Employee"}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => handleOpenPlaceholder("User Profile Editing")}
                    className="w-full text-left px-4 py-2 text-[#4F5D56] hover:bg-[#FAF9F6] hover:text-[#18231E] flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Account Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-4 py-2 text-[#C43D3D] hover:bg-[#FDEAEA] flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <PlaceholderModal
        isOpen={placeholderOpen}
        onClose={() => setPlaceholderOpen(false)}
        featureName={placeholderFeature}
      />
    </>
  );
}
