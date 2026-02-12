// Mochi Projects: Pull request panel component
// Copyright Alistair Cunningham 2026

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GitPullRequest, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button, Card, ConfirmDialog, Input, Switch, Textarea, cn } from "@mochi/common";
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
    mutationFn: async ({ prId, data }: { prId: string; data: { repository?: string; source?: string; target?: string; status?: string; title?: string; description?: string; draft?: string } }) => {
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

  const handleUpdate = (prId: string, data: { repository?: string; source?: string; target?: string; status?: string; title?: string; description?: string; draft?: string }) => {
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
  onUpdate: (data: { repository?: string; source?: string; target?: string; status?: string; title?: string; description?: string; draft?: string }) => void;
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
  const ref = useRef<HTMLDivElement>(null);
  const isMerged = pr.status === "merged";
  const isDraft = pr.draft === 1;

  useEffect(() => {
    if (expanded) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [expanded]);

  const [title, setTitle] = useState(pr.title);
  const [description, setDescription] = useState(pr.description);

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

  const handleTitleBlur = () => {
    if (!title.trim()) {
      setTitle(pr.title);
      return;
    }
    if (title !== pr.title) {
      onUpdate({ title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== pr.description) {
      onUpdate({ description });
    }
  };

  const handleDraftToggle = () => {
    onUpdate({ draft: isDraft ? "0" : "1" });
  };

  // Summary line for collapsed state
  const summary = pr.title
    ? pr.title
    : pr.repository
      ? `${pr.source || "?"} → ${pr.target || "?"}`
      : "Not configured";

  const borderColor = isMerged
    ? "border-green-500/40"
    : pr.repository && pr.source && pr.target
      ? "border-blue-500/40"
      : "border-border";

  return (
    <Card ref={ref} className={cn("overflow-hidden border-2 p-0 py-0 gap-0 shadow-none", borderColor)}>
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
        {!expanded && <span className="flex-1 truncate text-muted-foreground">{summary}</span>}
        {expanded && <span className="flex-1" />}
        {isDraft && !isMerged && (
          <span className="text-xs text-yellow-600 font-medium shrink-0 border border-yellow-600/30 rounded px-1.5 py-0.5">Draft</span>
        )}
        {isMerged && (
          <span className="text-xs text-green-600 font-medium shrink-0">Merged</span>
        )}
        {!isMerged && !isDraft && pr.repository && pr.source && pr.target && (
          <span className="text-xs text-blue-500 font-medium shrink-0">Open</span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t">
          <div className="space-y-3 pt-3">
            {!readOnly && !isMerged && (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Title"
              />
            )}
            {readOnly && pr.title && (
              <div className="text-sm font-medium">{pr.title}</div>
            )}

            {!readOnly && !isMerged && (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Description"
                rows={2}
              />
            )}
            {readOnly && pr.description && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{pr.description}</div>
            )}

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

            {!readOnly && !isMerged && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={isDraft}
                  onCheckedChange={handleDraftToggle}
                />
                <span className="text-muted-foreground">Draft</span>
              </label>
            )}
          </div>

          {pr.repository && pr.source && pr.target && (
            <div className="pt-3 border-t space-y-3">
              {!isMerged && (
                <>
                  <MergeStatus
                    repoId={pr.repository}
                    source={pr.source}
                    target={pr.target}
                  />

                  {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}

                  <DiffStats
                    repoId={pr.repository}
                    base={pr.target}
                    head={pr.source}
                    diffUrl={`/projects/${projectId}/diff?repo=${encodeURIComponent(pr.repository)}&source=${encodeURIComponent(pr.source)}&target=${encodeURIComponent(pr.target)}`}
                  />

                  {isDraft && (
                    <p className="text-sm text-yellow-600">This pull request is a draft and cannot be merged.</p>
                  )}

                  <div className="flex items-center gap-2">
                    <MergeButton
                      repoId={pr.repository}
                      source={pr.source}
                      target={pr.target}
                      canMerge={canMerge && !isDraft}
                      objectTitle={objectTitle}
                      objectReadable={objectReadable}
                      projectId={projectId}
                      onMergeComplete={handleMergeComplete}
                      disabled={readOnly || isDraft}
                    />
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={onDelete}
                        title="Delete pull request"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}

              {isMerged && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    This pull request has been merged into {pr.target}.
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={onDelete}
                      title="Delete pull request"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {!readOnly && !(pr.repository && pr.source && pr.target) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                title="Delete pull request"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
