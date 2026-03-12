import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Main,
  Card,
  CardContent,
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
  shellSubscribeNotifications,
  getErrorMessage,
  toast,
} from "@mochi/common";
import { FolderKanban, MoreHorizontal, Plus } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useSidebarContext } from "@/context/sidebar-context";
import { InlineProjectSearch } from "../components/inline-project-search";
import { RecommendedProjects } from "../components/recommended-projects";
import projectsApi from "@/api/projects";

export function ProjectsListPage() {
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
      toast.error(getErrorMessage(error, "Failed to unsubscribe"));
    },
  });

  usePageTitle("Projects");

  // Notification subscription check
  const { data: subscriptionData, refetch: refetchSubscription } = useQuery({
    queryKey: ["subscription-check", "projects"],
    queryFn: () => projectsApi.checkSubscription(),
    staleTime: Infinity,
  });

  // Prompt for notification subscription once on mount if user has projects but hasn't subscribed
  const promptedNotifications = useRef(false);
  useEffect(() => {
    if (promptedNotifications.current) return;
    if (!isLoading && projects.length > 0 && subscriptionData?.data?.exists === false) {
      promptedNotifications.current = true;
      shellSubscribeNotifications('projects', [
        { label: 'Project updates', type: 'update', defaultEnabled: true },
        { label: 'Assignments', type: 'assignment', defaultEnabled: true },
      ]).then(() => refetchSubscription());
    }
  }, [isLoading, projects.length, subscriptionData?.data?.exists]);

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
        title="Projects"
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
            title="Projects"
            description="You have no projects yet."
            searchSlot={<InlineProjectSearch subscribedIds={subscribedProjectIds} />}
            primaryActionSlot={(
              <Button variant="outline" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create a new project
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/$projectId"
                params={{ projectId: project.fingerprint }}
              >
                <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <FolderKanban className="text-muted-foreground mt-0.5 size-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium">{project.name}</h3>
                        {project.description && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                            {project.description}
                          </p>
                        )}
                      </div>
                      {project.owner !== 1 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="hover:bg-muted shrink-0 rounded p-1 transition-colors"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreHorizontal className="text-muted-foreground size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                setUnsubscribeId(project.id);
                              }}
                            >
                              Unsubscribe
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Main>

      <ConfirmDialog
        open={!!unsubscribeId}
        onOpenChange={(open) => { if (!open) setUnsubscribeId(null); }}
        title="Unsubscribe"
        desc="Are you sure you want to unsubscribe from this project?"
        confirmText="Unsubscribe"
        destructive
        isLoading={unsubscribeMutation.isPending}
        handleConfirm={() => {
          if (unsubscribeId) unsubscribeMutation.mutate(unsubscribeId);
        }}
      />

    </>
  );
}
