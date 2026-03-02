// Mochi Projects: Diff viewer page (standalone, no sidebar)
// Copyright Alistair Cunningham 2026

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Rows3, Columns2 } from "lucide-react";
import { EmptyState, GeneralError, Main, PageHeader, usePageTitle, useAuthStore } from "@mochi/common";
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
  const { repo, source, target } = Route.useSearch();
  const queryClient = useQueryClient();

  usePageTitle(`Diff: ${source} → ${target}`);

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
    return <GeneralError error={new Error("Missing repo, source, or target parameters")} />;
  }

  if (diffLoading) {
    return (
      <Main className="flex items-center justify-center h-svh">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Main>
    );
  }

  return (
    <div className="h-svh flex flex-col overflow-hidden">
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
                  : "hover:bg-muted"
              }`}
            >
              <Rows3 className="size-3.5" />
              Unified
            </button>
            <button
              type="button"
              onClick={() => viewStyle !== "split" && toggleView()}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-l transition-colors ${
                viewStyle === "split"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <Columns2 className="size-3.5" />
              Split
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
              title="No diff available"
              description="No changes were found for the selected comparison."
            />
          </div>
        )}
      </div>
    </div>
  );
}
