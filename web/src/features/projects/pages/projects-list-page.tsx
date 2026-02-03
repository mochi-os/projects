import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Main,
  Card,
  CardContent,
  Button,
  usePageTitle,
  Skeleton,
  PageHeader,
} from "@mochi/common";
import { FolderKanban, Plus } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useSidebarContext } from "@/context/sidebar-context";
import { formatDistanceToNow } from "date-fns";
import { InlineProjectSearch } from "../components/inline-project-search";

export function ProjectsListPage() {
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const refresh = useProjectsStore((state) => state.refresh);
  const { openCreateDialog } = useSidebarContext();

  usePageTitle("Projects");

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
          </div>
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
