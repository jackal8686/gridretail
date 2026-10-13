"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, Palette, Package, Users, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export function QuickActions() {
  const actions = [
    {
      title: "Create Demo Store",
      description: "Start a client storefront wizard with industry templates & products.",
      icon: PlusCircle,
      iconBg: "bg-[#E2F5E9] text-[#176B4D]",
      href: "/stores/new",
    },
    {
      title: "Browse Templates",
      description: "Explore 8 pre-built luxury, minimal and high-tech e-commerce layouts.",
      icon: Palette,
      iconBg: "bg-amber-50 text-amber-700",
      href: "/templates",
    },
    {
      title: "Manage Products",
      description: "Review sample product catalogs, prices, and inventory statuses.",
      icon: Package,
      iconBg: "bg-blue-50 text-blue-700",
      href: "/products",
    },
    {
      title: "View Client Roster",
      description: "Inspect client accounts, assigned stores, and contact details.",
      icon: Users,
      iconBg: "bg-emerald-50 text-emerald-700",
      href: "/clients",
    },
  ];

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle>Quick Actions</CardTitle>
        <span className="text-xs text-[#66736C]">Fast shortcuts</span>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link key={act.title} href={act.href} className="block group">
              <div className="flex items-start gap-3.5 p-3 rounded-lg border border-[#F0F4F1] hover:border-[#CCD5CE] hover:bg-[#FAF9F6] transition-all cursor-pointer">
                <div
                  className={`h-9 w-9 rounded-lg ${act.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#18231E] group-hover:text-[#176B4D] transition-colors">
                      {act.title}
                    </h4>
                    <ArrowRight className="h-3.5 w-3.5 text-[#66736C] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-[#66736C] mt-0.5 line-clamp-2">
                    {act.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
