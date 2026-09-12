// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { render, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import projectsApi from '@/api/projects'
import { RequestPanel } from './request-panel'
import type { RequestData } from '@/types'

vi.mock('@/api/projects', () => ({
  default: {
    getRepositoryBranches: vi.fn(),
    updateRequest: vi.fn(),
    createRequest: vi.fn(),
    deleteRequest: vi.fn(),
    checkMerge: vi.fn(),
  },
}))

function request(fields: Partial<RequestData> = {}): RequestData {
  return {
    id: 'request1',
    object: 'object1',
    type: 'merge',
    repository: 'flagged',
    source: '',
    target: '',
    status: 'open',
    title: 'A merge request',
    description: '',
    draft: 0,
    created: 0,
    updated: 0,
    ...fields,
  }
}

function panel(requests: RequestData[], readOnly = false) {
  return (
    <RequestPanel
      projectId='project1'
      objectId='object1'
      requests={requests}
      readOnly={readOnly}
    />
  )
}

// The seed the assertions wait on. Every negative case renders this alongside
// the case under test, so "nothing was written" is measured after the effect
// has had its chance rather than before the branches have even arrived.
const seeds = request({ id: 'seeds', repository: 'flagged' })

function seeded() {
  return expect(projectsApi.updateRequest).toHaveBeenCalledWith(
    'project1',
    'object1',
    'seeds',
    { target: 'trunk' }
  )
}

describe('RequestPanel target seeding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectsApi.updateRequest).mockResolvedValue({ data: request() })
    // 'flagged' answers as a current repositories release does; 'unflagged'
    // as one that predates the default flag.
    vi.mocked(projectsApi.getRepositoryBranches).mockImplementation(
      async (repositoryId: string) => ({
        data: {
          branches: [
            { name: 'feature', sha: 'a'.repeat(40) },
            {
              name: 'trunk',
              sha: 'b'.repeat(40),
              ...(repositoryId === 'flagged' && { default: true }),
            },
          ],
        },
      })
    )
  })

  it("seeds an empty target with the repository's default branch", async () => {
    render(panel([request()]))
    await waitFor(() =>
      expect(projectsApi.updateRequest).toHaveBeenCalledWith(
        'project1',
        'object1',
        'request1',
        { target: 'trunk' }
      )
    )
    // The flagged branch, not the alphabetically first one, and written once.
    expect(projectsApi.updateRequest).toHaveBeenCalledTimes(1)
  })

  it('leaves a target the user already chose alone', async () => {
    render(panel([request({ target: 'feature' }), seeds]))
    await waitFor(seeded)
    expect(projectsApi.updateRequest).not.toHaveBeenCalledWith(
      'project1',
      'object1',
      'request1',
      expect.anything()
    )
  })

  it('seeds nothing when no branch is flagged, as an older repositories release answers', async () => {
    render(panel([request({ repository: 'unflagged' }), seeds]))
    await waitFor(seeded)
    expect(projectsApi.updateRequest).not.toHaveBeenCalledWith(
      'project1',
      'object1',
      'request1',
      expect.anything()
    )
  })

  it('writes nothing to a request it may not edit', async () => {
    render(
      <>
        {panel([request()], true)}
        {panel([seeds])}
      </>
    )
    await waitFor(seeded)
    expect(projectsApi.updateRequest).not.toHaveBeenCalledWith(
      'project1',
      'object1',
      'request1',
      expect.anything()
    )
  })
})
