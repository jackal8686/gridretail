export type AnalyticsEventType =
  | "store_created"
  | "store_customized"
  | "share_generated"
  | "preview_viewed"
  | "feedback_submitted"
  | "proposal_approved"
  | "store_exported"
  | "store_deployed";

export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  storeId: string;
  storeName?: string;
  clientId?: string;
  clientName?: string;
  industry?: string;
  templateId?: string;
  userId?: string;
  userEmail?: string;
  visitorSessionId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface MetricSummary {
  totalStores: number;
  totalShares: number;
  totalPreviewViews: number;
  uniqueVisitorSessions: number;
  totalFeedbackReceived: number;
  totalProposalsApproved: number;
  totalExports: number;
  totalDeployments: number;
  proposalApprovalRate: number; // percentage 0-100
  shareToViewRate: number; // percentage 0-100
  viewToFeedbackRate: number; // percentage 0-100
  avgTimeToApprovalHours: number; // 0 if none
  medianTimeToApprovalHours: number; // 0 if none
}

export interface IndustryAnalytics {
  industry: string;
  storeCount: number;
  shareCount: number;
  approvedCount: number;
  approvalRate: number;
}

export interface TemplateAnalytics {
  templateId: string;
  templateName: string;
  storeCount: number;
  shareCount: number;
  approvedCount: number;
  approvalRate: number;
}

export interface ActivityTimelinePoint {
  date: string; // YYYY-MM-DD
  events: number;
  previewViews: number;
  approvals: number;
  shares: number;
}

export interface AnalyticsOverview {
  summary: MetricSummary;
  industryBreakdown: IndustryAnalytics[];
  templateBreakdown: TemplateAnalytics[];
  timeline: ActivityTimelinePoint[];
  recentEvents: AnalyticsEvent[];
  timeframe: {
    startDate?: string;
    endDate?: string;
    filter: "7d" | "30d" | "90d" | "all" | "custom";
  };
}

export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  timeframe?: "7d" | "30d" | "90d" | "all";
  storeId?: string;
  industry?: string;
  userId?: string;
}
