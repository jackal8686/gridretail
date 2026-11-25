import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { CollaborationComment } from "@/types/comment";

let memoryComments: CollaborationComment[] = [];

export const CommentRepository = {
  async create(comment: CollaborationComment): Promise<CollaborationComment> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create comment: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<CollaborationComment>("collaboration_comments").insertOne({ ...comment });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in CommentRepository.create:", err);
      }
    }

    memoryComments.push(comment);
    return comment;
  },

  async findByStoreId(
    storeId: string,
    options?: { includeInternal?: boolean; anchorId?: string }
  ): Promise<CollaborationComment[]> {
    const includeInternal = options?.includeInternal ?? false;
    const db = await getDb();
    let comments: CollaborationComment[] = [];

    if (db) {
      try {
        const query: Record<string, unknown> = { storeId };
        if (!includeInternal) {
          query.isInternalOnly = false;
        }
        if (options?.anchorId) {
          query.anchorId = options.anchorId;
        }

        comments = await db
          .collection<CollaborationComment>("collaboration_comments")
          .find(query)
          .sort({ createdAt: 1 })
          .toArray();
      } catch (err) {
        console.warn("MongoDB query error in CommentRepository.findByStoreId:", err);
        comments = [];
      }
    }

    if (comments.length === 0 && memoryComments.length > 0) {
      comments = memoryComments.filter((c) => {
        if (c.storeId !== storeId) return false;
        if (!includeInternal && c.isInternalOnly) return false;
        if (options?.anchorId && c.anchorId !== options.anchorId) return false;
        return true;
      });
      comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return comments;
  },

  async findById(id: string): Promise<CollaborationComment | null> {
    const db = await getDb();
    if (db) {
      try {
        const found = await db
          .collection<CollaborationComment>("collaboration_comments")
          .findOne({ id });
        if (found) return found;
      } catch (err) {
        console.warn("MongoDB query error in CommentRepository.findById:", err);
      }
    }

    return memoryComments.find((c) => c.id === id) || null;
  },

  async resolveComment(id: string, resolvedBy: string): Promise<CollaborationComment | null> {
    const resolvedAt = new Date().toISOString();
    const patch = {
      status: "resolved" as const,
      resolvedAt,
      resolvedBy,
    };

    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot resolve comment: database is unavailable in production.");
    }
    if (db) {
      try {
        await db
          .collection<CollaborationComment>("collaboration_comments")
          .updateOne({ id }, { $set: patch });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB update error in CommentRepository.resolveComment:", err);
      }
    }

    const index = memoryComments.findIndex((c) => c.id === id);
    if (index !== -1) {
      memoryComments[index] = {
        ...memoryComments[index],
        ...patch,
      };
      return memoryComments[index];
    }

    return this.findById(id);
  },

  async reopenComment(id: string): Promise<CollaborationComment | null> {
    const patch = {
      status: "open" as const,
      resolvedAt: undefined,
      resolvedBy: undefined,
    };

    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot reopen comment: database is unavailable in production.");
    }
    if (db) {
      try {
        await db
          .collection<CollaborationComment>("collaboration_comments")
          .updateOne({ id }, { $set: { status: "open" }, $unset: { resolvedAt: "", resolvedBy: "" } });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB update error in CommentRepository.reopenComment:", err);
      }
    }

    const index = memoryComments.findIndex((c) => c.id === id);
    if (index !== -1) {
      memoryComments[index] = {
        ...memoryComments[index],
        ...patch,
      };
      return memoryComments[index];
    }

    return this.findById(id);
  },

  _resetMemory(comments?: CollaborationComment[]) {
    memoryComments = comments ? [...comments] : [];
  },
};
