// Mochi Projects: Board column component
// Copyright Alistair Cunningham 2026

import { useState, useRef } from "react";
import { cn, ConfirmDialog } from "@mochi/common";
import { Plus, Trash2 } from "lucide-react";
import { BoardCard } from "./board-card";
import type { ProjectObject, ProjectField, FieldOption, ProjectType } from "@/types";

interface BoardColumnProps {
  id: string;
  name: string;
  colour?: string;
  objects: ProjectObject[];
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  objectMap: Record<string, ProjectObject>;
  typeMap: Record<string, ProjectType>;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: () => void;
  onDrop?: (objectId: string, columnId: string, newRank?: number) => void;
  onDeleteColumn?: () => Promise<void>;
}

export function BoardColumn({
  id,
  name,
  colour,
  objects,
  fields,
  options,
  prefix,
  objectMap,
  typeMap,
  onCardClick,
  onCreateClick,
  onDrop,
  onDeleteColumn,
}: BoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        "flex flex-col w-72 shrink-0 rounded-[10px] min-h-[calc(100vh-5rem)]",
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
        <div className="flex items-center gap-1">
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Add item"
            >
              <Plus className="size-4 text-muted-foreground" />
            </button>
          )}
          {objects.length === 0 && onDeleteColumn && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-1 rounded hover:bg-destructive/10 transition-colors"
              title="Delete column"
            >
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete column"
        description={`Are you sure you want to delete the "${name}" column? This cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        confirmVariant="destructive"
        onConfirm={async () => {
          if (objects.length > 0) {
            // Column has items now, don't delete
            setShowDeleteDialog(false);
            return;
          }
          setIsDeleting(true);
          try {
            await onDeleteColumn?.();
            setShowDeleteDialog(false);
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      {/* Cards */}
      <div
        ref={cardsContainerRef}
        className="p-2 space-y-2 flex-1"
        onDoubleClick={(e) => {
          // Only trigger if clicking directly on the container, not on a card
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-card-id]") === null) {
            onCreateClick?.();
          }
        }}
      >
        {objects.map((object, index) => (
          <div key={object.id} data-card-id={object.id}>
            {isDragOver && dropIndex === index && (
              <div className="h-[50px] w-full rounded-[10px] border border-dashed border-primary bg-primary/10 mb-2 transition-all duration-200" />
            )}
            <BoardCard
              object={object}
              fields={fields}
              options={options}
              prefix={prefix}
              objectMap={objectMap}
              typeMap={typeMap}
              onClick={() => onCardClick?.(object)}
            />
          </div>
        ))}

        {/* Drop indicator at end */}
        {isDragOver && dropIndex === objects.length && (
          <div className="h-[50px] w-full rounded-[10px] border border-dashed border-primary bg-primary/10 transition-all duration-200" />
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
