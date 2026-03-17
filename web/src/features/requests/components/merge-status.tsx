// Mochi Projects: Merge status component
// Copyright Alistair Cunningham 2026

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@mochi/web";
import projectsApi from "@/api/projects";

interface MergeStatusProps {
  repoId: string;
  source: string;
  target: string;
}

export function MergeStatus({ repoId, source, target }: MergeStatusProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["merge-check", repoId, source, target],
    queryFn: async () => {
      const response = await projectsApi.checkMerge(repoId, source, target);
      return response.data;
    },
    enabled: !!repoId && !!source && !!target,
  });

  if (!repoId || !source || !target) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking merge status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4" />
        Failed to check merge status
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {data.can_merge ? (
          <CheckCircle2 className="size-4 text-green-600 shrink-0" />
        ) : (
          <XCircle className="size-4 text-destructive shrink-0" />
        )}
        <span
          className={cn(
            "font-medium",
            data.can_merge ? "text-green-600" : "text-destructive",
          )}
        >
          {data.can_merge ? "Ready to merge" : "Cannot merge automatically"}
        </span>
        {(data.ahead > 0 || data.behind > 0) && (
          <span className="text-xs text-muted-foreground">
            {[
              data.ahead > 0 && `+${data.ahead} ahead`,
              data.behind > 0 && `${data.behind} behind`,
            ]
              .filter(Boolean)
              .join(", ")}
          </span>
        )}
      </div>

    </div>
  );
}
