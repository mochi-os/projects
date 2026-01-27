// Mochi Projects: Option editor component
// Copyright Alistair Cunningham 2026

import { useState, useEffect } from 'react'
import { Input, Label } from '@mochi/common'
import type { FieldOption } from '@/types'

const PRESET_COLOURS = [
  '#94a3b8', // slate
  '#64748b', // slate darker
  '#f87171', // red
  '#fb923c', // orange
  '#fbbf24', // amber
  '#a3e635', // lime
  '#4ade80', // green
  '#2dd4bf', // teal
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#818cf8', // indigo
  '#a78bfa', // violet
  '#e879f9', // fuchsia
  '#f472b6', // pink
]

interface OptionEditorProps {
  option: FieldOption
  onUpdate: (updates: { name?: string; colour?: string }) => void
}

export function OptionEditor({ option, onUpdate }: OptionEditorProps) {
  const [name, setName] = useState(option.name)
  const [colour, setColour] = useState(option.colour)

  // Reset state when option changes
  useEffect(() => {
    setName(option.name)
    setColour(option.colour)
  }, [option.id, option.name, option.colour])

  const handleNameBlur = () => {
    if (name.trim() && name !== option.name) {
      onUpdate({ name: name.trim() })
    }
  }

  const handleColourChange = (newColour: string) => {
    setColour(newColour)
    onUpdate({ colour: newColour })
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Edit option</h4>

      <div className="space-y-2">
        <Label htmlFor="option-name">Name</Label>
        <Input
          id="option-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
        />
      </div>

      <div className="space-y-2">
        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLOURS.map((presetColour) => (
            <button
              key={presetColour}
              type="button"
              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                colour === presetColour
                  ? 'border-foreground'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: presetColour }}
              onClick={() => handleColourChange(presetColour)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="color"
            value={colour}
            onChange={(e) => handleColourChange(e.target.value)}
            className="w-10 h-8 p-0 border-0"
          />
          <Input
            type="text"
            value={colour}
            onChange={(e) => handleColourChange(e.target.value)}
            className="flex-1 font-mono text-sm"
            placeholder="#000000"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="size-4 rounded-full"
          style={{ backgroundColor: colour }}
        />
        <span className="text-sm">Preview: {name}</span>
      </div>
    </div>
  )
}
