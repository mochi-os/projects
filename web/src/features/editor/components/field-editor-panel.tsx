// Mochi Projects: Field editor panel component
// Copyright Alistair Cunningham 2026

import { useState, useEffect } from 'react'
import { Input, Label, Switch } from '@mochi/common'
import type { ProjectField } from '@/types'

interface FieldEditorPanelProps {
  field: ProjectField
  onUpdate: (updates: Partial<ProjectField>) => void
}

export function FieldEditorPanel({ field, onUpdate }: FieldEditorPanelProps) {
  const [name, setName] = useState(field.name)
  const [required, setRequired] = useState(field.required === 1)
  const [card, setCard] = useState(field.card === 1)

  // Reset state when field changes
  useEffect(() => {
    setName(field.name)
    setRequired(field.required === 1)
    setCard(field.card === 1)
  }, [field.id, field.name, field.required, field.card])

  const handleNameBlur = () => {
    if (name.trim() && name !== field.name) {
      onUpdate({ name: name.trim() })
    }
  }

  const handleRequiredChange = (checked: boolean) => {
    setRequired(checked)
    onUpdate({ required: checked ? 1 : 0 })
  }

  const handleCardChange = (checked: boolean) => {
    setCard(checked)
    onUpdate({ card: checked ? 1 : 0 })
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
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Edit field</h4>

      <div className="space-y-2">
        <Label htmlFor="field-name">Name</Label>
        <Input
          id="field-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <p className="text-sm text-muted-foreground">
          {getFieldTypeLabel(field.fieldtype)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="field-required">Required</Label>
        <Switch
          id="field-required"
          checked={required}
          onCheckedChange={handleRequiredChange}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="field-card">Show on card</Label>
        <Switch
          id="field-card"
          checked={card}
          onCheckedChange={handleCardChange}
        />
      </div>
    </div>
  )
}
