// Mochi Projects: Request panel component
// Copyright Alistair Cunningham 2026

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GitMerge, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button, Card, ConfirmDialog, Input, Switch, Textarea, cn } from "@mochi/common";
import projectsApi from "@/api/projects";
import type { RequestData } from "@/types";
import { RepositorySelect } from "./repository-select";
import { BranchSelect } from "./branch-select";
import { MergeStatus } from "./merge-status";
import { DiffStats } from "./diff-stats";
import { ConflictList } from "./conflict-list";
import { MergeButton } from "./merge-button";

interface RequestPanelProps {
  projectId: string;
  objectId: string;
  requests: RequestData[];
  objectTitle?: string;
  objectReadable?: string;
  readOnly?: boolean;
}

export function RequestPanel({
  projectId,
  objectId,
  requests,
  objectTitle = "",
  objectReadable = "",
  readOnly,
}: RequestPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      return projectsApi.createRequest(projectId, objectId, { type: "merge" });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["object", projectId, objectId] });
      setAdding(false);
      setExpandedId(response.data.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ requestId, data }: { requestId: string; data: { repository?: string; source?: string; target?: string; status?: string; title?: string; description?: string; draft?: string } }) => {
      return projectsApi.updateRequest(projectId, objectId, requestId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object", projectId, objectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return projectsApi.deleteRequest(projectId, objectId, requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["object", projectId, objectId] });
      setDeleteId(null);
      setExpandedId(null);
    },
  });

  const handleAdd = () => {
    createMutation.mutate();
  };

  const handleUpdate = (requestId: string, data: { repository?: string; source?: string; target?: string; status?: string; title?: string; description?: string; draft?: string }) => {
    updateMutation.mutate({ requestId, data });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitMerge className="size-4" />
          Merge requests
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

      {requests.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No merge requests</p>
      )}

      {requests.map((req) => (
        <RequestItem
          key={req.id}
          request={req}
          expanded={expandedId === req.id}
          onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)}
          onUpdate={(data) => handleUpdate(req.id, data)}
          onDelete={() => setDeleteId(req.id)}
          objectTitle={objectTitle}
          objectReadable={objectReadable}
          projectId={projectId}
          readOnly={readOnly}
        />
      ))}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete merge request"
        desc="Are you sure you want to delete this merge request?"
        confirmText="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}

interface RequestItemProps {
  request: RequestData;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (data: { repository?: string; source?: string; target?: string; status?: string; title?: string; description?: string; draft?: string }) => void;
  onDelete: () => void;
  objectTitle: string;
  objectReadable: string;
  projectId: string;
  readOnly?: boolean;
}

function RequestItem({
  request,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  objectTitle,
  objectReadable,
  projectId,
  readOnly,
}: RequestItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isMerged = request.status === "merged";
  const isDraft = request.draft === 1;

  useEffect(() => {
    if (expanded) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [expanded]);

  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);

  // Fetch merge check when expanded and has all fields
  const { data: mergeCheck } = useQuery({
    queryKey: ["merge-check", request.repository, request.source, request.target],
    queryFn: async () => {
      const response = await projectsApi.checkMerge(request.repository, request.source, request.target);
      return response.data;
    },
    enabled: expanded && !!request.repository && !!request.source && !!request.target && !isMerged,
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
      setTitle(request.title);
      return;
    }
    if (title !== request.title) {
      onUpdate({ title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== request.description) {
      onUpdate({ description });
    }
  };

  const handleDraftToggle = () => {
    onUpdate({ draft: isDraft ? "0" : "1" });
  };

  // Summary line for collapsed state
  const summary = request.title
    ? request.title
    : request.repository
      ? `${request.source || "?"} → ${request.target || "?"}`
      : "Not configured";

  const borderColor = isMerged
    ? "border-green-500/40"
    : request.repository && request.source && request.target
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
        {!isMerged && !isDraft && request.repository && request.source && request.target && (
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
                autoFocus={!title}
              />
            )}
            {readOnly && request.title && (
              <div className="text-sm font-medium">{request.title}</div>
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
            {readOnly && request.description && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{request.description}</div>
            )}

            <RepositorySelect
              value={request.repository}
              onChange={handleRepoChange}
              disabled={readOnly || isMerged}
            />

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <BranchSelect
                repoId={request.repository}
                value={request.source}
                onChange={handleSourceChange}
                placeholder="Source"
                disabled={readOnly || isMerged}
              />
              <ArrowRight className="size-4 text-muted-foreground mb-2.5" />
              <BranchSelect
                repoId={request.repository}
                value={request.target}
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

          {request.repository && request.source && request.target && (
            <div className="pt-3 border-t space-y-3">
              {!isMerged && (
                <>
                  <MergeStatus
                    repoId={request.repository}
                    source={request.source}
                    target={request.target}
                  />

                  {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}

                  <DiffStats
                    repoId={request.repository}
                    base={request.target}
                    head={request.source}
                    diffUrl={`/projects/${projectId}/diff?repo=${encodeURIComponent(request.repository)}&source=${encodeURIComponent(request.source)}&target=${encodeURIComponent(request.target)}`}
                  />

                  {isDraft && (
                    <p className="text-sm text-yellow-600">This merge request is a draft and cannot be merged.</p>
                  )}

                  <div className="flex items-center gap-2">
                    <MergeButton
                      repoId={request.repository}
                      source={request.source}
                      target={request.target}
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
                        title="Delete merge request"
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
                    This merge request has been merged into {request.target}.
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={onDelete}
                      title="Delete merge request"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {!readOnly && !(request.repository && request.source && request.target) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                title="Delete merge request"
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
