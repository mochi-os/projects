// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import type { ComponentType } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import projectsApi from '@/api/projects'
import { Route } from './$projectId.diff'

const toastError = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useSearch: () => ({ repository: 'r1', source: 'feature', target: 'main' }),
  }),
}))
vi.mock('@/api/projects', () => ({
  default: {
    getDiff: vi.fn(),
    getDiffPreference: vi.fn(),
    setDiffPreference: vi.fn(),
  },
}))
// The toggle and the diff are lib/web's; here the toggle is two buttons and
// the diff names the style it was drawn in.
vi.mock('@mochi/web', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mochi/web')>()),
  DiffViewToggle: ({ onChange }: { onChange: (next: string) => void }) => (
    <>
      <button onClick={() => onChange('unified')}>Unified</button>
      <button onClick={() => onChange('split')}>Split</button>
    </>
  ),
  DiffViewer: ({ viewStyle }: { viewStyle: string }) => (
    <p>drawn {viewStyle}</p>
  ),
  toast: { error: toastError },
}))

const DiffPage = (Route as unknown as { options: { component: ComponentType } })
  .options.component

function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <DiffPage />
      </QueryClientProvider>
    </I18nProvider>
  )
}

// Unified and Split switch the diff on the click and back if the server
// refuses the saved preference.
describe('Diff page view style', () => {
  let refuse: (error: unknown) => void
  beforeEach(() => {
    toastError.mockReset()
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: 'diff --git a/x b/x',
    } as never)
    vi.mocked(projectsApi.getDiffPreference).mockResolvedValue({
      data: { style: 'unified' },
    } as never)
    vi.mocked(projectsApi.setDiffPreference).mockReturnValue(
      new Promise((_resolve, reject) => {
        refuse = reject
      })
    )
  })

  it('switches at once and back when refused', async () => {
    show()
    expect(await screen.findByText('drawn unified')).toBeInTheDocument()

    // The header draws its actions once per layout.
    fireEvent.click(screen.getAllByRole('button', { name: 'Split' })[0])
    expect(await screen.findByText('drawn split')).toBeInTheDocument()

    refuse({ response: { status: 500 } })
    expect(await screen.findByText('drawn unified')).toBeInTheDocument()
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Could not change the view style')
    )
  })
})
