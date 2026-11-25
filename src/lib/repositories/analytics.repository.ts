import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import {
  AnalyticsEvent,
  AnalyticsFilter,
  AnalyticsOverview,
  ActivityTimelinePoint,
  IndustryAnalytics,
  TemplateAnalytics,
} from "@/types/analytics";

let memoryEvents: AnalyticsEvent[] = [];

export const AnalyticsRepository = {
  async recordEvent(
    data: Omit<AnalyticsEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }
  ): Promise<AnalyticsEvent> {
    const fullEvent: AnalyticsEvent = {
      ...data,
      id: data.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // Idempotency check if idempotencyKey provided
    if (fullEvent.idempotencyKey) {
      const existingInMemory = memoryEvents.find(
        (e) => e.idempotencyKey === fullEvent.idempotencyKey
      );
      if (existingInMemory) {
        return existingInMemory;
      }
    }

    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot record analytics event: database is unavailable in production.");
    }
    if (db) {
      try {
        if (fullEvent.idempotencyKey) {
          const existingInDb = await db
            .collection<AnalyticsEvent>("analytics_events")
            .findOne({ idempotencyKey: fullEvent.idempotencyKey });
          if (existingInDb) {
            return existingInDb;
          }
        }
        await db.collection<AnalyticsEvent>("analytics_events").insertOne({ ...fullEvent });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in AnalyticsRepository.recordEvent:", err);
      }
    }

    memoryEvents.push(fullEvent);
    return fullEvent;
  },

  async findEvents(filter?: AnalyticsFilter): Promise<AnalyticsEvent[]> {
    const db = await getDb();
    let events: AnalyticsEvent[] = [];

    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.storeId) query.storeId = filter.storeId;
        if (filter?.industry) query.industry = filter.industry;
        if (filter?.userId) query.userId = filter.userId;

        if (filter?.startDate || filter?.endDate) {
          query.timestamp = {};
          if (filter.startDate) (query.timestamp as Record<string, string>).$gte = filter.startDate;
          if (filter.endDate) (query.timestamp as Record<string, string>).$lte = filter.endDate;
        }

        events = await db
          .collection<AnalyticsEvent>("analytics_events")
          .find(query)
          .sort({ timestamp: -1 })
          .toArray();
      } catch (err) {
        console.warn("MongoDB query error in AnalyticsRepository.findEvents:", err);
        events = [];
      }
    }

    if (events.length === 0 && memoryEvents.length > 0) {
      events = [...memoryEvents];
      if (filter?.storeId) {
        events = events.filter((e) => e.storeId === filter.storeId);
      }
      if (filter?.industry) {
        events = events.filter((e) => e.industry === filter.industry);
      }
      if (filter?.userId) {
        events = events.filter((e) => e.userId === filter.userId);
      }
      if (filter?.startDate) {
        const start = new Date(filter.startDate).getTime();
        events = events.filter((e) => new Date(e.timestamp).getTime() >= start);
      }
      if (filter?.endDate) {
        const end = new Date(filter.endDate).getTime();
        events = events.filter((e) => new Date(e.timestamp).getTime() <= end);
      }
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return events;
  },

  async getOverview(filter?: AnalyticsFilter): Promise<AnalyticsOverview> {
    const events = await this.findEvents(filter);

    const storeIds = new Set<string>();
    let totalShares = 0;
    let totalPreviewViews = 0;
    const visitorSessions = new Set<string>();
    let totalFeedbackReceived = 0;
    let totalProposalsApproved = 0;
    let totalExports = 0;
    let totalDeployments = 0;

    // For time-to-approval calculation: map storeId -> { firstShare: number, firstApproval: number }
    const storeTiming: Record<string, { firstShare?: number; firstApproval?: number }> = {};

    // Grouping accumulators
    const industryMap: Record<string, { stores: Set<string>; shares: number; approvals: number }> = {};
    const templateMap: Record<string, { stores: Set<string>; shares: number; approvals: number; name: string }> = {};
    const timelineMap: Record<string, { events: number; views: number; approvals: number; shares: number }> = {};

    for (const evt of events) {
      if (evt.storeId) storeIds.add(evt.storeId);

      const industryKey = evt.industry || "General";
      if (!industryMap[industryKey]) {
        industryMap[industryKey] = { stores: new Set(), shares: 0, approvals: 0 };
      }
      if (evt.storeId) industryMap[industryKey].stores.add(evt.storeId);

      const templateKey = evt.templateId || "default";
      if (!templateMap[templateKey]) {
        templateMap[templateKey] = {
          stores: new Set(),
          shares: 0,
          approvals: 0,
          name: (evt.metadata?.templateName as string) || templateKey,
        };
      }
      if (evt.storeId) templateMap[templateKey].stores.add(evt.storeId);

      // Date bucket (YYYY-MM-DD)
      const dateKey = evt.timestamp ? evt.timestamp.substring(0, 10) : new Date().toISOString().substring(0, 10);
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { events: 0, views: 0, approvals: 0, shares: 0 };
      }
      timelineMap[dateKey].events += 1;

      const evtTime = new Date(evt.timestamp).getTime();

      switch (evt.eventType) {
        case "share_generated":
          totalShares += 1;
          industryMap[industryKey].shares += 1;
          templateMap[templateKey].shares += 1;
          timelineMap[dateKey].shares += 1;
          if (evt.storeId) {
            if (!storeTiming[evt.storeId]) storeTiming[evt.storeId] = {};
            if (!storeTiming[evt.storeId].firstShare || evtTime < storeTiming[evt.storeId].firstShare!) {
              storeTiming[evt.storeId].firstShare = evtTime;
            }
          }
          break;
        case "preview_viewed":
          totalPreviewViews += 1;
          timelineMap[dateKey].views += 1;
          if (evt.visitorSessionId) {
            visitorSessions.add(evt.visitorSessionId);
          } else {
            visitorSessions.add(evt.id);
          }
          break;
        case "feedback_submitted":
          totalFeedbackReceived += 1;
          break;
        case "proposal_approved":
          totalProposalsApproved += 1;
          industryMap[industryKey].approvals += 1;
          templateMap[templateKey].approvals += 1;
          timelineMap[dateKey].approvals += 1;
          if (evt.storeId) {
            if (!storeTiming[evt.storeId]) storeTiming[evt.storeId] = {};
            if (!storeTiming[evt.storeId].firstApproval || evtTime < storeTiming[evt.storeId].firstApproval!) {
              storeTiming[evt.storeId].firstApproval = evtTime;
            }
          }
          break;
        case "store_exported":
          totalExports += 1;
          break;
        case "store_deployed":
          totalDeployments += 1;
          break;
      }
    }

    // Calculate conversion rates safely with zero-denominator guards
    const proposalApprovalRate =
      totalShares > 0 ? Number(((totalProposalsApproved / totalShares) * 100).toFixed(1)) : 0;
    const shareToViewRate =
      totalShares > 0 ? Number(((totalPreviewViews / totalShares) * 100).toFixed(1)) : 0;
    const viewToFeedbackRate =
      totalPreviewViews > 0 ? Number(((totalFeedbackReceived / totalPreviewViews) * 100).toFixed(1)) : 0;

    // Time-to-approval calculation (in hours)
    const durationsHours: number[] = [];
    for (const storeId of Object.keys(storeTiming)) {
      const timing = storeTiming[storeId];
      if (timing.firstShare && timing.firstApproval && timing.firstApproval >= timing.firstShare) {
        const diffHours = (timing.firstApproval - timing.firstShare) / (1000 * 60 * 60);
        durationsHours.push(diffHours);
      }
    }

    durationsHours.sort((a, b) => a - b);
    let avgTimeToApprovalHours = 0;
    let medianTimeToApprovalHours = 0;

    if (durationsHours.length > 0) {
      const sum = durationsHours.reduce((acc, val) => acc + val, 0);
      avgTimeToApprovalHours = Number((sum / durationsHours.length).toFixed(1));

      const mid = Math.floor(durationsHours.length / 2);
      if (durationsHours.length % 2 !== 0) {
        medianTimeToApprovalHours = Number(durationsHours[mid].toFixed(1));
      } else {
        medianTimeToApprovalHours = Number(((durationsHours[mid - 1] + durationsHours[mid]) / 2).toFixed(1));
      }
    }

    // Format industry breakdown
    const industryBreakdown: IndustryAnalytics[] = Object.keys(industryMap).map((industry) => {
      const item = industryMap[industry];
      const rate = item.shares > 0 ? Number(((item.approvals / item.shares) * 100).toFixed(1)) : 0;
      return {
        industry,
        storeCount: item.stores.size,
        shareCount: item.shares,
        approvedCount: item.approvals,
        approvalRate: rate,
      };
    });

    // Format template breakdown
    const templateBreakdown: TemplateAnalytics[] = Object.keys(templateMap).map((templateId) => {
      const item = templateMap[templateId];
      const rate = item.shares > 0 ? Number(((item.approvals / item.shares) * 100).toFixed(1)) : 0;
      return {
        templateId,
        templateName: item.name,
        storeCount: item.stores.size,
        shareCount: item.shares,
        approvedCount: item.approvals,
        approvalRate: rate,
      };
    });

    // Format timeline sorted chronologically
    const timeline: ActivityTimelinePoint[] = Object.keys(timelineMap)
      .sort()
      .map((date) => ({
        date,
        events: timelineMap[date].events,
        previewViews: timelineMap[date].views,
        approvals: timelineMap[date].approvals,
        shares: timelineMap[date].shares,
      }));

    return {
      summary: {
        totalStores: storeIds.size,
        totalShares,
        totalPreviewViews,
        uniqueVisitorSessions: visitorSessions.size,
        totalFeedbackReceived,
        totalProposalsApproved,
        totalExports,
        totalDeployments,
        proposalApprovalRate,
        shareToViewRate,
        viewToFeedbackRate,
        avgTimeToApprovalHours,
        medianTimeToApprovalHours,
      },
      industryBreakdown,
      templateBreakdown,
      timeline,
      recentEvents: events.slice(0, 15),
      timeframe: {
        startDate: filter?.startDate,
        endDate: filter?.endDate,
        filter: filter?.timeframe || "all",
      },
    };
  },

  _resetMemory(events?: AnalyticsEvent[]) {
    memoryEvents = events ? [...events] : [];
  },
};
