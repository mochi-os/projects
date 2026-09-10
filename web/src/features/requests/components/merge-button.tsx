// Mochi Projects: Merge button component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button, ConfirmDialog, cn, getErrorMessage } from '@mochi/web'
import { GitMerge, Loader2, CheckCircle2 } from 'lucide-react'
import projectsApi from '@/api/projects'
import { requestStatusTextStyles } from './request-status-styles'

type MergeMethod = 'merge' | 'squash' | 'rebase'

interface MergeButtonProps {
  repositoryId: string
  source: string
  target: string
  canMerge: boolean
  objectTitle: string
  objectReadable: string
  projectId?: string
  onMergeComplete?: () => void
  disabled?: boolean
}

export function MergeButton({
  repositoryId,
  source,
  target,
  canMerge,
  objectTitle,
  objectReadable,
  projectId,
  onMergeComplete,
  disabled,
}: MergeButtonProps) {
  const { t } = useLingui()
  const [showConfirm, setShowConfirm] = useState(false)
  const [method, setMethod] = useState<MergeMethod>('merge')

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const message = t`Merge ${objectReadable}: ${objectTitle}`
      const response = await projectsApi.merge(
        repositoryId,
        source,
        target,
        message,
        projectId,
        method
      )
      return response.data
    },
    onSuccess: () => {
      setShowConfirm(false)
      onMergeComplete?.()
    },
  })

  const handleMerge = () => {
    mergeMutation.mutate()
  }

  if (mergeMutation.isSuccess) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm font-medium',
          requestStatusTextStyles.added
        )}
      >
        <CheckCircle2 className='size-4' />
        <Trans>Merged successfully</Trans>
      </div>
    )
  }

  const methodLabels: Record<MergeMethod, string> = {
    merge: t`Merge commit`,
    squash: t`Squash and merge`,
    rebase: t`Rebase and merge`,
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={!canMerge || disabled || mergeMutation.isPending}
        className='flex-1'
      >
        {mergeMutation.isPending ? (
          <>
            <Loader2 className='me-2 size-4 animate-spin' />
            <Trans>Merging...</Trans>
          </>
        ) : (
          <>
            <GitMerge className='me-2 size-4' />
            {methodLabels[method]}
          </>
        )}
      </Button>

      {mergeMutation.isError && (
        <p className='text-destructive mt-2 text-xs'>
          {getErrorMessage(mergeMutation.error, t`Failed to merge`)}
        </p>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={t`Merge`}
        desc={t`This will merge "${source}" into "${target}". This action cannot be undone.`}
        confirmText={methodLabels[method]}
        isLoading={mergeMutation.isPending}
        handleConfirm={handleMerge}
      >
        <div className='space-y-2 px-1'>
          {(['merge', 'squash', 'rebase'] as const).map((m) => (
            <label
              key={m}
              className='flex cursor-pointer items-center gap-2 text-sm'
            >
              <input
                type='radio'
                name='merge-method'
                checked={method === m}
                onChange={() => setMethod(m)}
                className='accent-primary'
              />
              {methodLabels[m]}
            </label>
          ))}
        </div>
      </ConfirmDialog>
    </>
  )
}
