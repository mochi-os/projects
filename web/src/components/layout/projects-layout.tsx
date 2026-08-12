// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useLingui } from "@lingui/react/macro";
import { EntityLayout } from "@mochi/web/components/entity/entity-layout";
import { FolderKanban } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { SidebarProvider, useSidebarContext } from "@/context/sidebar-context";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { APP_ROUTES } from "@/config/routes";

function ProjectsLayoutInner() {
  const { t } = useLingui();
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const error = useProjectsStore((state) => state.error);
  const refresh = useProjectsStore((state) => state.refresh);
  const { createDialogOpen, openCreateDialog, closeCreateDialog } =
    useSidebarContext();

  return (
    <EntityLayout
      rows={projects}
      isLoading={isLoading}
      error={error}
      refresh={refresh}
      icon={FolderKanban}
      onCreate={openCreateDialog}
      viewUrl={APP_ROUTES.PROJECTS.VIEW}
      usePageHeaderForMobileNav
      labels={{
        group: t`Projects`,
        all: t`All projects`,
        find: t`Find projects`,
        create: t`Create project`,
        retry: t`Retry projects load`,
      }}
    >
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
        }}
        hideTrigger
      />
    </EntityLayout>
  );
}

export function ProjectsLayout() {
  return (
    <SidebarProvider>
      <ProjectsLayoutInner />
    </SidebarProvider>
  );
}
