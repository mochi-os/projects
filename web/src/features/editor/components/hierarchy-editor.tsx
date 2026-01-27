// Mochi Projects: Hierarchy editor component
// Copyright Alistair Cunningham 2026

import { Label, Checkbox } from "@mochi/common";
import type { ProjectType } from "@/types";

interface HierarchyEditorProps {
  types: ProjectType[];
  currentTypeId: string;
  allowedParents: string[];
  onUpdate: (parents: string[]) => void;
}

export function HierarchyEditor({
  types,
  currentTypeId,
  allowedParents,
  onUpdate,
}: HierarchyEditorProps) {
  const handleToggle = (parentId: string, checked: boolean) => {
    if (checked) {
      onUpdate([...allowedParents, parentId]);
    } else {
      onUpdate(allowedParents.filter((p) => p !== parentId));
    }
  };

  // Filter out current type from potential parents
  const otherTypes = types.filter((t) => t.id !== currentTypeId);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div>
        <h4 className="font-medium">Hierarchy</h4>
        <p className="text-sm text-muted-foreground">
          Select what can be a parent of this type
        </p>
      </div>

      <div className="space-y-2">
        {/* Root option (empty string means can be root-level) */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="parent-root"
            checked={allowedParents.includes("")}
            onCheckedChange={(checked) => handleToggle("", checked === true)}
          />
          <Label htmlFor="parent-root" className="font-normal cursor-pointer">
            Can be root (no parent)
          </Label>
        </div>

        {/* Other types as potential parents */}
        {otherTypes.map((type) => (
          <div key={type.id} className="flex items-center gap-2">
            <Checkbox
              id={`parent-${type.id}`}
              checked={allowedParents.includes(type.id)}
              onCheckedChange={(checked) =>
                handleToggle(type.id, checked === true)
              }
            />
            <Label
              htmlFor={`parent-${type.id}`}
              className="font-normal cursor-pointer"
            >
              {type.name}
            </Label>
          </div>
        ))}
      </div>

      {allowedParents.length === 0 && (
        <p className="text-sm text-amber-600">
          Warning: This type cannot be created (no valid parent)
        </p>
      )}
    </div>
  );
}
