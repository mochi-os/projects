// Mochi Projects: Merge status component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useQuery } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@mochi/web'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import projectsApi from '@/api/projects'
import { requestStatusTextStyles } from './request-status-styles'

interface MergeStatusProps {
  repositoryId: string
  source: string
  target: string
}

export function MergeStatus({
  repositoryId,
  source,
  target,
}: MergeStatusProps) {
  const { t } = useLingui()
  const { data, isLoading, error } = useQuery({
    queryKey: ['merge-check', repositoryId, source, target],
    queryFn: async () => {
      const response = await projectsApi.checkMerge(
        repositoryId,
        source,
        target
      )
      return response.data
    },
    enabled: !!repositoryId && !!source && !!target,
  })

  if (!repositoryId || !source || !target) {
    return null
  }

  if (isLoading) {
    return (
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Loader2 className='size-4 animate-spin' />
        <Trans>Checking merge status...</Trans>
      </div>
    )
  }

  if (error) {
    return (
      <div className='text-destructive flex items-center gap-2 text-sm'>
        <AlertCircle className='size-4' />
        <Trans>Failed to check merge status</Trans>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // The service answered for the repositories app: mergeable is false, but
  // the branches were never compared, so say what actually happened.
  if (data.error) {
    return (
      <div className='text-destructive flex items-center gap-2 text-sm'>
        <AlertCircle className='size-4' />
        {data.error}
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2 text-sm'>
        {data.mergeable ? (
          <CheckCircle2
            className={cn(
              'size-4 shrink-0',
              requestStatusTextStyles.successIcon
            )}
          />
        ) : (
          <XCircle className='text-destructive size-4 shrink-0' />
        )}
        <span
          className={cn(
            'font-medium',
            data.mergeable ? requestStatusTextStyles.added : 'text-destructive'
          )}
        >
          {data.mergeable ? t`Ready to merge` : t`Cannot merge automatically`}
        </span>
        {(data.ahead > 0 || data.behind > 0) && (
          <span className='text-muted-foreground text-xs'>
            {[
              data.ahead > 0 && t`+${data.ahead} ahead`,
              data.behind > 0 && t`${data.behind} behind`,
            ]
              .filter(Boolean)
              .join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}
