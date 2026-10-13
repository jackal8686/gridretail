import React from "react";
import { Store, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { DashboardMetrics } from "@/types";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      title: "Total Stores",
      value: metrics.totalStores,
      subtitle: "Across 6 active clients",
      icon: Store,
      iconColor: "text-[#176B4D]",
      iconBg: "bg-[#E2F5E9]",
      delta: "+2 this month",
    },
    {
      title: "In Progress",
      value: metrics.inProgress,
      subtitle: "Catalog & theme drafting",
      icon: Clock,
      iconColor: "text-[#176B4D]",
      iconBg: "bg-[#E2F5E9]",
      delta: "2 stores editing",
    },
    {
      title: "Pending Review",
      value: metrics.pendingReview,
      subtitle: "Awaiting client sign-off",
      icon: AlertCircle,
      iconColor: "text-[#B7791F]",
      iconBg: "bg-[#FEF7E6]",
      delta: "1 demo ready",
    },
    {
      title: "Published Stores",
      value: metrics.published,
      subtitle: "Live demo environments",
      icon: CheckCircle2,
      iconColor: "text-[#16804A]",
      iconBg: "bg-[#EAF7EE]",
      delta: "100% SLA uptime",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover:border-[#CCD5CE] transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#66736C] uppercase tracking-wider">
                  {card.title}
                </span>
                <div
                  className={`h-9 w-9 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-[#18231E] tracking-tight">
                  {card.value}
                </span>
                <span className="text-[11px] font-medium text-[#16804A] bg-[#EAF7EE] px-2 py-0.5 rounded-full">
                  {card.delta}
                </span>
              </div>

              <p className="mt-1 text-xs text-[#66736C]">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
