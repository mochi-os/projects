// Mochi Projects: Merge status component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useQuery } from "@tanstack/react-query";
import { Trans, useLingui } from '@lingui/react/macro'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@mochi/web";
import projectsApi from "@/api/projects";
import { requestStatusTextStyles } from "./request-status-styles";

interface MergeStatusProps {
  repoId: string;
  source: string;
  target: string;
}

export function MergeStatus({ repoId, source, target }: MergeStatusProps) {
  const { t } = useLingui();
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
        <Trans>Checking merge status...</Trans>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4" />
        <Trans>Failed to check merge status</Trans>
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
          <CheckCircle2 className={cn("size-4 shrink-0", requestStatusTextStyles.successIcon)} />
        ) : (
          <XCircle className="size-4 text-destructive shrink-0" />
        )}
        <span
          className={cn(
            "font-medium",
            data.can_merge ? requestStatusTextStyles.added : "text-destructive",
          )}
        >
          {data.can_merge ? t`Ready to merge` : t`Cannot merge automatically`}
        </span>
        {(data.ahead > 0 || data.behind > 0) && (
          <span className="text-xs text-muted-foreground">
            {[
              data.ahead > 0 && t`+${data.ahead} ahead`,
              data.behind > 0 && t`${data.behind} behind`,
            ]
              .filter(Boolean)
              .join(", ")}
          </span>
        )}
      </div>

    </div>
  );
}
