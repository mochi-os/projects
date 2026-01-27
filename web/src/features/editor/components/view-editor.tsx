// Mochi Projects: View editor component
// Copyright Alistair Cunningham 2026

import { useState, useEffect } from 'react'
import { Input, Label, RadioGroup, RadioGroupItem } from '@mochi/common'
import type { ProjectView, ProjectField } from '@/types'

interface ViewEditorProps {
  view: ProjectView
  fields: ProjectField[]
  onUpdate: (updates: Partial<ProjectView>) => void
}

export function ViewEditor({ view, fields, onUpdate }: ViewEditorProps) {
  const [name, setName] = useState(view.name)
  const [viewtype, setViewtype] = useState(view.viewtype)
  const [columns, setColumns] = useState(view.columns)
  const [cardfields, setCardfields] = useState(view.cardfields)
  const [sort, setSort] = useState(view.sort)
  const [direction, setDirection] = useState(view.direction)

  // Reset state when view changes
  useEffect(() => {
    setName(view.name)
    setViewtype(view.viewtype)
    setColumns(view.columns)
    setCardfields(view.cardfields)
    setSort(view.sort)
    setDirection(view.direction)
  }, [view.id, view.name, view.viewtype, view.columns, view.cardfields, view.sort, view.direction])

  const handleNameBlur = () => {
    if (name.trim() && name !== view.name) {
      onUpdate({ name: name.trim() })
    }
  }

  const handleViewtypeChange = (value: string) => {
    setViewtype(value)
    onUpdate({ viewtype: value })
  }

  const handleColumnsChange = (value: string) => {
    setColumns(value)
    onUpdate({ columns: value })
  }

  const handleSortChange = (value: string) => {
    setSort(value)
    onUpdate({ sort: value })
  }

  const handleDirectionChange = (value: string) => {
    setDirection(value)
    onUpdate({ direction: value })
  }

  const toggleCardField = (fieldId: string) => {
    const currentFields = cardfields.split(',').filter(Boolean)
    let newFields: string[]

    if (currentFields.includes(fieldId)) {
      newFields = currentFields.filter((f) => f !== fieldId)
    } else {
      newFields = [...currentFields, fieldId]
    }

    const newCardfields = newFields.join(',')
    setCardfields(newCardfields)
    onUpdate({ cardfields: newCardfields })
  }

  const cardfieldsList = cardfields.split(',').filter(Boolean)

  // Get enum fields for column selection (board view groups by enum fields)
  const enumFields = fields.filter((f) => f.fieldtype === 'enum')

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Edit view</h4>

      <div className="space-y-2">
        <Label htmlFor="view-name">Name</Label>
        <Input
          id="view-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
        />
      </div>

      <div className="space-y-2">
        <Label>View type</Label>
        <RadioGroup value={viewtype} onValueChange={handleViewtypeChange}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="board" id="viewtype-board" />
            <Label htmlFor="viewtype-board" className="font-normal cursor-pointer">
              Board
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="list" id="viewtype-list" />
            <Label htmlFor="viewtype-list" className="font-normal cursor-pointer">
              List
            </Label>
          </div>
        </RadioGroup>
      </div>

      {viewtype === 'board' && enumFields.length > 0 && (
        <div className="space-y-2">
          <Label>Group by (columns)</Label>
          <select
            value={columns}
            onChange={(e) => handleColumnsChange(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {enumFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Fields to show on card</Label>
        <div className="space-y-1">
          {fields.map((field) => (
            <label
              key={field.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={cardfieldsList.includes(field.id)}
                onChange={() => toggleCardField(field.id)}
                className="rounded"
              />
              {field.name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Default sort</Label>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">None</option>
            <option value="number">Number</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
          <select
            value={direction}
            onChange={(e) => handleDirectionChange(e.target.value)}
            className="w-24 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
      </div>
    </div>
  )
}
