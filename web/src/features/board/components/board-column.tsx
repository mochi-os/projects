// Mochi Projects: Board column component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { cn } from "@mochi/common";
import { Plus } from "lucide-react";
import { BoardCard } from "./board-card";
import type { ProjectObject, ProjectField, FieldOption } from "@/types";

interface BoardColumnProps {
  id: string;
  name: string;
  colour?: string;
  objects: ProjectObject[];
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: () => void;
  onDrop?: (objectId: string, columnId: string) => void;
}

export function BoardColumn({
  id,
  name,
  colour,
  objects,
  fields,
  options,
  prefix,
  onCardClick,
  onCreateClick,
  onDrop,
}: BoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const objectId = e.dataTransfer.getData("text/plain");
    if (objectId && onDrop) {
      onDrop(objectId, id);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-lg",
        "bg-muted/30 border",
        isDragOver && "border-primary bg-primary/5",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {colour && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colour }}
            />
          )}
          <span className="font-medium text-sm">{name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {objects.length}
          </span>
        </div>
        {onCreateClick && (
          <button
            onClick={onCreateClick}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <Plus className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {objects.map((object) => (
          <BoardCard
            key={object.id}
            object={object}
            fields={fields}
            options={options}
            prefix={prefix}
            onClick={() => onCardClick?.(object)}
          />
        ))}

        {objects.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No items
          </div>
        )}
      </div>
    </div>
  );
}
