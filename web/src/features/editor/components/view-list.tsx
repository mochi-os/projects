// Mochi Projects: View list component for design editor
// Copyright Alistair Cunningham 2026

import { useState } from 'react'
import { Plus, Trash2, LayoutGrid, List } from 'lucide-react'
import { Button, cn, ConfirmDialog } from '@mochi/common'
import type { ProjectView } from '@/types'

interface ViewListProps {
  views: ProjectView[]
  selectedViewId: string | null
  onSelectView: (viewId: string) => void
  onAddView: () => void
  onDeleteView: (viewId: string) => void
}

export function ViewList({
  views,
  selectedViewId,
  onSelectView,
  onAddView,
  onDeleteView,
}: ViewListProps) {
  const [deleteViewId, setDeleteViewId] = useState<string | null>(null)
  const deleteView = views.find((v) => v.id === deleteViewId)

  const getViewIcon = (viewtype: string) => {
    switch (viewtype) {
      case 'list':
        return <List className="size-4" />
      case 'board':
      default:
        return <LayoutGrid className="size-4" />
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Views</h3>
        <Button variant="ghost" size="sm" onClick={onAddView}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {views.map((view) => (
          <div
            key={view.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer',
              selectedViewId === view.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
            onClick={() => onSelectView(view.id)}
          >
            {getViewIcon(view.viewtype)}
            <span className="flex-1">{view.name}</span>
            {views.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'size-6 p-0',
                  selectedViewId === view.id
                    ? 'hover:bg-primary-foreground/20'
                    : 'hover:bg-destructive/20'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteViewId(view.id)
                }}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        ))}
        {views.length === 0 && (
          <p className="text-sm text-muted-foreground px-2">No views defined</p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteViewId}
        onOpenChange={(open) => !open && setDeleteViewId(null)}
        title="Delete view"
        desc={`Are you sure you want to delete "${deleteView?.name}"?`}
        confirmText="Delete"
        destructive
        handleConfirm={() => {
          if (deleteViewId) {
            onDeleteView(deleteViewId)
            setDeleteViewId(null)
          }
        }}
      />
    </div>
  )
}
