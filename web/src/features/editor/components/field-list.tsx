// Mochi Projects: Field list component for design editor
// Copyright Alistair Cunningham 2026

import { useState } from 'react'
import { Plus, GripVertical, Trash2 } from 'lucide-react'
import { Button, cn, ConfirmDialog } from '@mochi/common'
import type { ProjectField } from '@/types'

interface FieldListProps {
  fields: ProjectField[]
  selectedFieldId: string | null
  onSelectField: (fieldId: string) => void
  onAddField: () => void
  onDeleteField: (fieldId: string) => void
  onReorder: (order: string[]) => void
}

export function FieldList({
  fields,
  selectedFieldId,
  onSelectField,
  onAddField,
  onDeleteField,
  onReorder,
}: FieldListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null)
  const deleteField = fields.find((f) => f.id === deleteFieldId)

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedId(fieldId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault()
    if (draggedId && draggedId !== fieldId) {
      setDragOverId(fieldId)
    }
  }

  const handleDragEnd = () => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const newOrder = [...fields.map((f) => f.id)]
      const draggedIndex = newOrder.indexOf(draggedId)
      const targetIndex = newOrder.indexOf(dragOverId)

      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, draggedId)

      onReorder(newOrder)
    }
    setDraggedId(null)
    setDragOverId(null)
  }

  const getFieldTypeLabel = (fieldtype: string) => {
    const labels: Record<string, string> = {
      text: 'Text',
      number: 'Number',
      date: 'Date',
      enum: 'Select',
      user: 'User',
      object: 'Object',
      checkbox: 'Checkbox',
    }
    return labels[fieldtype] || fieldtype
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Fields</h3>
        <Button variant="ghost" size="sm" onClick={onAddField}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {fields.map((field) => (
          <div
            key={field.id}
            draggable
            onDragStart={(e) => handleDragStart(e, field.id)}
            onDragOver={(e) => handleDragOver(e, field.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer',
              selectedFieldId === field.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
              dragOverId === field.id && 'border-t-2 border-primary'
            )}
            onClick={() => onSelectField(field.id)}
          >
            <GripVertical className="size-4 cursor-grab opacity-50" />
            <span className="flex-1">{field.name}</span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                selectedFieldId === field.id
                  ? 'bg-primary-foreground/20'
                  : 'bg-muted'
              )}
            >
              {getFieldTypeLabel(field.fieldtype)}
            </span>
            {field.required === 1 && (
              <span className="text-xs text-destructive">*</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'size-6 p-0',
                selectedFieldId === field.id
                  ? 'hover:bg-primary-foreground/20'
                  : 'hover:bg-destructive/20'
              )}
              onClick={(e) => {
                e.stopPropagation()
                setDeleteFieldId(field.id)
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground px-2">No fields defined</p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteFieldId}
        onOpenChange={(open) => !open && setDeleteFieldId(null)}
        title="Delete field"
        desc={`Are you sure you want to delete "${deleteField?.name}"? This will remove this field from all objects.`}
        confirmText="Delete"
        destructive
        handleConfirm={() => {
          if (deleteFieldId) {
            onDeleteField(deleteFieldId)
            setDeleteFieldId(null)
          }
        }}
      />
    </div>
  )
}
