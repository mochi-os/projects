// Mochi Projects: Type list component for design editor
// Copyright Alistair Cunningham 2026

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, cn, ConfirmDialog } from '@mochi/common'
import type { ProjectType } from '@/types'

interface TypeListProps {
  types: ProjectType[]
  selectedTypeId: string | null
  onSelectType: (typeId: string) => void
  onAddType: () => void
  onDeleteType: (typeId: string) => void
}

export function TypeList({
  types,
  selectedTypeId,
  onSelectType,
  onAddType,
  onDeleteType,
}: TypeListProps) {
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null)
  const deleteType = types.find((t) => t.id === deleteTypeId)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Types</h3>
        <Button variant="ghost" size="sm" onClick={onAddType}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {types.map((type) => (
          <div
            key={type.id}
            className={cn(
              'flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer',
              selectedTypeId === type.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
            onClick={() => onSelectType(type.id)}
          >
            <span>{type.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'size-6 p-0',
                selectedTypeId === type.id
                  ? 'hover:bg-primary-foreground/20'
                  : 'hover:bg-destructive/20'
              )}
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTypeId(type.id)
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
        {types.length === 0 && (
          <p className="text-sm text-muted-foreground px-2">No types defined</p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTypeId}
        onOpenChange={(open) => !open && setDeleteTypeId(null)}
        title="Delete type"
        desc={`Are you sure you want to delete "${deleteType?.name}"? This will also delete all fields and options for this type.`}
        confirmText="Delete"
        destructive
        handleConfirm={() => {
          if (deleteTypeId) {
            onDeleteType(deleteTypeId)
            setDeleteTypeId(null)
          }
        }}
      />
    </div>
  )
}
