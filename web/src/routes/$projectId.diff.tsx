// Mochi Projects: Diff viewer page (standalone, no sidebar)
// Copyright Alistair Cunningham 2026

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rows3, Columns2 } from "lucide-react";
import { EmptyState, GeneralError, Main, PageHeader, usePageTitle, useAuthStore, useQueryWithError } from "@mochi/common";
import projectsApi from "@/api/projects";
import { DiffViewer } from "@/features/pr/components/diff-viewer";
import { DiffSkeleton } from "@/features/pr/components/diff-skeleton";

interface DiffSearchParams {
  repo: string;
  source: string;
  target: string;
}

export const Route = createFileRoute("/$projectId/diff")({
  component: DiffPage,
  errorComponent: ({ error }) => <GeneralError error={error} />,
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
    ErrorComponent,
  } = useQueryWithError({
    queryKey: ["diff", repo, target, source],
    queryFn: async () => {
      const response = await projectsApi.getDiff(repo, target, source);
      return response.data;
    },
    enabled: !!repo && !!source && !!target,
  });

  const { data: prefData } = useQuery({
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
      <Main className="h-svh">
        <DiffSkeleton />
      </Main>
    );
  }

  if (ErrorComponent) {
    return (
      <Main className="h-svh">
        {ErrorComponent}
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
        {diffData ? (
          <DiffViewer diff={diffData} viewStyle={viewStyle} />
        ) : (
          <div className="py-12">
            <EmptyState
              icon={Rows3}
              title="No diff available"
              description="There are no changes between these refs."
            />
          </div>
        )}
      </div>
    </div>
  );
}
