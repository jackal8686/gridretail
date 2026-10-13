export interface ActivityItem {
  id: string;
  type: "store_created" | "store_updated" | "template_assigned" | "store_published" | "client_added";
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  user: {
    name: string;
    avatarInitial: string;
  };
  targetId?: string;
  targetName?: string;
}

export interface DashboardMetrics {
  totalStores: number;
  inProgress: number;
  pendingReview: number;
  published: number;
  totalClients: number;
  activeTemplates: number;
}
