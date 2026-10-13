export type FeedbackType = "general" | "approval" | "changes_requested";
export type AuthorType = "client" | "employee";

export interface StoreFeedback {
  id: string;
  storeId: string;
  shareId?: string;
  authorType: AuthorType;
  authorName: string;
  authorEmail?: string;
  type: FeedbackType;
  message: string;
  createdAt: string;
}

export interface SubmitFeedbackInput {
  authorName: string;
  authorEmail?: string;
  type: FeedbackType;
  message: string;
}
