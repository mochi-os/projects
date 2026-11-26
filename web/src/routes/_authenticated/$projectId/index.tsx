// Mochi Projects: Project page with board and tree views
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// The page body is ProjectPageContent in features/projects/pages/project-page.tsx,
// shared with the item route. It lives outside the routes folder so
// TanStack can load it on demand: a route file another file imports stays
// in the first load whole. Nothing but the route tree imports a route file.
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import type { ProjectDetails } from '@/types'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  EntityLoadError,
  extractStatus,
  getErrorMessage,
  toast,
  entityObjectsQuery,
  entityPeopleQuery,
} from '@mochi/web'
import { FolderKanban } from 'lucide-react'
import projectsApi from '@/api/projects'
import { ProjectPageContent } from '@/features/projects/pages'

interface SearchParams {
  view?: string
}

export const Route = createFileRoute('/_authenticated/$projectId/')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    view: typeof search.view === 'string' ? search.view : undefined,
  }),
  loader: async ({ params, context }) => {
    // The items and people need only the address, so they start beside the
    // details rather than after them; the page's queries join them.
    void context.queryClient.prefetchQuery(
      entityObjectsQuery(projectsApi.listObjects, params.projectId)
    )
    void context.queryClient.prefetchQuery(
      entityPeopleQuery(projectsApi.listPeople, params.projectId)
    )
    try {
      const projectResponse = await projectsApi.get(params.projectId)
      return { project: projectResponse.data, loaderError: null }
    } catch (error) {
      const status = extractStatus(error)
      // Redirect from the loader, not the component: a project-to-project
      // navigation re-renders the same instance rather than remounting, so a
      // mount effect never re-fires and the page is left blank.
      if (status === 403) {
        toast.error(t`You don't have access to this project.`)
        throw redirect({ to: '/' })
      }
      if (status === 404) {
        throw redirect({ to: '/' })
      }

      return {
        project: null as ProjectDetails | null,
        loaderError: getErrorMessage(error, t`Failed to load project`),
      }
    }
  },
  component: ProjectPage,
})

function ProjectPage() {
  const { t } = useLingui()
  const { project, loaderError } = Route.useLoaderData() as {
    project: ProjectDetails | null
    loaderError: string | null
  }
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()

  if (!project) {
    return (
      <EntityLoadError
        title={t`Project`}
        icon={<FolderKanban className='size-4 md:size-5' />}
        back={{
          label: t`Back to projects`,
          onFallback: () => navigate({ to: '/' }),
        }}
        message={loaderError ?? t`Failed to load project`}
        onRetry={() => void router.invalidate()}
      />
    )
  }

  return (
    <ProjectPageContent
      project={project}
      projectId={params.projectId}
      search={search}
    />
  )
}
