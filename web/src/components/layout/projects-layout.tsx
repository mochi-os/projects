// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { APP_ROUTES } from '@/config/routes'
import { useLingui } from '@lingui/react/macro'
import { EntitySidebarProvider, useEntitySidebarContext } from '@mochi/web'
import { EntityLayout } from '@mochi/web/components/entity/entity-layout'
import { FolderKanban } from 'lucide-react'
import { useProjectsStore } from '@/stores/projects-store'
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog'

function ProjectsLayoutInner() {
  const { t } = useLingui()
  const projects = useProjectsStore((state) => state.rows)
  const isLoading = useProjectsStore((state) => state.isLoading)
  const error = useProjectsStore((state) => state.error)
  const refresh = useProjectsStore((state) => state.refresh)
  const { createDialogOpen, openCreateDialog, closeCreateDialog } =
    useEntitySidebarContext()

  return (
    <EntityLayout
      rows={projects}
      isLoading={isLoading}
      error={error}
      refresh={refresh}
      icon={FolderKanban}
      onCreate={openCreateDialog}
      viewUrl={APP_ROUTES.PROJECTS.VIEW}
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
          if (!open) closeCreateDialog()
        }}
        hideTrigger
      />
    </EntityLayout>
  )
}

export function ProjectsLayout() {
  return (
    <EntitySidebarProvider>
      <ProjectsLayoutInner />
    </EntitySidebarProvider>
  )
}
