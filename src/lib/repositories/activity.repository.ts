import { getDb } from "@/lib/db/mongodb";
import { ActivityItem } from "@/types";
import { MOCK_ACTIVITIES } from "@/mock/activities";

let memoryActivities: ActivityItem[] = [...MOCK_ACTIVITIES];

export const ActivityRepository = {
  async findAll(limit = 10): Promise<ActivityItem[]> {
    const db = await getDb();
    if (db) {
      try {
        const activities = await db
          .collection<ActivityItem>("activities")
          .find({})
          .sort({ timestamp: -1 })
          .limit(limit)
          .toArray();

        if (activities.length > 0) {
          return activities.map((a) => ({
            ...a,
            id: a.id || (a as unknown as { _id: { toString: () => string } })._id?.toString(),
          }));
        }
      } catch (err) {
        console.warn("MongoDB query error in ActivityRepository.findAll:", err);
      }
    }

    return memoryActivities.slice(0, limit);
  },

  async record(activity: Omit<ActivityItem, "id" | "timestamp" | "relativeTime">): Promise<ActivityItem> {
    const now = new Date();
    const fullActivity: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      relativeTime: "Just now",
      ...activity,
    };

    const db = await getDb();
    if (db) {
      try {
        await db.collection<ActivityItem>("activities").insertOne({ ...fullActivity });
      } catch (err) {
        console.warn("MongoDB insert error in ActivityRepository.record:", err);
      }
    }

    memoryActivities.unshift(fullActivity);
    return fullActivity;
  },

  _resetMemory(activities?: ActivityItem[]) {
    memoryActivities = activities ? [...activities] : [...MOCK_ACTIVITIES];
  },
};
