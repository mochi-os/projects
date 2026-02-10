// Mochi Projects: Board column component
// Copyright Alistair Cunningham 2026

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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

export interface BoardColumnRow {
  id: string;
  label: string;
  colour?: string;
  objects: ProjectObject[];
}

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
  rowField?: string;
  peopleMap?: Record<string, string>;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: () => void;
  onCreateInRow?: (rowId: string) => void;
  onDrop?: (objectId: string, columnId: string, newRank?: number, rowId?: string) => void;
  onRenameColumn?: (newName: string) => Promise<void>;
  onDeleteColumn?: () => Promise<void>;
  isReordering?: boolean;
  isDragging?: boolean;
  hideHeader?: boolean;
  rows?: BoardColumnRow[];
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
  rowField,
  peopleMap,
  onCardClick,
  onCreateClick,
  onCreateInRow,
  onDrop,
  onRenameColumn,
  onDeleteColumn,
  isReordering,
  isDragging,
  hideHeader,
  rows,
}: BoardColumnProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState(name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Total object count across rows (or flat objects)
  const totalCount = rows ? rows.reduce((sum, r) => sum + r.objects.length, 0) : objects.length;

  // Drag state managed via refs + direct DOM manipulation to avoid re-renders
  const columnRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const dropIndexRef = useRef(0);
  const dropRowRef = useRef("");
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const isDragOverRef = useRef(false);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => clearTimeout(safetyTimeoutRef.current);
  }, []);

  const clearDragState = useCallback(() => {
    isDragOverRef.current = false;
    columnRef.current?.removeAttribute("data-drag-over");
    if (indicatorRef.current) indicatorRef.current.style.opacity = "0";
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
    const mouseY = e.clientY;

    if (rowsRef.current && columnRef.current) {
      // Swimlane mode: find which row section and position within it
      const sections = columnRef.current.querySelectorAll("[data-row-id]");
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (mouseY >= rect.top && mouseY <= rect.bottom) {
          dropRowRef.current = section.getAttribute("data-row-id") || "";
          const cards = section.querySelectorAll("[data-card-id]");
          let newDropIndex = cards.length;
          for (let i = 0; i < cards.length; i++) {
            const cardRect = cards[i].getBoundingClientRect();
            if (mouseY < cardRect.top + cardRect.height / 2) {
              newDropIndex = i;
              break;
            }
          }
          dropIndexRef.current = newDropIndex;
          break;
        }
      }
    } else if (cardsContainerRef.current) {
      // Flat mode
      const cards = cardsContainerRef.current.querySelectorAll("[data-card-id]");
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

    // Position drop indicator line (fixed positioning, viewport coordinates)
    if (indicatorRef.current && columnRef.current) {
      let container: Element | null = null;
      let targetCards: NodeListOf<Element> | null = null;

      if (rowsRef.current) {
        const section = columnRef.current.querySelector(
          `[data-row-id="${CSS.escape(dropRowRef.current)}"]`
        );
        if (section) {
          container = section;
          targetCards = section.querySelectorAll("[data-card-id]");
        }
      } else if (cardsContainerRef.current) {
        container = cardsContainerRef.current;
        targetCards = cardsContainerRef.current.querySelectorAll("[data-card-id]");
      }

      if (container && targetCards && targetCards.length > 0) {
        const containerRect = container.getBoundingClientRect();
        const idx = dropIndexRef.current;
        let top: number;
        if (idx < targetCards.length) {
          top = targetCards[idx].getBoundingClientRect().top;
        } else {
          top = targetCards[targetCards.length - 1].getBoundingClientRect().bottom + 4;
        }
        indicatorRef.current.style.top = `${top}px`;
        indicatorRef.current.style.left = `${containerRect.left + 4}px`;
        indicatorRef.current.style.width = `${containerRect.width - 8}px`;
        indicatorRef.current.style.opacity = "1";
      } else {
        indicatorRef.current.style.opacity = "0";
      }
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
    const rowId = rowsRef.current ? dropRowRef.current : undefined;
    clearDragState();
    const objectId = e.dataTransfer.getData("text/plain");
    if (objectId && onDrop) {
      onDrop(objectId, id, rank, rowId);
    }
  }, [id, onDrop, clearDragState]);

  return (
    <div
      ref={columnRef}
      className={cn(
        "rounded-[10px]",
        rows ? "grid grid-rows-subgrid row-span-full" : "flex flex-col w-72 shrink-0 h-full",
        "bg-muted/30 border transition-colors",
        "data-[drag-over]:border-primary data-[drag-over]:bg-primary/5",
        isReordering && !isDragging && "border-dashed border-muted-foreground/50",
        isDragging && "border-primary border-2 bg-background shadow-lg",
      )}
      onDragStart={!onDrop ? (e) => e.preventDefault() : undefined}
      onDragEnter={isReordering ? undefined : handleDragEnter}
      onDragOver={isReordering ? undefined : handleDragOver}
      onDragLeave={isReordering ? undefined : handleDragLeave}
      onDrop={isReordering ? undefined : handleDrop}
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
            {totalCount}
          </span>
        </div>
        {!isReordering && (onCreateClick || onRenameColumn || (totalCount === 0 && onDeleteColumn)) && (
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
              {totalCount === 0 && onDeleteColumn && (
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
          if (totalCount > 0) {
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

      {/* Drop indicator (portaled to body to avoid grid layout impact) */}
      {createPortal(
        <div
          ref={indicatorRef}
          className="fixed h-0.5 rounded-full bg-primary z-50 pointer-events-none opacity-0 -translate-y-1/2"
        />,
        document.body,
      )}

      {/* Cards */}
      {rows ? (
        rows.map((row, index) => (
          <div
            key={row.id}
            data-row-id={row.id}
            className={cn(
              "p-2 space-y-2",
              index < rows.length - 1 && "border-b"
            )}
            onDoubleClick={onCreateInRow ? (e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-card-id]") === null) {
                onCreateInRow(row.id);
              }
            } : undefined}
          >
            {row.objects.map((object) => (
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
                  rowField={rowField}
                  peopleMap={peopleMap}
                  draggable={!!onDrop}
                  onClick={() => onCardClick?.(object)}
                />
              </div>
            ))}
          </div>
        ))
      ) : (
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
                rowField={rowField}
                peopleMap={peopleMap}
                draggable={!!onDrop}
                onClick={() => onCardClick?.(object)}
              />
            </div>
          ))}

          {totalCount === 0 && !hideHeader && (
            <div className="flex items-center justify-center py-8">
              <Inbox className="size-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
