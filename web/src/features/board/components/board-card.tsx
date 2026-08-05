// Mochi Projects: Board card component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { t } from '@lingui/core/macro'
import { EntityBoardCard, type EntityBoardCardProps } from '@mochi/web'
import type { ProjectObject } from '@/types'

type BoardCardProps = Omit<
  EntityBoardCardProps<ProjectObject>,
  'fallbackTitle' | 'containerId'
> & { projectId?: string; prefix: string }

export function BoardCard({ projectId, prefix, ...props }: BoardCardProps) {
  return (
    <EntityBoardCard
      {...props}
      containerId={projectId}
      fallbackTitle={(object) =>
        typeof object.number === 'number' ? `${prefix}-${object.number}` : t`Untitled`
      }
    />
  )
}
