// Mochi Projects: Board column component
// Copyright Alistair Cunningham 2026

import { useState, useRef } from "react";
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
  onDrop?: (objectId: string, columnId: string, newRank?: number) => void;
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
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);

    // Calculate drop position based on mouse Y position
    if (cardsContainerRef.current) {
      const container = cardsContainerRef.current;
      const cards = container.querySelectorAll("[data-card-id]");
      const mouseY = e.clientY;

      let newDropIndex = objects.length; // Default to end
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const rect = card.getBoundingClientRect();
        const cardMiddle = rect.top + rect.height / 2;
        if (mouseY < cardMiddle) {
          newDropIndex = i;
          break;
        }
      }
      setDropIndex(newDropIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!cardsContainerRef.current?.contains(relatedTarget)) {
      setIsDragOver(false);
      setDropIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const objectId = e.dataTransfer.getData("text/plain");
    if (objectId && onDrop) {
      // Calculate rank: position + 1 (1-based)
      const newRank = dropIndex !== null ? dropIndex + 1 : objects.length + 1;
      onDrop(objectId, id, newRank);
    }
    setDropIndex(null);
  };

  return (
    <div
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-lg h-full min-h-0",
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
      <div
        ref={cardsContainerRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0"
      >
        {objects.map((object, index) => (
          <div key={object.id} data-card-id={object.id}>
            {isDragOver && dropIndex === index && (
              <div className="h-1 bg-primary rounded mb-2" />
            )}
            <BoardCard
              object={object}
              fields={fields}
              options={options}
              prefix={prefix}
              onClick={() => onCardClick?.(object)}
            />
          </div>
        ))}

        {/* Drop indicator at end */}
        {isDragOver && dropIndex === objects.length && (
          <div className="h-1 bg-primary rounded" />
        )}

        {objects.length === 0 && !isDragOver && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No items
          </div>
        )}
      </div>
    </div>
  );
}
