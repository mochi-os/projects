import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Main,
  Card,
  CardContent,
  Button,
  usePageTitle,
  EmptyState,
  Skeleton,
  PageHeader,
} from "@mochi/common";
import { FolderKanban, Plus } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useSidebarContext } from "@/context/sidebar-context";
import { formatDistanceToNow } from "date-fns";

export function ProjectsListPage() {
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const refresh = useProjectsStore((state) => state.refresh);
  const { openCreateDialog } = useSidebarContext();

  usePageTitle("Projects");

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project to start tracking your tasks and issues."
          >
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Create project
            </Button>
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
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium">{project.name}</h3>
                        {project.description && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                            {project.description}
                          </p>
                        )}
                        <p className="text-muted-foreground mt-2 text-xs">
                          {project.ownername && (
                            <span>{project.ownername} · </span>
                          )}
                          Updated{" "}
                          {formatDistanceToNow(
                            new Date(project.updated * 1000),
                            {
                              addSuffix: true,
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Main>
    </>
  );
}
