// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useCallback, useMemo } from 'react'
import { useLingui } from '@lingui/react/macro'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban } from 'lucide-react'
import { FindEntityPage, toastAction, getErrorMessage } from '@mochi/web'
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
    async (projectId: string, entity: { fingerprint?: string; location?: string; peer?: string }) => {
      try {
        await toastAction(projectsApi.subscribe(projectId, entity.location, entity.peer), {
          loading: t`Subscribing...`,
          success: t`Subscribed`,
          error: (e) => getErrorMessage(e, t`Failed to subscribe`),
        })
        await refresh()
        // `||`, not `??`: a probed remote with no fingerprint of its own comes
        // back carrying "" rather than nothing (see action_search in
        // projects.star), and an empty id routes to the list root instead of
        // the project.
        const id = entity.fingerprint || projectId
        await navigate({ to: APP_ROUTES.PROJECTS.VIEW(id) })
      } catch {
        // toast already shown
      }
    },
    [navigate, refresh, t],
  )

  // Resolve a pasted mochi:// share link to the project's name via probe, so
  // the card shows the real project rather than a raw entity id.
  const resolveUri = useCallback(async (url: string) => {
    const response = await projectsApi.probe(url)
    const data = response.data ?? response
    if (!data?.id) return null
    return { ...data, location: data.server ?? '', peer: data.peer }
  }, [])

  return (
    <FindEntityPage
      resolveUri={resolveUri}
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
