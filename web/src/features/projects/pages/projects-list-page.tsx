import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Main,
  Card,
  CardContent,
  Button,
  usePageTitle,
  Skeleton,
  PageHeader,
  SubscribeDialog,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  GeneralError,
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
  const [subscribeOpen, setSubscribeOpen] = useState(false);
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

  useEffect(() => {
    if (!isLoading && projects.length > 0 && subscriptionData?.data?.exists === false) {
      setSubscribeOpen(true);
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
              minimal
              className="h-auto min-h-[200px]"
              error={new Error(error)}
            />
          </div>
        )}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Projects"
            description="You have no projects yet."
            childrenLayout="column"
            childrenClassName="w-full max-w-md"
          >
            <div className="w-full">
              <InlineProjectSearch subscribedIds={subscribedProjectIds} />
            </div>
            <Button variant="outline" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create a new project
            </Button>
            <div className="w-full">
              <RecommendedProjects
                subscribedIds={subscribedProjectIds}
                onSubscribe={() => void refresh()}
              />
            </div>
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/$projectId"
                params={{ projectId: project.fingerprint }}
              >
                <Card className="hover:border-primary/50 cursor-pointer transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium">{project.name}</h3>
                        {project.description && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                            {project.description}
                          </p>
                        )}
                      </div>
                      {project.server && (
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

      <SubscribeDialog
        open={subscribeOpen}
        onOpenChange={setSubscribeOpen}
        app="projects"
        label="Project updates"
        appBase="/projects"
        subscriptions={[
          { label: "Project updates", type: "update", defaultEnabled: true },
          { label: "Assignments", type: "assignment", defaultEnabled: true },
        ]}
        onResult={() => refetchSubscription()}
      />
    </>
  );
}
