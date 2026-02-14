// Mochi Projects: Activity list component
// Copyright Alistair Cunningham 2026

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import projectsApi from "@/api/projects";

interface ActivityListProps {
  projectId: string;
  objectId: string;
}

export function ActivityList({ projectId, objectId }: ActivityListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity", projectId, objectId],
    queryFn: async () => {
      const response = await projectsApi.listActivity(projectId, objectId);
      return response.data.activities;
    },
  });

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatAction = (action: string) => {
    switch (action) {
      case "create":
        return "created";
      case "update":
        return "updated";
      case "delete":
        return "deleted";
      case "move":
        return "moved";
      default:
        return action;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activities = data || [];

  if (activities.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="text-sm border-l-2 border-muted pl-3 py-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDate(activity.created)}
            </span>
            <span className="font-medium">
              {activity.name || activity.user}
            </span>
          </div>
          <div className="text-muted-foreground">
            {formatAction(activity.action)}
            {activity.field && ` ${activity.field}`}
            {activity.oldvalue && activity.newvalue && (
              <>
                {": "}
                <span className="line-through">{activity.oldvalue}</span>
                {" → "}
                <span className="text-foreground">{activity.newvalue}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
