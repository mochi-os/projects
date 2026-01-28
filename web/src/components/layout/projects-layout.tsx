import { useEffect, useMemo } from "react";
import {
  AuthenticatedLayout,
  type SidebarData,
  type NavItem,
} from "@mochi/common";
import { FolderKanban, Plus } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { SidebarProvider, useSidebarContext } from "@/context/sidebar-context";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { APP_ROUTES } from "@/config/routes";

function ProjectsLayoutInner() {
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const refresh = useProjectsStore((state) => state.refresh);
  const { createDialogOpen, openCreateDialog, closeCreateDialog } =
    useSidebarContext();

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      {
        title: "Create project",
        icon: Plus,
        onClick: openCreateDialog,
      },
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
  }, [projects, openCreateDialog]);

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
