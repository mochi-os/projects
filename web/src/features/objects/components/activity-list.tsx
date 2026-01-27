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
    return new Date(timestamp * 1000).toLocaleString();
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
          <div className="text-foreground">
            <span className="font-medium">{activity.actor}</span>{" "}
            {formatAction(activity.action)}
            {activity.field && (
              <>
                {" "}
                <span className="text-muted-foreground">{activity.field}</span>
              </>
            )}
          </div>
          {activity.oldvalue && activity.newvalue && (
            <div className="text-muted-foreground mt-0.5">
              <span className="line-through">{activity.oldvalue}</span>
              {" → "}
              <span>{activity.newvalue}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {formatDate(activity.created)}
          </div>
        </div>
      ))}
    </div>
  );
}
