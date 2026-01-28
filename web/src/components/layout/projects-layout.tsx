import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AuthenticatedLayout,
  type SidebarData,
  type NavItem,
  SearchEntityDialog,
} from "@mochi/common";
import { FolderKanban, Plus, Search } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { SidebarProvider, useSidebarContext } from "@/context/sidebar-context";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { APP_ROUTES } from "@/config/routes";
import endpoints from "@/api/endpoints";
import projectsApi from "@/api/projects";

function ProjectsLayoutInner() {
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const refresh = useProjectsStore((state) => state.refresh);
  const {
    createDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    searchDialogOpen,
    openSearchDialog,
    closeSearchDialog,
  } = useSidebarContext();
  const navigate = useNavigate();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Set of project IDs the user already has access to
  const accessibleProjectIds = useMemo(
    () =>
      new Set(
        projects.flatMap((p) =>
          [p.id, p.fingerprint].filter((x): x is string => !!x),
        ),
      ),
    [projects],
  );

  // Handle subscribing to a remote project from search
  const handleSubscribe = useCallback(
    async (projectId: string, entity: { fingerprint?: string; server?: string }) => {
      await projectsApi.subscribe(projectId, entity.server);
      await refresh();
      const id = entity.fingerprint ?? projectId;
      await navigate({ to: APP_ROUTES.PROJECTS.VIEW(id) });
    },
    [navigate, refresh],
  );

  // Handle bookmarking a remote project from search
  const handleBookmark = useCallback(
    async (projectId: string, server?: string) => {
      await projectsApi.bookmarkAdd(projectId, server);
      await refresh();
    },
    [refresh],
  );

  const sidebarData: SidebarData = useMemo(() => {
    // Sort projects alphabetically by name
    const sortedProjects = [...projects].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

    // Build project items - use fingerprint for shorter URLs
    const projectItems: NavItem[] = sortedProjects.map((project) => {
      const id = project.fingerprint ?? project.id;
      return {
        title: project.name,
        url: APP_ROUTES.PROJECTS.VIEW(id),
        icon: FolderKanban,
      };
    });

    const allProjectsItem: NavItem = {
      title: "All projects",
      url: "/",
      icon: FolderKanban,
    };

    // Build action items (moved to bottom)
    const actionItems: NavItem[] = [
      { title: "Find projects", icon: Search, onClick: openSearchDialog },
      { title: "Create project", icon: Plus, onClick: openCreateDialog },
    ];

    const groups: SidebarData["navGroups"] = [
      {
        title: "Projects",
        items: [allProjectsItem, ...projectItems],
      },
      {
        title: "",
        items: actionItems,
        separator: true,
      },
    ];

    return { navGroups: groups };
  }, [projects, openCreateDialog, openSearchDialog]);

  return (
    <>
      <AuthenticatedLayout
        sidebarData={sidebarData}
        isLoadingSidebar={isLoading && projects.length === 0}
      />
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
        }}
        hideTrigger
      />
      <SearchEntityDialog
        open={searchDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeSearchDialog();
        }}
        onSubscribe={handleSubscribe}
        onBookmark={handleBookmark}
        subscribedIds={accessibleProjectIds}
        entityClass="project"
        searchEndpoint={endpoints.projects.search}
        icon={FolderKanban}
        iconClassName="bg-blue-500/10 text-blue-600"
        title="Find projects"
        placeholder="Search by name, ID, fingerprint, or URL..."
        emptyMessage="No projects found"
        subscribeLabel="Subscribe"
        bookmarkLabel="Bookmark"
      />
    </>
  );
}

export function ProjectsLayout() {
  return (
    <SidebarProvider>
      <ProjectsLayoutInner />
    </SidebarProvider>
  );
}
