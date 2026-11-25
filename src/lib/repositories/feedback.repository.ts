import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { StoreFeedback } from "@/types/feedback";

let memoryFeedback: StoreFeedback[] = [];

export const FeedbackRepository = {
  async create(feedback: StoreFeedback): Promise<StoreFeedback> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create feedback: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<StoreFeedback>("store_feedback").insertOne({ ...feedback });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in FeedbackRepository.create:", err);
      }
    }

    memoryFeedback.push(feedback);
    return feedback;
  },

  async findByStoreId(storeId: string): Promise<StoreFeedback[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<StoreFeedback>("store_feedback")
          .find({ storeId })
          .sort({ createdAt: -1 })
          .toArray();
        return results;
      } catch (err) {
        console.warn("MongoDB query error in FeedbackRepository.findByStoreId:", err);
      }
    }

    return memoryFeedback
      .filter((f) => f.storeId === storeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  _resetMemory(feedbacks?: StoreFeedback[]) {
    memoryFeedback = feedbacks ? [...feedbacks] : [];
  },
};
