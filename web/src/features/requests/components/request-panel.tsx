// Mochi Projects: Request panel component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useRef, useState } from "react";
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, GitMerge, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button, Card, ConfirmDialog, Input, Switch, Textarea, cn, Tooltip, TooltipTrigger, TooltipContent, getAppPath } from "@mochi/web";
import projectsApi from "@/api/projects";
import { diffUrl } from "@/lib/diff";
import type { RequestData } from "@/types";
import { RepositorySelect } from "./repository-select";
import { BranchSelect } from "./branch-select";
import { MergeStatus } from "./merge-status";
import { DiffStats } from "./diff-stats";
import { ConflictList } from "./conflict-list";
import { MergeButton } from "./merge-button";
import {
  requestStateBadgeStyles,
  requestStatusTextStyles,
} from "./request-status-styles";

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
          <Trans>Merge requests</Trans>
        </div>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleAdd}
            disabled={createMutation.isPending}
          >
            <Plus className="size-3" />
            <Trans>Add</Trans>
          </Button>
        )}
      </div>

      {requests.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground"><Trans>No merge requests</Trans></p>
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
        title={t`Delete merge request`}
        desc={t`Are you sure you want to delete this merge request?`}
        confirmText={t`Delete`}
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

  // Resync the local copies when the request changes, except while the field
  // has focus, so an update landing mid-edit does not yank the text (same rule
  // as the object field editor).
  const titleFocusedRef = useRef(false);
  const descriptionFocusedRef = useRef(false);

  useEffect(() => {
    if (!titleFocusedRef.current) setTitle(request.title);
  }, [request.title]);

  useEffect(() => {
    if (!descriptionFocusedRef.current) setDescription(request.description);
  }, [request.description]);

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
    titleFocusedRef.current = false;
    if (!title.trim()) {
      setTitle(request.title);
      return;
    }
    if (title !== request.title) {
      onUpdate({ title });
    }
  };

  const handleDescriptionBlur = () => {
    descriptionFocusedRef.current = false;
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
      : t`Not configured`;

  const borderColor = isMerged
    ? "border-success/40"
    : request.repository && request.source && request.target
      ? "border-primary/40"
      : "border-border";

  return (
    <Card ref={ref} className={cn("overflow-hidden border-2 p-0 py-0 gap-0 shadow-none", borderColor)}>
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-hover transition-colors text-start"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" />
        )}
        {!expanded && <span className="flex-1 truncate text-muted-foreground">{summary}</span>}
        {expanded && <span className="flex-1" />}
        {isDraft && !isMerged && (
          <span className={requestStateBadgeStyles.draft}><Trans>Draft</Trans></span>
        )}
        {isMerged && (
          <span className={requestStateBadgeStyles.merged}><Trans>Merged</Trans></span>
        )}
        {!isMerged && !isDraft && request.repository && request.source && request.target && (
          <span className={requestStateBadgeStyles.open}><Trans context='state'>Open</Trans></span>
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
                onFocus={() => { titleFocusedRef.current = true; }}
                onBlur={handleTitleBlur}
                placeholder={t`Title`}
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
                onFocus={() => { descriptionFocusedRef.current = true; }}
                onBlur={handleDescriptionBlur}
                placeholder={t`Description`}
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
                placeholder={t`Source`}
                disabled={readOnly || isMerged}
              />
              <ArrowRight className="size-4 text-muted-foreground mb-2.5 rtl:rotate-180" />
              <BranchSelect
                repoId={request.repository}
                value={request.target}
                onChange={handleTargetChange}
                placeholder={t`Target`}
                disabled={readOnly || isMerged}
              />
            </div>

            {!readOnly && !isMerged && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch
                  checked={isDraft}
                  onCheckedChange={handleDraftToggle}
                />
                <span className="text-muted-foreground"><Trans>Draft</Trans></span>
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
                    diffUrl={diffUrl(getAppPath(), projectId, request)}
                  />

                  {isDraft && (
                    <p className={cn("text-sm", requestStatusTextStyles.warning)}>
                      <Trans>This merge request is a draft and cannot be merged.</Trans>
                    </p>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground"
                            onClick={onDelete}
                            aria-label={t`Delete merge request`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t`Delete merge request`}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </>
              )}

              {isMerged && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <Trans>This merge request has been merged into {request.target}.</Trans>
                  </div>
                  {!readOnly && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground"
                          onClick={onDelete}
                          aria-label={t`Delete merge request`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t`Delete merge request`}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          )}

          {!readOnly && !(request.repository && request.source && request.target) && (
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground"
                    onClick={onDelete}
                    aria-label={t`Delete merge request`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t`Delete merge request`}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
