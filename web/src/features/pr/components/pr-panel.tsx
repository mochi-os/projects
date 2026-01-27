// Mochi Projects: Pull request panel component
// Copyright Alistair Cunningham 2026

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, GitPullRequest } from "lucide-react";
import { Label } from "@mochi/common";
import projectsApi from "@/api/projects";
import { RepositorySelect } from "./repository-select";
import { BranchSelect } from "./branch-select";
import { MergeStatus } from "./merge-status";
import { DiffStats } from "./diff-stats";
import { ConflictList } from "./conflict-list";
import { MergeButton, ViewDiffLink } from "./merge-button";

interface PrPanelProps {
  values: Record<string, string>;
  onValueChange: (field: string, value: string) => void;
  objectTitle?: string;
  objectReadable?: string;
  readOnly?: boolean;
}

export function PrPanel({
  values,
  onValueChange,
  objectTitle = "",
  objectReadable = "",
  readOnly,
}: PrPanelProps) {
  const [repoId, setRepoId] = useState(values.repository || "");
  const [sourceBranch, setSourceBranch] = useState(values.source_branch || "");
  const [targetBranch, setTargetBranch] = useState(values.target_branch || "");
  const [merged, setMerged] = useState(values.status === "merged");

  useEffect(() => {
    if (values.repository !== repoId) setRepoId(values.repository || "");
    if (values.source_branch !== sourceBranch)
      setSourceBranch(values.source_branch || "");
    if (values.target_branch !== targetBranch)
      setTargetBranch(values.target_branch || "");
    setMerged(values.status === "merged");
  }, [
    values.repository,
    values.source_branch,
    values.target_branch,
    values.status,
  ]);

  // Fetch merge check status
  const { data: mergeCheck } = useQuery({
    queryKey: ["merge-check", repoId, sourceBranch, targetBranch],
    queryFn: async () => {
      const response = await projectsApi.checkMerge(
        repoId,
        sourceBranch,
        targetBranch,
      );
      return response.data;
    },
    enabled: !!repoId && !!sourceBranch && !!targetBranch && !merged,
  });

  const handleRepoChange = (value: string) => {
    setRepoId(value);
    setSourceBranch("");
    setTargetBranch("");
    onValueChange("repository", value);
    onValueChange("source_branch", "");
    onValueChange("target_branch", "");
  };

  const handleSourceChange = (value: string) => {
    setSourceBranch(value);
    onValueChange("source_branch", value);
  };

  const handleTargetChange = (value: string) => {
    setTargetBranch(value);
    onValueChange("target_branch", value);
  };

  const handleMergeComplete = () => {
    setMerged(true);
    onValueChange("status", "merged");
  };

  const canMerge = mergeCheck?.can_merge ?? false;
  const conflicts = mergeCheck?.conflicts ?? [];
  const isMerged = merged || values.status === "merged";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <GitPullRequest className="size-4" />
        Pull Request
        {isMerged && (
          <span className="ml-auto text-xs text-green-600 font-normal">
            Merged
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Repository</Label>
          <RepositorySelect
            value={repoId}
            onChange={handleRepoChange}
            disabled={readOnly || isMerged}
          />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <div className="space-y-1.5">
            <Label>Source branch</Label>
            <BranchSelect
              repoId={repoId}
              value={sourceBranch}
              onChange={handleSourceChange}
              placeholder="Feature branch"
              disabled={readOnly || isMerged}
            />
          </div>
          <ArrowRight className="size-4 text-muted-foreground mb-2.5" />
          <div className="space-y-1.5">
            <Label>Target branch</Label>
            <BranchSelect
              repoId={repoId}
              value={targetBranch}
              onChange={handleTargetChange}
              placeholder="main"
              disabled={readOnly || isMerged}
            />
          </div>
        </div>
      </div>

      {repoId && sourceBranch && targetBranch && (
        <div className="pt-3 border-t space-y-4">
          {!isMerged && (
            <>
              <MergeStatus
                repoId={repoId}
                source={sourceBranch}
                target={targetBranch}
              />

              {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}

              <DiffStats
                repoId={repoId}
                base={targetBranch}
                head={sourceBranch}
              />

              <div className="flex items-center justify-between gap-4">
                <ViewDiffLink
                  repoId={repoId}
                  source={sourceBranch}
                  target={targetBranch}
                />
              </div>

              <MergeButton
                repoId={repoId}
                source={sourceBranch}
                target={targetBranch}
                canMerge={canMerge}
                objectTitle={objectTitle}
                objectReadable={objectReadable}
                onMergeComplete={handleMergeComplete}
                disabled={readOnly}
              />
            </>
          )}

          {isMerged && (
            <div className="text-sm text-muted-foreground">
              This pull request has been merged into {targetBranch}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
