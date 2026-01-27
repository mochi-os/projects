// Mochi Projects: Option list component for design editor
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Button, cn, ConfirmDialog } from "@mochi/common";
import type { FieldOption } from "@/types";

interface OptionListProps {
  options: FieldOption[];
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  onAddOption: () => void;
  onDeleteOption: (optionId: string) => void;
  onReorder: (order: string[]) => void;
}

export function OptionList({
  options,
  selectedOptionId,
  onSelectOption,
  onAddOption,
  onDeleteOption,
  onReorder,
}: OptionListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteOptionId, setDeleteOptionId] = useState<string | null>(null);
  const deleteOption = options.find((o) => o.id === deleteOptionId);

  const handleDragStart = (e: React.DragEvent, optionId: string) => {
    setDraggedId(optionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, optionId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== optionId) {
      setDragOverId(optionId);
    }
  };

  const handleDragEnd = () => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const newOrder = [...options.map((o) => o.id)];
      const draggedIndex = newOrder.indexOf(draggedId);
      const targetIndex = newOrder.indexOf(dragOverId);

      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);

      onReorder(newOrder);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Options</h3>
        <Button variant="ghost" size="sm" onClick={onAddOption}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-1">
        {options.map((option) => (
          <div
            key={option.id}
            draggable
            onDragStart={(e) => handleDragStart(e, option.id)}
            onDragOver={(e) => handleDragOver(e, option.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer",
              selectedOptionId === option.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
              dragOverId === option.id && "border-t-2 border-primary",
            )}
            onClick={() => onSelectOption(option.id)}
          >
            <GripVertical className="size-4 cursor-grab opacity-50" />
            <span
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: option.colour }}
            />
            <span className="flex-1">{option.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "size-6 p-0",
                selectedOptionId === option.id
                  ? "hover:bg-primary-foreground/20"
                  : "hover:bg-destructive/20",
              )}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOptionId(option.id);
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-sm text-muted-foreground px-2">
            No options defined
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteOptionId}
        onOpenChange={(open) => !open && setDeleteOptionId(null)}
        title="Delete option"
        desc={`Are you sure you want to delete "${deleteOption?.name}"?`}
        confirmText="Delete"
        destructive
        handleConfirm={() => {
          if (deleteOptionId) {
            onDeleteOption(deleteOptionId);
            setDeleteOptionId(null);
          }
        }}
      />
    </div>
  );
}
