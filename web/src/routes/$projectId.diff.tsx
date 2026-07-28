// Mochi Projects: Diff viewer page (standalone, no sidebar)
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute } from "@tanstack/react-router";
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Rows3, Columns2 } from "lucide-react";
import { EmptyState, GeneralError, Main, PageHeader, usePageTitle, useAuthStore, isInShell } from "@mochi/web";
import projectsApi from "@/api/projects";
import { DiffViewer } from "@/features/requests/components/diff-viewer";

interface DiffSearchParams {
  repo: string;
  source: string;
  target: string;
}

export const Route = createFileRoute("/$projectId/diff")({
  component: DiffPage,
  beforeLoad: () => {
    const store = useAuthStore.getState();
    if (!store.isInitialized) {
      store.initialize();
    }
  },
  validateSearch: (search: Record<string, unknown>): DiffSearchParams => ({
    repo: (search.repo as string) || "",
    source: (search.source as string) || "",
    target: (search.target as string) || "",
  }),
});

function DiffPage() {
  const { t } = useLingui()
  const { repo, source, target } = Route.useSearch();
  const queryClient = useQueryClient();

  usePageTitle(t`Diff: ${source} → ${target}`);

  const {
    data: diffData,
    isLoading: diffLoading,
    error: diffError,
    refetch: refetchDiff,
  } = useQuery({
    queryKey: ["diff", repo, target, source],
    queryFn: async () => {
      const response = await projectsApi.getDiff(repo, target, source);
      return response.data;
    },
    enabled: !!repo && !!source && !!target,
  });

  const { data: prefData, error: prefError, refetch: refetchPreference } = useQuery({
    queryKey: ["diff-preference"],
    queryFn: async () => {
      const response = await projectsApi.getDiffPreference();
      return response.data;
    },
  });

  const viewStyle = (prefData?.style as "unified" | "split") || "unified";

  const prefMutation = useMutation({
    mutationFn: (style: string) => projectsApi.setDiffPreference(style),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diff-preference"] });
    },
  });

  const toggleView = () => {
    const next = viewStyle === "unified" ? "split" : "unified";
    prefMutation.mutate(next);
  };

  if (!repo || !source || !target) {
    return <GeneralError error={new Error(t`Missing repo, source, or target parameters`)} />;
  }

  if (diffLoading) {
    return (
      <Main className="flex items-center justify-center h-svh">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Main>
    );
  }

  // Every other page routes through AuthenticatedLayout, which reserves this
  // space so a page's own content clears the shell's fixed app-switcher
  // overlay (see its "ps-24" comment). This page is standalone — no sidebar,
  // so it skips that layout entirely — and picked up the overlap because it
  // never applied the same offset itself.
  return (
    <div className={`h-svh flex flex-col overflow-hidden ${isInShell() ? "md:ps-24" : ""}`}>
      <PageHeader
        title={`${source} → ${target}`}
        actions={
          <div className="flex rounded-md border overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => viewStyle !== "unified" && toggleView()}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                viewStyle === "unified"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-hover"
              }`}
            >
              <Rows3 className="size-3.5" />
              <Trans>Unified</Trans>
            </button>
            <button
              type="button"
              onClick={() => viewStyle !== "split" && toggleView()}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-s transition-colors ${
                viewStyle === "split"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-hover"
              }`}
            >
              <Columns2 className="size-3.5" />
              <Trans>Split</Trans>
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto px-4 md:px-6 pb-8">
        {prefError && (
          <div className="py-4">
            <GeneralError
              error={prefError}
              minimal
              mode="inline"
              reset={() => {
                void refetchPreference();
              }}
            />
          </div>
        )}
        {diffError ? (
          <div className="py-4">
            <GeneralError
              error={diffError}
              minimal
              mode="inline"
              reset={() => {
                void refetchDiff();
              }}
            />
          </div>
        ) : diffData ? (
          <DiffViewer diff={diffData} viewStyle={viewStyle} />
        ) : (
          <div className="py-8">
            <EmptyState
              icon={Rows3}
              title={t`No diff available`}
              description={t`No changes were found for the selected comparison.`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
