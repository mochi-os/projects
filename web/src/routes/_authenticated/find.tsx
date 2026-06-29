// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useCallback, useMemo } from 'react'
import { useLingui } from '@lingui/react/macro'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban } from 'lucide-react'
import { FindEntityPage, toastAction, getErrorMessage, callWithServerFallback } from '@mochi/web'
import { useProjectsStore } from '@/stores/projects-store'
import { APP_ROUTES } from '@/config/routes'
import endpoints from '@/api/endpoints'
import projectsApi from '@/api/projects'

export const Route = createFileRoute('/_authenticated/find')({
  component: FindProjectsPage,
})

function FindProjectsPage() {
  const { t } = useLingui()
  const projects = useProjectsStore((state) => state.projects)
  const refresh = useProjectsStore((state) => state.refresh)
  const navigate = useNavigate()

  // Recommendations query
  const {
    data: recommendationsData,
    isLoading: isLoadingRecommendations,
    isError: isRecommendationsError,
    error: recommendationsError,
    refetch: refetchRecommendations,
  } = useQuery({
    queryKey: ['projects', 'recommendations'],
    queryFn: () => projectsApi.recommendations(),
    retry: false,
    refetchOnWindowFocus: false,
  })
  const recommendations = recommendationsData?.data?.projects ?? []

  const accessibleProjectIds = useMemo(
    () =>
      new Set(
        projects.flatMap((p) =>
          [p.id, p.fingerprint].filter((x): x is string => !!x),
        ),
      ),
    [projects],
  )

  const handleSubscribe = useCallback(
    async (projectId: string, entity: { fingerprint?: string; server?: string }) => {
      try {
        await toastAction(
          callWithServerFallback(
            (server) => projectsApi.subscribe(projectId, server),
            entity.server,
          ),
          {
          loading: t`Subscribing...`,
          success: t`Subscribed`,
          error: (e) => getErrorMessage(e, t`Failed to subscribe`),
        })
        await refresh()
        const id = entity.fingerprint ?? projectId
        await navigate({ to: APP_ROUTES.PROJECTS.VIEW(id) })
      } catch {
        // toast already shown
      }
    },
    [navigate, refresh, t],
  )

  return (
    <FindEntityPage
      onSubscribe={handleSubscribe}
      subscribedIds={accessibleProjectIds}
      entityClass="project"
      searchEndpoint={endpoints.projects.search}
      icon={FolderKanban}
      iconClassName="bg-primary/10 text-primary"
      title={t`Find projects`}
      placeholder={t`Search by name, ID, fingerprint, or URL...`}
      emptyMessage={t`No projects found`}
      recommendations={recommendations}
      isLoadingRecommendations={isLoadingRecommendations}
      isRecommendationsError={isRecommendationsError}
      recommendationsError={recommendationsError}
      onRetryRecommendations={() => {
        void refetchRecommendations();
      }}
    />
  )
}
