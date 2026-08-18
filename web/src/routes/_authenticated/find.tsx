// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The wiring around FindEntityPage is EntityFindPage in @mochi/web, shared with
// the crm app. What stays here is the route, the wording and the icon.

import { useLingui } from '@lingui/react/macro'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FolderKanban } from 'lucide-react'
import { EntityFindPage } from '@mochi/web'
import { useProjectsStore } from '@/stores/projects-store'
import { APP_ROUTES } from '@/config/routes'
import endpoints from '@/api/endpoints'
import projectsApi from '@/api/projects'

export const Route = createFileRoute('/_authenticated/find')({
  component: FindProjectsPage,
})

function FindProjectsPage() {
  const { t } = useLingui()
  const rows = useProjectsStore((state) => state.rows)
  const refresh = useProjectsStore((state) => state.refresh)
  const navigate = useNavigate()

  return (
    <EntityFindPage
      api={projectsApi}
      listKey="projects"
      queryKey="projects"
      rows={rows}
      refresh={refresh}
      entityClass="project"
      searchEndpoint={endpoints.projects.search}
      icon={FolderKanban}
      iconClassName="bg-primary/10 text-primary"
      onOpen={(id) => navigate({ to: APP_ROUTES.PROJECTS.VIEW(id) })}
      labels={{
        title: t`Find projects`,
        placeholder: t`Search by name, ID, fingerprint, or URL...`,
        emptyMessage: t`No projects found`,
        subscribing: t`Subscribing...`,
        subscribed: t`Subscribed`,
        subscribeFailed: t`Failed to subscribe`,
      }}
    />
  )
}
