// Mochi Projects: Pull request panel component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GitPullRequest, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button, ConfirmDialog } from "@mochi/common";
import projectsApi from "@/api/projects";
import type { PrData } from "@/types";
import { RepositorySelect } from "./repository-select";
import { BranchSelect } from "./branch-select";
import { MergeStatus } from "./merge-status";
import { DiffStats } from "./diff-stats";
import { ConflictList } from "./conflict-list";
import { MergeButton } from "./merge-button";

interface PrPanelProps {
  projectId: string;
  objectId: string;
  prs: PrData[];
  objectTitle?: string;
  objectReadable?: string;
  readOnly?: boolean;
}

export function PrPanel({
  projectId,
  objectId,
  prs,
  objectTitle = "",
  objectReadable = "",
  readOnly,
}: PrPanelProps) {
  const [expandedPr, setExpandedPr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      return projectsApi.createPr(projectId, objectId, {});
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["object", projectId, objectId] });
      setAdding(false);
      setExpandedPr(response.data.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ prId, data }: { prId: string; data: { repository?: string; source?: string; target?: string; status?: string } }) => {
      return projectsApi.updatePr(projectId, objectId, prId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object", projectId, objectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (prId: string) => {
      return projectsApi.deletePr(projectId, objectId, prId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object", projectId, objectId] });
      setDeleteId(null);
      setExpandedPr(null);
    },
  });

  const handleAdd = () => {
    createMutation.mutate();
  };

  const handleUpdate = (prId: string, data: { repository?: string; source?: string; target?: string; status?: string }) => {
    updateMutation.mutate({ prId, data });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitPullRequest className="size-4" />
          Pull requests
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleAdd}
            disabled={createMutation.isPending}
          >
            <Plus className="size-3" />
            Add
          </Button>
        )}
      </div>

      {prs.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No pull requests</p>
      )}

      {prs.map((pr) => (
        <PrItem
          key={pr.id}
          pr={pr}
          expanded={expandedPr === pr.id}
          onToggle={() => setExpandedPr(expandedPr === pr.id ? null : pr.id)}
          onUpdate={(data) => handleUpdate(pr.id, data)}
          onDelete={() => setDeleteId(pr.id)}
          objectTitle={objectTitle}
          objectReadable={objectReadable}
          projectId={projectId}
          readOnly={readOnly}
        />
      ))}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete pull request"
        desc="Are you sure you want to delete this pull request?"
        confirmText="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}

interface PrItemProps {
  pr: PrData;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (data: { repository?: string; source?: string; target?: string; status?: string }) => void;
  onDelete: () => void;
  objectTitle: string;
  objectReadable: string;
  projectId: string;
  readOnly?: boolean;
}

function PrItem({
  pr,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  objectTitle,
  objectReadable,
  projectId,
  readOnly,
}: PrItemProps) {
  const isMerged = pr.status === "merged";

  // Fetch merge check when expanded and has all fields
  const { data: mergeCheck } = useQuery({
    queryKey: ["merge-check", pr.repository, pr.source, pr.target],
    queryFn: async () => {
      const response = await projectsApi.checkMerge(pr.repository, pr.source, pr.target);
      return response.data;
    },
    enabled: expanded && !!pr.repository && !!pr.source && !!pr.target && !isMerged,
  });

  const canMerge = mergeCheck?.can_merge ?? false;
  const conflicts = mergeCheck?.conflicts ?? [];

  const handleRepoChange = (value: string) => {
    onUpdate({ repository: value, source: "", target: "" });
  };

  const handleSourceChange = (value: string) => {
    onUpdate({ source: value });
  };

  const handleTargetChange = (value: string) => {
    onUpdate({ target: value });
  };

  const handleMergeComplete = () => {
    onUpdate({ status: "merged" });
  };

  // Summary line for collapsed state
  const summary = pr.repository
    ? `${pr.source || "?"} → ${pr.target || "?"}`
    : "Not configured";

  return (
    <div className="border rounded-[10px] overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate text-muted-foreground">{summary}</span>
        {isMerged && (
          <span className="text-xs text-green-600 font-medium shrink-0">Merged</span>
        )}
        {!isMerged && pr.repository && pr.source && pr.target && (
          <span className="text-xs text-blue-500 font-medium shrink-0">Open</span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t">
          <div className="space-y-3 pt-3">
            <RepositorySelect
              value={pr.repository}
              onChange={handleRepoChange}
              disabled={readOnly || isMerged}
            />

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <BranchSelect
                repoId={pr.repository}
                value={pr.source}
                onChange={handleSourceChange}
                placeholder="Source"
                disabled={readOnly || isMerged}
              />
              <ArrowRight className="size-4 text-muted-foreground mb-2.5" />
              <BranchSelect
                repoId={pr.repository}
                value={pr.target}
                onChange={handleTargetChange}
                placeholder="Target"
                disabled={readOnly || isMerged}
              />
            </div>
          </div>

          {pr.repository && pr.source && pr.target && (
            <div className="pt-3 border-t space-y-3">
              {!isMerged && (
                <>
                  <MergeStatus
                    repoId={pr.repository}
                    source={pr.source}
                    target={pr.target}
                    diffUrl={`/projects/${projectId}/diff?repo=${encodeURIComponent(pr.repository)}&source=${encodeURIComponent(pr.source)}&target=${encodeURIComponent(pr.target)}`}
                  />

                  {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}

                  <DiffStats
                    repoId={pr.repository}
                    base={pr.target}
                    head={pr.source}
                  />

                  <MergeButton
                    repoId={pr.repository}
                    source={pr.source}
                    target={pr.target}
                    canMerge={canMerge}
                    objectTitle={objectTitle}
                    objectReadable={objectReadable}
                    projectId={projectId}
                    onMergeComplete={handleMergeComplete}
                    disabled={readOnly}
                  />
                </>
              )}

              {isMerged && (
                <div className="text-sm text-muted-foreground">
                  This pull request has been merged into {pr.target}.
                </div>
              )}
            </div>
          )}

          {!readOnly && !isMerged && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="size-3" />
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
