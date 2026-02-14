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
  getAppPath,
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
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FolderKanban className="text-muted-foreground mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              Projects
            </p>
            <p className="text-muted-foreground mb-4 max-w-sm text-xs">
              You have no projects yet.
            </p>
            <InlineProjectSearch subscribedIds={subscribedProjectIds} />
            <Button variant="outline" onClick={openCreateDialog} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create a new project
            </Button>
            <RecommendedProjects subscribedIds={subscribedProjectIds} onSubscribe={() => void refresh()} />
          </div>
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

      <SubscribeDialog
        open={subscribeOpen}
        onOpenChange={setSubscribeOpen}
        app="projects"
        label="Project updates"
        appBase={getAppPath()}
        subscriptions={[
          { label: "Project updates", type: "update", defaultEnabled: true },
          { label: "Assignments", type: "assignment", defaultEnabled: true },
        ]}
        onResult={() => refetchSubscription()}
      />
    </>
  );
}
