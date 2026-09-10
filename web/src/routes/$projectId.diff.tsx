// Mochi Projects: Diff viewer page (standalone, no sidebar)
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
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
import { Loader2, Rows3, Columns2 } from 'lucide-react'
import projectsApi from '@/api/projects'
import { DiffViewer } from '@/features/requests/components/diff-viewer'

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

  const toggleView = () => {
    const next = viewStyle === 'unified' ? 'split' : 'unified'
    prefMutation.mutate(next)
  }

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
          <div className='flex overflow-hidden rounded-md border text-sm'>
            <button
              type='button'
              onClick={() => viewStyle !== 'unified' && toggleView()}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                viewStyle === 'unified'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-hover'
              }`}
            >
              <Rows3 className='size-3.5' />
              <Trans>Unified</Trans>
            </button>
            <button
              type='button'
              onClick={() => viewStyle !== 'split' && toggleView()}
              className={`flex items-center gap-1.5 border-s px-3 py-1.5 transition-colors ${
                viewStyle === 'split'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-hover'
              }`}
            >
              <Columns2 className='size-3.5' />
              <Trans>Split</Trans>
            </button>
          </div>
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
          <DiffViewer diff={diffData} viewStyle={viewStyle} />
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
