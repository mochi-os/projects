// Mochi Projects: Diff viewer page (standalone, no sidebar)
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import {
  DiffViewer,
  DiffViewToggle,
  EmptyState,
  GeneralError,
  Main,
  PageHeader,
  usePageTitle,
  useAuthStore,
  isInShell,
  toast,
  getErrorMessage,
} from '@mochi/web'
import { diffWords } from 'diff'
import { Loader2, Rows3 } from 'lucide-react'
import projectsApi from '@/api/projects'

interface DiffSearchParams {
  repository: string
  source: string
  target: string
}

export const Route = createFileRoute('/$projectId/diff')({
  component: DiffPage,
  beforeLoad: async () => {
    const store = useAuthStore.getState()
    if (!store.isInitialized) {
      await store.initialize()
    }
  },
  validateSearch: (search: Record<string, unknown>): DiffSearchParams => ({
    repository: typeof search.repository === 'string' ? search.repository : '',
    source: typeof search.source === 'string' ? search.source : '',
    target: typeof search.target === 'string' ? search.target : '',
  }),
})

function DiffPage() {
  const { t } = useLingui()
  const { repository, source, target } = Route.useSearch()
  const queryClient = useQueryClient()

  usePageTitle(t`Diff: ${source} → ${target}`)

  const {
    data: diffData,
    isLoading: diffLoading,
    error: diffError,
    refetch: refetchDiff,
  } = useQuery({
    queryKey: ['diff', repository, target, source],
    queryFn: async () => {
      const response = await projectsApi.getDiff(repository, target, source)
      return response.data
    },
    enabled: !!repository && !!source && !!target,
  })

  const {
    data: prefData,
    error: prefError,
    refetch: refetchPreference,
  } = useQuery({
    queryKey: ['diff-preference'],
    queryFn: async () => {
      const response = await projectsApi.getDiffPreference()
      return response.data
    },
  })

  const viewStyle = (prefData?.style as 'unified' | 'split') || 'unified'

  const prefMutation = useMutation({
    mutationFn: (style: string) => projectsApi.setDiffPreference(style),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diff-preference'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t`Could not change the view style`))
    },
  })

  if (!repository || !source || !target) {
    return (
      <GeneralError
        error={new Error(t`Missing repo, source, or target parameters`)}
      />
    )
  }

  if (diffLoading) {
    return (
      <Main className='flex h-svh items-center justify-center'>
        <Loader2 className='text-muted-foreground size-6 animate-spin' />
      </Main>
    )
  }

  // Standalone page (no AuthenticatedLayout), so it applies the shell
  // app-switcher offset itself.
  return (
    <div
      className={`flex h-svh flex-col overflow-hidden ${isInShell() ? 'md:ps-24' : ''}`}
    >
      <PageHeader
        title={`${source} → ${target}`}
        actions={
          <DiffViewToggle
            value={viewStyle}
            onChange={(next) => prefMutation.mutate(next)}
          />
        }
      />
      <div className='flex-1 overflow-auto px-4 pb-8 md:px-6'>
        {prefError && (
          <div className='py-4'>
            <GeneralError
              error={prefError}
              minimal
              mode='inline'
              reset={() => {
                void refetchPreference()
              }}
            />
          </div>
        )}
        {diffError ? (
          <div className='py-4'>
            <GeneralError
              error={diffError}
              minimal
              mode='inline'
              reset={() => {
                void refetchDiff()
              }}
            />
          </div>
        ) : typeof diffData === 'string' ? (
          <DiffViewer diff={diffData} viewStyle={viewStyle} words={diffWords} />
        ) : diffData ? (
          <div className='text-destructive py-8 text-center text-sm'>
            {diffData.error}
          </div>
        ) : (
          <div className='py-8'>
            <EmptyState
              icon={Rows3}
              title={t`No diff available`}
              description={t`No changes were found for the selected comparison.`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
