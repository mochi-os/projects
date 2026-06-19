// Mochi Projects: Diff stats component
// Copyright Alistair Cunningham 2026

import { useMemo } from "react";
import { Trans } from '@lingui/react/macro'
import { useQuery } from "@tanstack/react-query";
import { FileCode2, Plus, Minus, Loader2, FileDiff } from "lucide-react";
import { cn } from "@mochi/web";
import projectsApi from "@/api/projects";
import { parseDiff } from "./diff-parser";
import {
  diffFileStatusDotStyles,
  requestStatusTextStyles,
} from "./request-status-styles";

interface DiffStatsProps {
  repoId: string;
  base: string;
  head: string;
  diffUrl?: string;
}

export function DiffStats({ repoId, base, head, diffUrl }: DiffStatsProps) {
  const { data: rawDiff, isLoading } = useQuery({
    queryKey: ["diff", repoId, base, head],
    queryFn: async () => {
      const response = await projectsApi.getDiff(repoId, base, head);
      return response.data;
    },
    enabled: !!repoId && !!base && !!head,
  });

  const files = useMemo(
    () => (rawDiff ? parseDiff(rawDiff) : []),
    [rawDiff],
  );

  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  if (!repoId || !base || !head) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <Trans>Loading diff...</Trans>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground"><Trans>No changes detected</Trans></div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <FileCode2 className="size-4 text-muted-foreground" />
          <Trans>{files.length} files changed</Trans>
        </span>
        <span className={cn("flex items-center gap-1", requestStatusTextStyles.added)}>
          <Plus className="size-3" />
          {additions}
        </span>
        <span className={cn("flex items-center gap-1", requestStatusTextStyles.deleted)}>
          <Minus className="size-3" />
          {deletions}
        </span>
        {diffUrl && (
          <a
            href={diffUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ms-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-hover transition-colors shrink-0"
          >
            <FileDiff className="size-3" />
            <Trans>Diff</Trans>
          </a>
        )}
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <StatusIcon status={file.status} />
              <span className="font-mono truncate">{file.path}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {file.additions > 0 && (
                <span className={requestStatusTextStyles.added}>+{file.additions}</span>
              )}
              {file.deletions > 0 && (
                <span className={requestStatusTextStyles.deleted}>-{file.deletions}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    added: diffFileStatusDotStyles.added,
    modified: diffFileStatusDotStyles.modified,
    deleted: diffFileStatusDotStyles.deleted,
    renamed: diffFileStatusDotStyles.renamed,
  };

  return (
    <span
      className={cn(
        "size-2 rounded-full shrink-0",
        colors[status] || "bg-muted-foreground",
      )}
    />
  );
}
