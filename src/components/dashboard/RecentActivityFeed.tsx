import {
  Store,
  Palette,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ActivityItem } from "@/types";

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "store_published":
        return <CheckCircle2 className="h-4 w-4 text-[#16804A]" />;
      case "template_assigned":
        return <Palette className="h-4 w-4 text-[#B7791F]" />;
      case "client_added":
        return <UserPlus className="h-4 w-4 text-[#176B4D]" />;
      case "store_created":
      case "store_updated":
      default:
        return <Store className="h-4 w-4 text-[#176B4D]" />;
    }
  };

  return (
    <Card>
      <CardHeader className="py-4">
        <div>
          <CardTitle>Recent Workspace Activity</CardTitle>
          <span className="text-[11px] text-[#66736C]">Sample audit trail</span>
        </div>
        <span className="text-[10px] bg-[#FAF9F6] border border-[#E4E9E5] text-[#66736C] px-2 py-0.5 rounded">
          Demo feed
        </span>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-4">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 text-xs group">
              <div className="h-8 w-8 rounded-full bg-[#FAF9F6] border border-[#E4E9E5] flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(act.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#18231E] truncate">
                    {act.title}
                  </p>
                  <span className="text-[10px] text-[#909D96] shrink-0">
                    {act.relativeTime}
                  </span>
                </div>
                <p className="text-[#66736C] mt-0.5 line-clamp-2">
                  {act.description}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#909D96]">
                  <span className="font-medium text-[#4F5D56]">{act.user.name}</span>
                  {act.targetName && (
                    <>
                      <span>•</span>
                      <span className="text-[#176B4D] font-medium truncate">
                        {act.targetName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
