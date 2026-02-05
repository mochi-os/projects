// Mochi Projects: Board container component
// Copyright Alistair Cunningham 2026

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  cn,
  BoardSkeleton,
  EmptyState,
  Button,
} from "@mochi/common";
import { BoardColumn } from "./board-column";
import { FolderKanban, Plus } from "lucide-react";
import type { ProjectObject, ProjectDetails, ProjectClass, FieldOption, SortState } from "@/types";

interface BoardContainerProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  statusField: string;
  sort?: SortState | null;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: (statusId: string) => void;
  onMoveObject?: (objectId: string, newStatus: string, newRank?: number) => void;
  onRenameColumn?: (classId: string, fieldId: string, optionId: string, newName: string) => Promise<void>;
  onDeleteColumn?: (classId: string, fieldId: string, optionId: string) => Promise<void>;
  isReordering?: boolean;
  onReorderColumns?: (order: string[]) => void;
  isLoading?: boolean;
}

export function BoardContainer({
  project,
  objects,
  statusField,
  sort,
  onCardClick,
  onCreateClick,
  onMoveObject,
  onRenameColumn,
  onDeleteColumn,
  isReordering,
  onReorderColumns,
  isLoading,
}: BoardContainerProps) {
  // Get the default class's fields (first class)
  const defaultClass = project.classes[0];
  const classFields = defaultClass ? project.fields[defaultClass.id] || [] : [];
  const classOptions = defaultClass ? project.options[defaultClass.id] || {} : {};

  // Build a map of object id to object for quick parent lookups
  const objectMap = useMemo(() => {
    const map: Record<string, ProjectObject> = {};
    for (const obj of objects) {
      map[obj.id] = obj;
    }
    return map;
  }, [objects]);

  // Build class name map
  const classMap = useMemo(() => {
    const map: Record<string, ProjectClass> = {};
    for (const c of project.classes) {
      map[c.id] = c;
    }
    return map;
  }, [project.classes]);

  // Get status options for columns
  const statusOptions = useMemo(() => {
    const opts = classOptions[statusField] || [];
    return [...opts].sort((a, b) => a.rank - b.rank);
  }, [classOptions, statusField]);

  // Local reorder state
  const [reorderedColumns, setReorderedColumns] = useState<FieldOption[]>(statusOptions);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Sync local reorder state when statusOptions changes or reordering mode starts/stops
  useEffect(() => {
    setReorderedColumns(statusOptions);
  }, [statusOptions, isReordering]);

  // Columns to render (use reordered if in reorder mode)
  const columnsToRender = isReordering ? reorderedColumns : statusOptions;

  // Group objects by status and sort
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

    // Sort each column
    const sortField = sort?.field || "rank";
    const sortDirection = sort?.direction || "asc";
    const multiplier = sortDirection === "asc" ? 1 : -1;

    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        if (sortField === "rank") {
          aVal = a.rank || 0;
          bVal = b.rank || 0;
        } else if (sortField === "created") {
          aVal = a.created || 0;
          bVal = b.created || 0;
        } else if (sortField === "updated") {
          aVal = a.updated || 0;
          bVal = b.updated || 0;
        } else if (sortField === "number") {
          aVal = a.number || 0;
          bVal = b.number || 0;
        } else {
          aVal = a.values[sortField] || "";
          bVal = b.values[sortField] || "";
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return (aVal - bVal) * multiplier;
        }
        return String(aVal).localeCompare(String(bVal)) * multiplier;
      });
    });

    return grouped;
  }, [objects, statusOptions, statusField, sort]);

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

  if (isLoading) {
    return <BoardSkeleton columnCount={4} />;
  }

  if (statusOptions.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No columns defined"
        description="Try adding some columns to your project to get started."
      >
        <Button onClick={() => onCreateClick?.("")}>
          <Plus className="mr-2 size-4" />
          Create item
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="flex gap-4 pb-2">
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
            fields={classFields.filter((f) => f.card === 1)}
            options={classOptions}
            prefix={project.project.prefix}
            objectMap={objectMap}
            classMap={classMap}
            onCardClick={isReordering ? undefined : onCardClick}
            onCreateClick={isReordering ? undefined : () => onCreateClick?.(status.id)}
            onDrop={isReordering ? undefined : handleDrop}
            onRenameColumn={
              !isReordering && onRenameColumn && defaultClass
                ? (newName: string) => onRenameColumn(defaultClass.id, statusField, status.id, newName)
                : undefined
            }
            onDeleteColumn={
              !isReordering && onDeleteColumn && defaultClass
                ? () => onDeleteColumn(defaultClass.id, statusField, status.id)
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
          fields={classFields.filter((f) => f.card === 1)}
          options={classOptions}
          prefix={project.project.prefix}
          objectMap={objectMap}
          classMap={classMap}
          onCardClick={onCardClick}
          onDrop={handleDrop}
        />
      )}
    </div>
  );
}
