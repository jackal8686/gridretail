export type CommentAnchorType = "section" | "product" | "general";

export interface CollaborationComment {
  id: string;
  storeId: string;
  shareId?: string;
  authorType: "client" | "internal";
  authorName: string;
  authorEmail?: string;
  anchorType: CommentAnchorType;
  anchorId: string; // e.g. "section.hero", "product.prod_1", "general"
  anchorLabel?: string; // e.g. "Hero Section", "Featured Products", "General"
  message: string;
  isInternalOnly: boolean; // Must NEVER leak to clients
  status: "open" | "resolved";
  parentId?: string; // Thread reply support
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CreateCommentInput {
  authorName: string;
  authorEmail?: string;
  anchorType?: CommentAnchorType;
  anchorId?: string;
  anchorLabel?: string;
  message: string;
  isInternalOnly?: boolean;
  parentId?: string;
}
