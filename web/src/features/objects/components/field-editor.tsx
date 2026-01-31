// Mochi Projects: Field editor component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import {
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  PersonPicker,
  type Person,
} from "@mochi/common";
import type { ProjectField, FieldOption } from "@/types";

interface FieldEditorProps {
  field: ProjectField;
  value: string;
  options: FieldOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  localPeople?: Person[];
}

export function FieldEditor({
  field,
  value,
  options,
  onChange,
  disabled,
  hideLabel,
  localPeople = [],
}: FieldEditorProps & { hideLabel?: boolean }) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const renderEditor = () => {
    // ... same logic
    switch (field.fieldtype) {
      case "enum":
        return (
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <div className="flex items-center gap-2">
                    {opt.colour && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: opt.colour }}
                      />
                    )}
                    {opt.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "text":
        return (
          <Textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            rows={3}
            className="min-h-[80px]"
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            className="h-9"
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onChange(e.target.value);
            }}
            disabled={disabled}
            className="h-9"
          />
        );

      case "user":
        return (
          <PersonPicker
            mode="single"
            value={value}
            onChange={(v) => onChange(v as string)}
            local={localPeople}
            friends
            directory
            disabled={disabled}
            placeholder="Select owner..."
            emptyMessage="No people found"
          />
        );

      default:
        return (
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            className="h-9"
          />
        );
    }
  };

  if (hideLabel) return renderEditor();

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground">
        {field.name}
        {field.required === 1 && (
          <span className="text-destructive ml-1">*</span>
        )}
      </label>
      {renderEditor()}
    </div>
  );
}
