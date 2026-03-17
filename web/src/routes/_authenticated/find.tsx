import { useCallback, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban } from 'lucide-react'
import { FindEntityPage } from '@mochi/web'
import { useProjectsStore } from '@/stores/projects-store'
import { APP_ROUTES } from '@/config/routes'
import endpoints from '@/api/endpoints'
import projectsApi from '@/api/projects'

export const Route = createFileRoute('/_authenticated/find')({
  component: FindProjectsPage,
})

function FindProjectsPage() {
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
      await projectsApi.subscribe(projectId, entity.server)
      await refresh()
      const id = entity.fingerprint ?? projectId
      await navigate({ to: APP_ROUTES.PROJECTS.VIEW(id) })
    },
    [navigate, refresh],
  )

  return (
    <FindEntityPage
      onSubscribe={handleSubscribe}
      subscribedIds={accessibleProjectIds}
      entityClass="project"
      searchEndpoint={endpoints.projects.search}
      icon={FolderKanban}
      iconClassName="bg-blue-500/10 text-blue-600"
      title="Find projects"
      placeholder="Search by name, ID, fingerprint, or URL..."
      emptyMessage="No projects found"
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
