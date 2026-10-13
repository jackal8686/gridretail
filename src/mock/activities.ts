import { ActivityItem, DashboardMetrics } from "@/types";

export const MOCK_METRICS: DashboardMetrics = {
  totalStores: 6,
  inProgress: 2,
  pendingReview: 1,
  published: 2,
  totalClients: 6,
  activeTemplates: 8,
};

export const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: "act_01",
    type: "store_updated",
    title: "Updated store configuration",
    description: "Modified design tokens and typography for Volt Audio Dynamics",
    timestamp: "2026-10-13T09:15:00Z",
    relativeTime: "1 hour ago",
    user: {
      name: "Marcus Thorne",
      avatarInitial: "M",
    },
    targetId: "str_02",
    targetName: "Volt Audio Dynamics",
  },
  {
    id: "act_02",
    type: "store_published",
    title: "Published client demo storefront",
    description: "Aura Minimalist Living preview deployed to internal CDN",
    timestamp: "2026-10-12T14:30:00Z",
    relativeTime: "Yesterday at 14:30",
    user: {
      name: "Alex Mercer",
      avatarInitial: "A",
    },
    targetId: "str_01",
    targetName: "Aura Minimalist Living",
  },
  {
    id: "act_03",
    type: "template_assigned",
    title: "Assigned storefront template",
    description: "Warm Organic template paired with Botanica Apothecary",
    timestamp: "2026-10-11T16:45:00Z",
    relativeTime: "2 days ago",
    user: {
      name: "Sarah Chen",
      avatarInitial: "S",
    },
    targetId: "str_03",
    targetName: "Botanica Apothecary",
  },
  {
    id: "act_04",
    type: "client_added",
    title: "New enterprise client onboarded",
    description: "Registered Heritage Hearth LLC with account lead David Kim",
    timestamp: "2026-10-09T17:00:00Z",
    relativeTime: "4 days ago",
    user: {
      name: "David Kim",
      avatarInitial: "D",
    },
    targetId: "cli_05",
    targetName: "Heritage Hearth LLC",
  },
  {
    id: "act_05",
    type: "store_created",
    title: "Initiated new demo project",
    description: "Draft created for Savor Artisan Provisions (Food & Gourmet)",
    timestamp: "2026-10-09T17:05:00Z",
    relativeTime: "4 days ago",
    user: {
      name: "David Kim",
      avatarInitial: "D",
    },
    targetId: "str_05",
    targetName: "Savor Artisan Provisions",
  },
];
