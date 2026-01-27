// Mochi Projects: Type editor component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { Input, Button, Label } from "@mochi/common";
import type { ProjectType } from "@/types";

interface TypeEditorProps {
  type: ProjectType;
  onUpdate: (name: string) => void;
}

export function TypeEditor({ type, onUpdate }: TypeEditorProps) {
  const [name, setName] = useState(type.name);
  const [isDirty, setIsDirty] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    setIsDirty(value !== type.name);
  };

  const handleSave = () => {
    if (name.trim() && name !== type.name) {
      onUpdate(name.trim());
      setIsDirty(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium">Edit type</h4>
      <div className="space-y-2">
        <Label htmlFor="type-name">Name</Label>
        <Input
          id="type-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
      </div>
      {isDirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
