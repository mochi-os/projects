// Mochi Projects: Conflict list component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { Trans, Plural } from '@lingui/react/macro'
import { AlertTriangle, FileWarning } from 'lucide-react'

interface ConflictListProps {
  conflicts: string[]
}

export function ConflictList({ conflicts }: ConflictListProps) {
  if (conflicts.length === 0) {
    return null
  }

  return (
    <div className='space-y-2'>
      <div className='text-destructive flex items-center gap-2 text-sm font-medium'>
        <AlertTriangle className='size-4' />
        <Plural
          value={conflicts.length}
          one='# conflicting file'
          other='# conflicting files'
        />
      </div>
      <div className='bg-destructive/10 border-destructive/20 rounded-md border p-3'>
        <ul className='space-y-1.5'>
          {conflicts.map((file) => (
            <li key={file} className='flex items-center gap-2 text-xs'>
              <FileWarning className='text-destructive size-3 shrink-0' />
              <span className='truncate font-mono'>{file}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className='text-muted-foreground text-xs'>
        <Trans>Resolve these conflicts manually before merging.</Trans>
      </p>
    </div>
  )
}
