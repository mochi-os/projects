// Mochi Projects: Merge status component
// Copyright Alistair Cunningham 2026

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@mochi/common";
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
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          data.can_merge ? "text-green-600" : "text-destructive",
        )}
      >
        {data.can_merge ? (
          <>
            <CheckCircle2 className="size-4" />
            Ready to merge
          </>
        ) : (
          <>
            <XCircle className="size-4" />
            Cannot merge automatically
          </>
        )}
      </div>

      {(data.ahead > 0 || data.behind > 0) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {data.ahead > 0 && (
            <span className="text-green-600">+{data.ahead} ahead</span>
          )}
          {data.behind > 0 && (
            <span className="text-amber-600">{data.behind} behind</span>
          )}
        </div>
      )}

      {data.conflicts.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-destructive">
            Conflicts ({data.conflicts.length} files):
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {data.conflicts.map((file) => (
              <li key={file} className="font-mono truncate">
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
