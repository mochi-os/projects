// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { render, screen } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import projectsApi from '@/api/projects'
import { MergeStatus } from './merge-status'

vi.mock('@/api/projects', () => ({
  default: {
    checkMerge: vi.fn(),
  },
}))

describe('MergeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports a clean merge', async () => {
    vi.mocked(projectsApi.checkMerge).mockResolvedValue({
      data: { mergeable: true, conflicts: [], ahead: 2, behind: 0 },
    })
    render(<MergeStatus repositoryId='repo1' source='feature' target='main' />)
    expect(await screen.findByText('Ready to merge')).toBeInTheDocument()
  })

  it('shows the reason a check failed instead of a verdict on the branches', async () => {
    // The action answers an error status with the reason when the branches
    // were never compared: "Cannot merge automatically" would be a claim about
    // the wrong thing, and "Failed to check" hides why.
    vi.mocked(projectsApi.checkMerge).mockRejectedValue(
      new Error('Repositories service unavailable')
    )
    render(<MergeStatus repositoryId='repo1' source='feature' target='main' />)
    expect(
      await screen.findByText('Repositories service unavailable')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Cannot merge automatically')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Failed to check merge status')
    ).not.toBeInTheDocument()
  })
})
