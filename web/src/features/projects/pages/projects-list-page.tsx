import { useEffect, useMemo, useState } from "react";
import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Main,
  Button,
  usePageTitle,
  CardSkeleton,
  GeneralError,
  EntityOnboardingEmptyState,
  PageHeader,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
  getErrorMessage,
  toast,
} from "@mochi/web";
import { Ellipsis, FolderKanban, Plus } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useSidebarContext } from "@/context/sidebar-context";
import { InlineProjectSearch } from "../components/inline-project-search";
import { RecommendedProjects } from "../components/recommended-projects";
import projectsApi from "@/api/projects";

export function ProjectsListPage() {
  const { t } = useLingui()
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const error = useProjectsStore((state) => state.error);
  const refresh = useProjectsStore((state) => state.refresh);
  const { openCreateDialog } = useSidebarContext();
  const [unsubscribeId, setUnsubscribeId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const unsubscribeMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.unsubscribe(projectId),
    onSuccess: () => {
      void refresh();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setUnsubscribeId(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t`Failed to unsubscribe`));
    },
  });

  usePageTitle(t`Projects`);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Set of subscribed project IDs for inline search
  const subscribedProjectIds = useMemo(
    () =>
      new Set(
        projects.flatMap((p) =>
          [p.id, p.fingerprint].filter((x): x is string => !!x),
        ),
      ),
    [projects],
  );

  return (
    <>
      <PageHeader
        title={t`Projects`}
        icon={<FolderKanban className="size-4 md:size-5" />}
      />
      <Main>
        {error && (
          <div className="mb-4">
            <GeneralError
              error={new Error(error)}
              minimal
              mode="inline"
              reset={() => {
                void refresh();
              }}
            />
          </div>
        )}
        {isLoading ? (
          <CardSkeleton count={3} />
        ) : projects.length === 0 ? (
          <EntityOnboardingEmptyState
            icon={FolderKanban}
            title={t`Projects`}
            description={t`You have no projects yet.`}
            searchSlot={<InlineProjectSearch subscribedIds={subscribedProjectIds} />}
            primaryActionSlot={(
              <Button variant="outline" onClick={openCreateDialog}>
                <Plus className="me-2 h-4 w-4" />
                <Trans>Create a new project</Trans>
              </Button>
            )}
            secondarySlot={(
              <RecommendedProjects
                subscribedIds={subscribedProjectIds}
                onSubscribe={() => void refresh()}
              />
            )}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const isSubscribed = project.owner !== 1
              return (
                <div
                  key={project.id}
                  className="group relative flex flex-col rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <Link
                    to="/$projectId"
                    params={{ projectId: project.fingerprint }}
                    className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span className="sr-only"><Trans>Open {project.name}</Trans></span>
                  </Link>

                  <div className="mb-3 flex items-start justify-between">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      isSubscribed ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
                    )}>
                      <FolderKanban className="size-5" />
                    </div>
                    {isSubscribed && (
                      <div className="relative z-10 -me-1 -mt-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t`Project actions`}
                              className="size-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                            >
                              <Ellipsis className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setUnsubscribeId(project.id)}>
                              <Trans>Unsubscribe</Trans>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  <p className="truncate font-semibold leading-snug">{project.name}</p>
                  {project.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{project.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Main>

      <ConfirmDialog
        open={!!unsubscribeId}
        onOpenChange={(open) => { if (!open) setUnsubscribeId(null); }}
        title={t`Unsubscribe`}
        desc={t`Are you sure you want to unsubscribe from this project?`}
        confirmText={t`Unsubscribe`}
        destructive
        isLoading={unsubscribeMutation.isPending}
        handleConfirm={() => {
          if (unsubscribeId) unsubscribeMutation.mutate(unsubscribeId);
        }}
      />

    </>
  );
}
