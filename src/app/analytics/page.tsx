"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle2,
  Share2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Store,
  FileCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { AnalyticsOverview } from "@/types/analytics";

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (selectedTimeframe: "7d" | "30d" | "90d" | "all") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/overview?timeframe=${selectedTimeframe}`);
      if (!res.ok) {
        throw new Error(`Failed to load analytics (HTTP ${res.status})`);
      }
      const data = await res.json();
      setOverview(data.overview);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError((err as Error).message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const summary = overview?.summary;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        title="Multi-Store Analytics"
        description="Monitor proposal conversion velocity, client preview engagement, and pipeline progression across all demonstration storefronts."
        badge={
          <span className="text-xs bg-[#E2F5E9] text-[#176B4D] px-2.5 py-0.5 rounded-full font-medium border border-[#C8E8D5] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Live Conversion Pipeline
          </span>
        }
      >
        <div className="flex items-center gap-2">
          <div className="flex bg-[#F5F2EC] rounded-lg p-1 border border-[#E4DFD5]">
            {(["7d", "30d", "90d", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  timeframe === t
                    ? "bg-[#18231E] text-white shadow-xs"
                    : "text-[#5C7065] hover:text-[#18231E]"
                }`}
              >
                {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : t === "90d" ? "90 Days" : "All Time"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(timeframe)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E4DFD5] shadow-xs hover:border-[#176B4D]/30 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A8C82]">
                Proposal Approval Rate
              </span>
              <div className="p-2 rounded-lg bg-[#E2F5E9] text-[#176B4D]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-serif text-[#18231E]">
                {loading ? "..." : `${summary?.proposalApprovalRate ?? 0}%`}
              </span>
              <span className="text-xs text-[#5C7065]">
                ({summary?.totalProposalsApproved ?? 0} of {summary?.totalShares ?? 0} shared)
              </span>
            </div>
            <p className="mt-2 text-xs text-[#7A8C82]">
              Ratio of client preview links resulting in formal approval
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E4DFD5] shadow-xs hover:border-[#176B4D]/30 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A8C82]">
                Avg Time to Approval
              </span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-serif text-[#18231E]">
                {loading
                  ? "..."
                  : summary?.avgTimeToApprovalHours
                  ? `${summary.avgTimeToApprovalHours}h`
                  : "N/A"}
              </span>
              {summary && summary.medianTimeToApprovalHours > 0 && (
                <span className="text-xs text-[#5C7065]">
                  median: {summary.medianTimeToApprovalHours}h
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-[#7A8C82]">
              Elapsed time from preview link creation to client sign-off
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E4DFD5] shadow-xs hover:border-[#176B4D]/30 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A8C82]">
                Preview Engagements
              </span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-serif text-[#18231E]">
                {loading ? "..." : summary?.totalPreviewViews ?? 0}
              </span>
              <span className="text-xs text-[#5C7065]">
                ({summary?.uniqueVisitorSessions ?? 0} unique sessions)
              </span>
            </div>
            <p className="mt-2 text-xs text-[#7A8C82]">
              Distinct client stakeholder visits on shared demo links
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E4DFD5] shadow-xs hover:border-[#176B4D]/30 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A8C82]">
                Active Demonstrations
              </span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                <Store className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-serif text-[#18231E]">
                {loading ? "..." : summary?.totalStores ?? 0}
              </span>
              <span className="text-xs text-[#5C7065]">
                {summary?.totalShares ?? 0} shared links
              </span>
            </div>
            <p className="mt-2 text-xs text-[#7A8C82]">
              Configured client storefronts tracked across all stages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="bg-white border-[#E4DFD5]">
        <CardHeader>
          <CardTitle className="text-base text-[#18231E]">Store Proposal Conversion Funnel</CardTitle>
          <CardDescription>
            Step-by-step conversion progression from storefront draft creation to production delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                step: "1. Store Created",
                count: summary?.totalStores ?? 0,
                icon: Store,
                color: "bg-slate-50 border-slate-200 text-slate-800",
                subtext: "Initial demo projects",
              },
              {
                step: "2. Preview Shared",
                count: summary?.totalShares ?? 0,
                icon: Share2,
                color: "bg-blue-50 border-blue-200 text-blue-800",
                subtext: "Tokenized client links",
              },
              {
                step: "3. Client Viewed",
                count: summary?.totalPreviewViews ?? 0,
                icon: Eye,
                color: "bg-amber-50 border-amber-200 text-amber-800",
                subtext: `${summary?.uniqueVisitorSessions ?? 0} distinct sessions`,
              },
              {
                step: "4. Feedback Submitted",
                count: summary?.totalFeedbackReceived ?? 0,
                icon: FileCheck,
                color: "bg-purple-50 border-purple-200 text-purple-800",
                subtext: `${summary?.viewToFeedbackRate ?? 0}% view response`,
              },
              {
                step: "5. Approved",
                count: summary?.totalProposalsApproved ?? 0,
                icon: CheckCircle2,
                color: "bg-[#E2F5E9] border-[#C8E8D5] text-[#176B4D]",
                subtext: `${summary?.proposalApprovalRate ?? 0}% pitch conversion`,
              },
            ].map((stage, idx, arr) => {
              const Icon = stage.icon;
              return (
                <div key={stage.step} className="relative flex flex-col">
                  <div className={`p-4 rounded-xl border ${stage.color} flex-1 flex flex-col justify-between`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase">{stage.step}</span>
                      <Icon className="h-4 w-4 opacity-75" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold font-serif">
                        {loading ? "..." : stage.count}
                      </div>
                      <div className="text-xs mt-1 opacity-80">{stage.subtext}</div>
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[#7A8C82]">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Conversion Breakdown */}
        <Card className="bg-white border-[#E4DFD5]">
          <CardHeader>
            <CardTitle className="text-base text-[#18231E]">Conversion by Client Industry</CardTitle>
            <CardDescription>
              Pitch performance and approval rates grouped by commercial sector
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview?.industryBreakdown && overview.industryBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4DFD5] text-[#7A8C82] uppercase tracking-wider">
                      <th className="py-2.5 font-semibold">Industry</th>
                      <th className="py-2.5 font-semibold text-center">Stores</th>
                      <th className="py-2.5 font-semibold text-center">Shared</th>
                      <th className="py-2.5 font-semibold text-center">Approved</th>
                      <th className="py-2.5 font-semibold text-right">Approval Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDE6]">
                    {overview.industryBreakdown.map((ind) => (
                      <tr key={ind.industry} className="hover:bg-[#FAF9F6]">
                        <td className="py-3 font-medium text-[#18231E]">{ind.industry}</td>
                        <td className="py-3 text-center text-[#5C7065]">{ind.storeCount}</td>
                        <td className="py-3 text-center text-[#5C7065]">{ind.shareCount}</td>
                        <td className="py-3 text-center text-[#176B4D] font-medium">{ind.approvedCount}</td>
                        <td className="py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E2F5E9] text-[#176B4D]">
                            {ind.approvalRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#7A8C82]">
                No industry conversion data recorded yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Conversion Breakdown */}
        <Card className="bg-white border-[#E4DFD5]">
          <CardHeader>
            <CardTitle className="text-base text-[#18231E]">Conversion by Storefront Template</CardTitle>
            <CardDescription>
              Which design architectures drive the highest client buy-in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview?.templateBreakdown && overview.templateBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4DFD5] text-[#7A8C82] uppercase tracking-wider">
                      <th className="py-2.5 font-semibold">Template</th>
                      <th className="py-2.5 font-semibold text-center">Stores</th>
                      <th className="py-2.5 font-semibold text-center">Shared</th>
                      <th className="py-2.5 font-semibold text-center">Approved</th>
                      <th className="py-2.5 font-semibold text-right">Approval Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDE6]">
                    {overview.templateBreakdown.map((tpl) => (
                      <tr key={tpl.templateId} className="hover:bg-[#FAF9F6]">
                        <td className="py-3 font-medium text-[#18231E]">{tpl.templateName}</td>
                        <td className="py-3 text-center text-[#5C7065]">{tpl.storeCount}</td>
                        <td className="py-3 text-center text-[#5C7065]">{tpl.shareCount}</td>
                        <td className="py-3 text-center text-[#176B4D] font-medium">{tpl.approvedCount}</td>
                        <td className="py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E2F5E9] text-[#176B4D]">
                            {tpl.approvalRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#7A8C82]">
                No template conversion data recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Timeline & Events Feed */}
      <Card className="bg-white border-[#E4DFD5]">
        <CardHeader>
          <CardTitle className="text-base text-[#18231E]">Recent Analytics Event Stream</CardTitle>
          <CardDescription>
            Audited lifecycle milestones across client preview access, feedback, and approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview?.recentEvents && overview.recentEvents.length > 0 ? (
            <div className="divide-y divide-[#F0EDE6]">
              {overview.recentEvents.map((evt) => (
                <div key={evt.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`p-1.5 rounded-md ${
                        evt.eventType === "proposal_approved"
                          ? "bg-[#E2F5E9] text-[#176B4D]"
                          : evt.eventType === "feedback_submitted"
                          ? "bg-purple-50 text-purple-700"
                          : evt.eventType === "preview_viewed"
                          ? "bg-amber-50 text-amber-700"
                          : evt.eventType === "share_generated"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-[#F5F2EC] text-[#5C7065]"
                      }`}
                    >
                      {evt.eventType === "proposal_approved" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : evt.eventType === "feedback_submitted" ? (
                        <FileCheck className="h-3.5 w-3.5" />
                      ) : evt.eventType === "preview_viewed" ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : evt.eventType === "share_generated" ? (
                        <Share2 className="h-3.5 w-3.5" />
                      ) : (
                        <BarChart3 className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 truncate">
                      <span className="font-semibold text-[#18231E] capitalize">
                        {evt.eventType.replace("_", " ")}
                      </span>
                      {evt.storeName && (
                        <span className="text-[#5C7065]">
                          {" "}
                          for <strong className="text-[#18231E]">{evt.storeName}</strong>
                        </span>
                      )}
                      {evt.clientName && (
                        <span className="text-[#7A8C82]"> ({evt.clientName})</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[#7A8C82] whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#7A8C82]">
              No analytics events recorded for this timeframe yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
