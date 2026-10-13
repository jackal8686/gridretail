"use client";

import React from "react";
import Link from "next/link";
import { Eye, ArrowUpRight, Store as StoreIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Store } from "@/types";

interface RecentStoresTableProps {
  stores: Store[];
}

export function RecentStoresTable({ stores }: RecentStoresTableProps) {
  return (
    <Card>
      <CardHeader className="py-4">
        <div>
          <CardTitle>Recent Client Stores</CardTitle>
          <p className="text-xs text-[#66736C] mt-0.5">
            Latest storefronts generated for demo presentations
          </p>
        </div>
        <Link href="/stores">
          <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
            View all stores
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#F0F4F1] bg-[#FAF9F6] text-[11px] font-semibold text-[#66736C] uppercase tracking-wider">
                <th className="px-6 py-3.5">Store & Client</th>
                <th className="px-6 py-3.5">Industry</th>
                <th className="px-6 py-3.5">Template</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Last Updated</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F4F1]">
              {stores.slice(0, 5).map((store) => (
                <tr
                  key={store.id}
                  className="hover:bg-[#FAF9F6]/60 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#FAF9F6] border border-[#E4E9E5] text-[#176B4D] flex items-center justify-center shrink-0">
                        <StoreIcon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#18231E] truncate group-hover:text-[#176B4D] transition-colors">
                          {store.name}
                        </p>
                        <p className="text-xs text-[#66736C] truncate">
                          {store.clientName}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-[#4F5D56] bg-[#F0F4F1] px-2.5 py-1 rounded-md">
                      {store.industry}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs font-medium text-[#18231E]">
                    {store.templateName}
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge status={store.status} size="sm" />
                  </td>

                  <td className="px-6 py-4 text-xs text-[#66736C]">
                    {new Date(store.lastUpdated).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link href={`/stores/${store.id}/preview`}>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="h-3.5 w-3.5 text-[#176B4D]" />}
                      >
                        Preview
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
