// Mochi Projects: Merge status component
// Copyright Alistair Cunningham 2026

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@mochi/common";
import projectsApi from "@/api/projects";

interface MergeStatusProps {
  repoId: string;
  source: string;
  target: string;
  diffUrl?: string;
}

export function MergeStatus({ repoId, source, target, diffUrl }: MergeStatusProps) {
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
        {diffUrl && (
          <a
            href={diffUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ExternalLink className="size-3" />
            View diff
          </a>
        )}
      </div>

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
