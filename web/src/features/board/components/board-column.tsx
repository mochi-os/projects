// Mochi Projects: Board column component
// Copyright Alistair Cunningham 2026

import { useState, useRef, useEffect, useCallback } from "react";
import {
  cn,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mochi/common";
import { Inbox, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { BoardCard } from "./board-card";
import type { ProjectObject, ProjectField, FieldOption, ProjectClass } from "@/types";

interface BoardColumnProps {
  id: string;
  name: string;
  colour?: string;
  objects: ProjectObject[];
  fields: ProjectField[];
  options: Record<string, FieldOption[]>;
  prefix: string;
  objectMap: Record<string, ProjectObject>;
  classMap: Record<string, ProjectClass>;
  allObjects?: ProjectObject[];
  statusField?: string;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: () => void;
  onDrop?: (objectId: string, columnId: string, newRank?: number) => void;
  onRenameColumn?: (newName: string) => Promise<void>;
  onDeleteColumn?: () => Promise<void>;
  isReordering?: boolean;
  isDragging?: boolean;
  hideHeader?: boolean;
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
  classMap,
  allObjects,
  statusField,
  onCardClick,
  onCreateClick,
  onDrop,
  onRenameColumn,
  onDeleteColumn,
  isReordering,
  isDragging,
  hideHeader,
}: BoardColumnProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState(name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag state managed via refs + direct DOM manipulation to avoid re-renders
  const columnRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const dropIndexRef = useRef(0);
  const isDragOverRef = useRef(false);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(safetyTimeoutRef.current);
  }, []);

  const clearDragState = useCallback(() => {
    isDragOverRef.current = false;
    columnRef.current?.removeAttribute("data-drag-over");
    clearTimeout(safetyTimeoutRef.current);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (isReordering) return;
    e.preventDefault();
  }, [isReordering]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isReordering) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Show column highlight via data attribute (CSS handles styling)
    if (!isDragOverRef.current) {
      isDragOverRef.current = true;
      columnRef.current?.setAttribute("data-drag-over", "");
    }

    // Safety net: clear if dragover stops firing
    clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(clearDragState, 150);

    // Calculate drop position based on mouse Y
    if (cardsContainerRef.current) {
      const cards = cardsContainerRef.current.querySelectorAll("[data-card-id]");
      const mouseY = e.clientY;
      let newDropIndex = cards.length;

      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (mouseY < rect.top + rect.height / 2) {
          newDropIndex = i;
          break;
        }
      }

      dropIndexRef.current = newDropIndex;
    }
  }, [isReordering, clearDragState]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (isReordering) return;
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !columnRef.current?.contains(relatedTarget)) {
      clearDragState();
    }
  }, [isReordering, clearDragState]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rank = dropIndexRef.current + 1;
    clearDragState();
    const objectId = e.dataTransfer.getData("text/plain");
    if (objectId && onDrop) {
      onDrop(objectId, id, rank);
    }
  }, [id, onDrop, clearDragState]);

  return (
    <div
      ref={columnRef}
      className={cn(
        "flex flex-col w-72 shrink-0 rounded-[10px]",
        !hideHeader && "min-h-[calc(100vh-5rem)]",
        "bg-muted/30 border transition-colors",
        "data-[drag-over]:border-primary data-[drag-over]:bg-primary/5",
        isReordering && !isDragging && "border-dashed border-muted-foreground/50",
        isDragging && "border-primary border-2 bg-background shadow-lg",
      )}
      onDragEnter={isReordering ? undefined : handleDragEnter}
      onDragOver={isReordering ? undefined : handleDragOver}
      onDragLeave={isReordering ? undefined : handleDragLeave}
      onDrop={isReordering ? undefined : handleDrop}
    >
      {/* Column header */}
      {!hideHeader && (
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
          {!isReordering && (onCreateClick || onRenameColumn || (objects.length === 0 && onDeleteColumn)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-muted transition-colors">
                  <MoreHorizontal className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onCreateClick && (
                  <DropdownMenuItem onClick={onCreateClick}>
                    <Plus className="size-4 mr-2" />
                    Create
                  </DropdownMenuItem>
                )}
                {onRenameColumn && (
                  <DropdownMenuItem
                    onClick={() => {
                      setNewName(name);
                      setShowRenameDialog(true);
                    }}
                  >
                    <Pencil className="size-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                )}
                {objects.length === 0 && onDeleteColumn && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newName.trim() || newName.trim() === name) {
                setShowRenameDialog(false);
                return;
              }
              setIsRenaming(true);
              try {
                await onRenameColumn?.(newName.trim());
                setShowRenameDialog(false);
              } finally {
                setIsRenaming(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename column</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="column-name">Name</Label>
              <Input
                id="column-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRenameDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newName.trim() || isRenaming}>
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete column"
        desc={`Are you sure you want to delete the "${name}" column? This cannot be undone.`}
        confirmText="Delete"
        destructive
        isLoading={isDeleting}
        handleConfirm={async () => {
          if (objects.length > 0) {
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
        className="p-2 space-y-2 flex-1 relative"
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-card-id]") === null) {
            onCreateClick?.();
          }
        }}
      >
        {objects.map((object) => (
          <div key={object.id} data-card-id={object.id}>
            <BoardCard
              object={object}
              fields={fields}
              options={options}
              prefix={prefix}
              objectMap={objectMap}
              classMap={classMap}
              allObjects={allObjects}
              statusField={statusField}
              onClick={() => onCardClick?.(object)}
            />
          </div>
        ))}

        {objects.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Inbox className="size-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
    </div>
  );
}
