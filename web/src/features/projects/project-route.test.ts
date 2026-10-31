// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// Not colocated under src/routes: the TanStack route generator has no
// routeFileIgnorePattern configured, so any file there becomes a route.
import { createElement, type ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { isRedirect } from '@tanstack/react-router'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const toastError = vi.fn()

vi.mock('@/api/projects', () => ({
  default: {
    get: vi.fn(),
    list: vi.fn(),
    listObjects: vi.fn(),
    listPeople: vi.fn(),
  },
}))

vi.mock('@mochi/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mochi/web')>()
  return { ...actual, toast: { ...actual.toast, error: toastError } }
})

const { Route } = await import('@/routes/_authenticated/$projectId/index')
const { Route: ObjectRoute } =
  await import('@/routes/_authenticated/$projectId/$objectId')
const { Route: LayoutRoute } = await import('@/routes/_authenticated/route')
const { useProjectsStore } = await import('@/stores/projects-store')
const projectsApi = (await import('@/api/projects')).default
const { createQueryClient, entityObjectsQuery, entityPeopleQuery } =
  await import('@mochi/web')
const { QueryClientProvider, useQuery } = await import('@tanstack/react-query')

const api = vi.mocked(projectsApi)
type Loader = (context: {
  params: { projectId: string; objectId?: string }
  context: { queryClient: QueryClient }
}) => Promise<{ project: unknown; loaderError: string | null }>
const loader = Route.options.loader as Loader

function httpError(status: number) {
  return { response: { status } }
}

async function runLoader(projectId = 'p1', queryClient = new QueryClient()) {
  return loader({ params: { projectId }, context: { queryClient } })
}

describe('project route loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects a forbidden project from the loader, not the component', async () => {
    // The component instance is reused across a project-to-project navigation,
    // so a redirect that lives in a mount effect never runs and the page is
    // left blank. Only a loader throw survives that.
    api.get.mockRejectedValue(httpError(403))
    const thrown = await runLoader().then(
      () => null,
      (e: unknown) => e
    )
    expect(thrown).not.toBeNull()
    expect(isRedirect(thrown)).toBe(true)
    // redirect() builds a Response and hangs the original options off it.
    expect((thrown as { options?: { to?: string } }).options?.to).toBe('/')
  })

  it('says why, rather than bouncing the user silently', async () => {
    api.get.mockRejectedValue(httpError(403))
    await runLoader().catch(() => {})
    expect(toastError).toHaveBeenCalledWith(
      "You don't have access to this project."
    )
  })

  it('still redirects a missing project', async () => {
    api.get.mockRejectedValue(httpError(404))
    const thrown = await runLoader().then(
      () => null,
      (e: unknown) => e
    )
    expect(isRedirect(thrown)).toBe(true)
  })

  it('keeps other failures on the page as a retryable error', async () => {
    // 500 must NOT redirect: EntityLoadError offers a retry, and bouncing the
    // user home would throw away a transient failure they could recover from.
    api.get.mockRejectedValue(httpError(500))
    const data = await runLoader()
    expect(data.project).toBeNull()
    expect(data.loaderError).toBeTruthy()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('returns the project when it loads', async () => {
    api.get.mockResolvedValue({ data: { project: { id: 'p1' } } } as never)
    const data = await runLoader()
    expect(data.project).toEqual({ project: { id: 'p1' } })
    expect(data.loaderError).toBeNull()
  })
})

describe('project route lists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listObjects.mockResolvedValue({
      data: { objects: [], watched: [] },
    } as never)
    api.listPeople.mockResolvedValue({ data: { people: [] } } as never)
  })

  for (const [name, route, params] of [
    ['project page', Route, { projectId: 'p1' }],
    ['item address', ObjectRoute, { projectId: 'p1', objectId: 'o1' }],
  ] as const) {
    it(`asks for the items and people beside the details on the ${name}`, async () => {
      // Nothing in either list depends on the details, so neither waits for
      // them: the details here never answer, and both lists are still asked.
      api.get.mockReturnValue(new Promise(() => {}) as never)
      const queryClient = createQueryClient()
      void (route.options.loader as Loader)({
        params,
        context: { queryClient },
      })
      await waitFor(() => expect(api.listObjects).toHaveBeenCalledWith('p1'))
      expect(api.listPeople).toHaveBeenCalledWith('p1')
    })
  }

  it("lets the page's own queries use what the loader started", async () => {
    // The app's client marks everything stale at once; the page must still
    // not download the lists a second time when it mounts.
    api.get.mockResolvedValue({ data: { project: { id: 'p1' } } } as never)
    const queryClient = createQueryClient()
    await runLoader('p1', queryClient)
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)
    const objects = renderHook(
      () => useQuery(entityObjectsQuery(projectsApi.listObjects, 'p1')),
      { wrapper }
    )
    const people = renderHook(
      () => useQuery(entityPeopleQuery(projectsApi.listPeople, 'p1')),
      { wrapper }
    )
    await waitFor(() => expect(objects.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(people.result.current.isSuccess).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(api.listObjects).toHaveBeenCalledTimes(1)
    expect(api.listPeople).toHaveBeenCalledTimes(1)
  })
})

describe('authenticated layout route', () => {
  it('starts the sidebar list beside the page, once', async () => {
    const list = vi.mocked(projectsApi.list)
    list.mockResolvedValue({ data: { projects: [] } } as never)
    useProjectsStore.setState({ started: false })
    const layoutLoader = LayoutRoute.options.loader as () => void
    layoutLoader()
    expect(list).toHaveBeenCalledTimes(1)
    // The layout's mount joins it rather than sending a second.
    await useProjectsStore.getState().load()
    expect(list).toHaveBeenCalledTimes(1)
    // A later navigation runs the loader again; the list is not asked again.
    layoutLoader()
    expect(list).toHaveBeenCalledTimes(1)
  })
})
