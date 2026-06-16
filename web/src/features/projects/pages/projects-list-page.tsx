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
  ListCard,
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
                <ListCard
                  key={project.id}
                  icon={<FolderKanban className="size-5" />}
                  title={project.name}
                  highlighted={isSubscribed}
                  renderLink={(className) => (
                    <Link to="/$projectId" params={{ projectId: project.fingerprint }} className={className}>
                      <span className="sr-only"><Trans>Open {project.name}</Trans></span>
                    </Link>
                  )}
                  menu={isSubscribed && (
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
                  )}
                >
                  {project.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{project.description}</p>
                  )}
                </ListCard>
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
