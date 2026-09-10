// Mochi Projects: Diff stats component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trans, Plural } from '@lingui/react/macro'
import { cn } from '@mochi/web'
import { FileCode2, Plus, Minus, Loader2, FileDiff } from 'lucide-react'
import projectsApi from '@/api/projects'
import { parseDiff } from './diff-parser'
import {
  diffFileStatusDotStyles,
  requestStatusTextStyles,
} from './request-status-styles'

interface DiffStatsProps {
  repositoryId: string
  base: string
  head: string
  diffUrl?: string
}

export function DiffStats({
  repositoryId,
  base,
  head,
  diffUrl,
}: DiffStatsProps) {
  const {
    data: diffData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['diff', repositoryId, base, head],
    queryFn: async () => {
      const response = await projectsApi.getDiff(repositoryId, base, head)
      return response.data
    },
    enabled: !!repositoryId && !!base && !!head,
  })

  // The action answers {diff: null, error} when the repositories service is
  // unavailable. Parsing that object threw inside the memo and took the whole
  // object panel down with it.
  const rawDiff = typeof diffData === 'string' ? diffData : ''
  const unavailable =
    diffData && typeof diffData !== 'string' ? diffData.error : null
  const { files, truncated } = useMemo(
    () => (rawDiff ? parseDiff(rawDiff) : { files: [], truncated: 0 }),
    [rawDiff]
  )

  const additions = files.reduce((sum, f) => sum + f.additions, 0)
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0)

  if (!repositoryId || !base || !head) {
    return null
  }

  if (isLoading) {
    return (
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Loader2 className='size-4 animate-spin' />
        <Trans>Loading diff...</Trans>
      </div>
    )
  }

  if (isError || unavailable) {
    return (
      <div className='text-destructive text-sm'>
        {unavailable ?? <Trans>Could not load the diff</Trans>}
      </div>
    )
  }

  if (files.length === 0 && truncated === 0) {
    return (
      <div className='text-muted-foreground text-sm'>
        <Trans>No changes detected</Trans>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-4 text-sm'>
        <span className='flex items-center gap-1'>
          <FileCode2 className='text-muted-foreground size-4' />
          <Plural
            value={files.length}
            one='# file changed'
            other='# files changed'
          />
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            requestStatusTextStyles.added
          )}
        >
          <Plus className='size-3' />
          {additions}
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            requestStatusTextStyles.deleted
          )}
        >
          <Minus className='size-3' />
          {deletions}
        </span>
        {diffUrl && (
          <a
            href={diffUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground hover:bg-hover ms-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs transition-colors'
          >
            <FileDiff className='size-3' />
            <Trans>Diff</Trans>
          </a>
        )}
      </div>

      <div className='max-h-48 space-y-1 overflow-y-auto'>
        {files.map((file) => (
          <div
            key={file.path}
            className='flex items-center justify-between gap-2 text-xs'
          >
            <div className='flex min-w-0 items-center gap-2'>
              <StatusIcon status={file.status} />
              <span className='truncate font-mono'>{file.path}</span>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              {file.additions > 0 && (
                <span className={requestStatusTextStyles.added}>
                  +{file.additions}
                </span>
              )}
              {file.deletions > 0 && (
                <span className={requestStatusTextStyles.deleted}>
                  -{file.deletions}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {truncated > 0 && (
        <p className='text-muted-foreground text-xs'>
          <Plural
            value={truncated}
            one='# more file not shown'
            other='# more files not shown'
          />
        </p>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    added: diffFileStatusDotStyles.added,
    modified: diffFileStatusDotStyles.modified,
    deleted: diffFileStatusDotStyles.deleted,
    renamed: diffFileStatusDotStyles.renamed,
  }

  return (
    <span
      className={cn(
        'size-2 shrink-0 rounded-full',
        colors[status] || 'bg-muted-foreground'
      )}
    />
  )
}
