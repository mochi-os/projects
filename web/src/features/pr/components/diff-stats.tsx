// Mochi Projects: Diff stats component
// Copyright Alistair Cunningham 2026

import { useQuery } from '@tanstack/react-query'
import { FileCode2, Plus, Minus, Loader2 } from 'lucide-react'
import { cn } from '@mochi/common'
import projectsApi from '@/api/projects'

interface DiffStatsProps {
  repoId: string
  base: string
  head: string
}

export function DiffStats({ repoId, base, head }: DiffStatsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['diff', repoId, base, head],
    queryFn: async () => {
      const response = await projectsApi.getDiff(repoId, base, head)
      return response.data
    },
    enabled: !!repoId && !!base && !!head,
  })

  if (!repoId || !base || !head) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading diff...
      </div>
    )
  }

  if (!data || data.files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No changes detected</div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <FileCode2 className="size-4 text-muted-foreground" />
          {data.files.length} files changed
        </span>
        <span className="flex items-center gap-1 text-green-600">
          <Plus className="size-3" />
          {data.additions}
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <Minus className="size-3" />
          {data.deletions}
        </span>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {data.files.map((file) => (
          <div
            key={file.path}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <StatusIcon status={file.status} />
              <span className="font-mono truncate">{file.path}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {file.additions > 0 && (
                <span className="text-green-600">+{file.additions}</span>
              )}
              {file.deletions > 0 && (
                <span className="text-red-600">-{file.deletions}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    added: 'bg-green-500',
    modified: 'bg-amber-500',
    deleted: 'bg-red-500',
    renamed: 'bg-blue-500',
  }

  return (
    <span
      className={cn(
        'size-2 rounded-full shrink-0',
        colors[status] || 'bg-muted-foreground'
      )}
    />
  )
}
