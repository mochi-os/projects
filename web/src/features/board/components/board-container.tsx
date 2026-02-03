// Mochi Projects: Board container component
// Copyright Alistair Cunningham 2026

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@mochi/common";
import { BoardColumn } from "./board-column";
import type { ProjectObject, ProjectDetails, ProjectType, FieldOption } from "@/types";

interface BoardContainerProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  statusField: string;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: (statusId: string) => void;
  onMoveObject?: (objectId: string, newStatus: string, newRank?: number) => void;
  onRenameColumn?: (typeId: string, fieldId: string, optionId: string, newName: string) => Promise<void>;
  onDeleteColumn?: (typeId: string, fieldId: string, optionId: string) => Promise<void>;
  isReordering?: boolean;
  onReorderColumns?: (order: string[]) => void;
}

export function BoardContainer({
  project,
  objects,
  statusField,
  onCardClick,
  onCreateClick,
  onMoveObject,
  onRenameColumn,
  onDeleteColumn,
  isReordering,
  onReorderColumns,
}: BoardContainerProps) {
  // Get the default type's fields (first type)
  const defaultType = project.types[0];
  const typeFields = defaultType ? project.fields[defaultType.id] || [] : [];
  const typeOptions = defaultType ? project.options[defaultType.id] || {} : {};

  // Build a map of object id to object for quick parent lookups
  const objectMap = useMemo(() => {
    const map: Record<string, ProjectObject> = {};
    for (const obj of objects) {
      map[obj.id] = obj;
    }
    return map;
  }, [objects]);

  // Build type name map
  const typeMap = useMemo(() => {
    const map: Record<string, ProjectType> = {};
    for (const t of project.types) {
      map[t.id] = t;
    }
    return map;
  }, [project.types]);

  // Get status options for columns
  const statusOptions = useMemo(() => {
    const opts = typeOptions[statusField] || [];
    return [...opts].sort((a, b) => a.rank - b.rank);
  }, [typeOptions, statusField]);

  // Local reorder state
  const [reorderedColumns, setReorderedColumns] = useState<FieldOption[]>(statusOptions);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Sync local reorder state when statusOptions changes or reordering mode starts/stops
  useEffect(() => {
    setReorderedColumns(statusOptions);
  }, [statusOptions, isReordering]);

  // Columns to render (use reordered if in reorder mode)
  const columnsToRender = isReordering ? reorderedColumns : statusOptions;

  // Group objects by status and sort by rank
  const objectsByStatus = useMemo(() => {
    const grouped: Record<string, ProjectObject[]> = {};

    // Initialize all columns
    statusOptions.forEach((opt) => {
      grouped[opt.id] = [];
    });

    // Also add a column for items without status
    grouped[""] = [];

    // Group objects
    objects.forEach((obj) => {
      const status = obj.values[statusField] || "";
      if (grouped[status]) {
        grouped[status].push(obj);
      } else {
        grouped[""].push(obj);
      }
    });

    // Sort each column by rank
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => (a.rank || 0) - (b.rank || 0));
    });

    return grouped;
  }, [objects, statusOptions, statusField]);

  const handleDrop = (objectId: string, columnId: string, newRank?: number) => {
    onMoveObject?.(objectId, columnId, newRank);
  };

  // Create invisible drag image
  const emptyDragImage = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!emptyDragImage.current) {
      const div = document.createElement("div");
      div.style.width = "1px";
      div.style.height = "1px";
      div.style.position = "fixed";
      div.style.top = "-1000px";
      document.body.appendChild(div);
      emptyDragImage.current = div;
    }
    return () => {
      if (emptyDragImage.current) {
        document.body.removeChild(emptyDragImage.current);
        emptyDragImage.current = null;
      }
    };
  }, []);

  // Column drag handlers
  const handleColumnDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnId);
    // Use invisible drag image so only our styled column shows
    if (emptyDragImage.current) {
      e.dataTransfer.setDragImage(emptyDragImage.current, 0, 0);
    }
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetColumnId) return;

    setReorderedColumns((prev) => {
      const draggedIndex = prev.findIndex((c) => c.id === draggedColumnId);
      const targetIndex = prev.findIndex((c) => c.id === targetColumnId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newOrder = [...prev];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      return newOrder;
    });
  }, [draggedColumnId]);

  const handleColumnDragEnd = useCallback(() => {
    if (draggedColumnId && isReordering) {
      onReorderColumns?.(reorderedColumns.map((c) => c.id));
    }
    setDraggedColumnId(null);
  }, [draggedColumnId, isReordering, reorderedColumns, onReorderColumns]);

  return (
    <div className="flex gap-4 pb-2 h-full">
      {columnsToRender.map((status) => {
        const isDragging = draggedColumnId === status.id;
        return (
          <div
            key={status.id}
            draggable={isReordering}
            onDragStart={isReordering ? (e) => handleColumnDragStart(e, status.id) : undefined}
            onDragOver={isReordering ? (e) => handleColumnDragOver(e, status.id) : undefined}
            onDragEnd={isReordering ? handleColumnDragEnd : undefined}
            className={cn(
              isReordering && "cursor-grab active:cursor-grabbing transition-transform duration-200 ease-out",
              isDragging && "opacity-90 scale-[1.02] shadow-xl z-10 rotate-1"
            )}
          >
          <BoardColumn
            id={status.id}
            name={status.name}
            colour={status.colour}
            objects={objectsByStatus[status.id] || []}
            fields={typeFields.filter((f) => f.card === 1)}
            options={typeOptions}
            prefix={project.project.prefix}
            objectMap={objectMap}
            typeMap={typeMap}
            onCardClick={isReordering ? undefined : onCardClick}
            onCreateClick={isReordering ? undefined : () => onCreateClick?.(status.id)}
            onDrop={isReordering ? undefined : handleDrop}
            onRenameColumn={
              !isReordering && onRenameColumn && defaultType
                ? (newName: string) => onRenameColumn(defaultType.id, statusField, status.id, newName)
                : undefined
            }
            onDeleteColumn={
              !isReordering && onDeleteColumn && defaultType
                ? () => onDeleteColumn(defaultType.id, statusField, status.id)
                : undefined
            }
            isReordering={isReordering}
            isDragging={isDragging}
          />
        </div>
        );
      })}

      {/* Column for items without status */}
      {!isReordering && objectsByStatus[""]?.length > 0 && (
        <BoardColumn
          id=""
          name="No Status"
          objects={objectsByStatus[""]}
          fields={typeFields.filter((f) => f.card === 1)}
          options={typeOptions}
          prefix={project.project.prefix}
          objectMap={objectMap}
          typeMap={typeMap}
          onCardClick={onCardClick}
          onDrop={handleDrop}
        />
      )}
    </div>
  );
}
