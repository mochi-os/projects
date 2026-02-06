// Mochi Projects: Board container component
// Copyright Alistair Cunningham 2026

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@mochi/common";
import { BoardColumn } from "./board-column";
import type { ProjectObject, ProjectDetails, ProjectClass, FieldOption, SortState } from "@/types";

interface BoardContainerProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  statusField: string;
  rowField?: string;
  viewFields?: string;
  sort?: SortState | null;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: (statusId: string) => void;
  onMoveObject?: (objectId: string, newStatus: string, newRank?: number, newRow?: string) => void;
  onRenameColumn?: (classId: string, fieldId: string, optionId: string, newName: string) => Promise<void>;
  onDeleteColumn?: (classId: string, fieldId: string, optionId: string) => Promise<void>;
  isReordering?: boolean;
  onReorderColumns?: (order: string[]) => void;
}

// Sort objects within a group by the active sort field
function sortObjects(objects: ProjectObject[], sort?: SortState | null): ProjectObject[] {
  const sortField = sort?.field || "rank";
  const sortDirection = sort?.direction || "asc";
  const multiplier = sortDirection === "asc" ? 1 : -1;

  return [...objects].sort((a, b) => {
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
}

export function BoardContainer({
  project,
  objects,
  statusField,
  rowField,
  viewFields,
  sort,
  onCardClick,
  onCreateClick,
  onMoveObject,
  onRenameColumn,
  onDeleteColumn,
  isReordering,
  onReorderColumns,
}: BoardContainerProps) {
  // Get the default class's fields (first class)
  const defaultClass = project.classes[0];
  const classFields = defaultClass ? project.fields[defaultClass.id] || [] : [];
  const classOptions = defaultClass ? project.options[defaultClass.id] || {} : {};

  // Parse view fields list
  const viewFieldsList = useMemo(
    () => (viewFields || "").split(",").filter(Boolean),
    [viewFields]
  );

  // Filter fields to show on cards
  const visibleFields = useMemo(
    () => classFields.filter((f) => viewFieldsList.includes(f.id)),
    [classFields, viewFieldsList]
  );

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

  // Get row options (for swimlanes)
  const rowOptions = useMemo(() => {
    if (!rowField) return [];
    const opts = classOptions[rowField] || [];
    return [...opts].sort((a, b) => a.rank - b.rank);
  }, [classOptions, rowField]);

  const hasRows = rowField && rowOptions.length > 0;

  // Local reorder state
  const [reorderedColumns, setReorderedColumns] = useState<FieldOption[]>(statusOptions);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  // Sync local reorder state when statusOptions changes or reordering mode starts/stops
  useEffect(() => {
    setReorderedColumns(statusOptions);
  }, [statusOptions, isReordering]);

  // Columns to render (use reordered if in reorder mode)
  const columnsToRender = isReordering ? reorderedColumns : statusOptions;

  // Group objects by status (flat mode) and sort
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
    Object.keys(grouped).forEach((status) => {
      grouped[status] = sortObjects(grouped[status], sort);
    });

    return grouped;
  }, [objects, statusOptions, statusField, sort]);

  // Group objects by row then column (swimlane mode)
  const objectsByRowAndStatus = useMemo(() => {
    if (!hasRows) return {};

    const grouped: Record<string, Record<string, ProjectObject[]>> = {};

    // Initialize all rows × columns
    for (const row of rowOptions) {
      grouped[row.id] = {};
      for (const col of statusOptions) {
        grouped[row.id][col.id] = [];
      }
      grouped[row.id][""] = [];
    }
    // "No row" bucket
    grouped[""] = {};
    for (const col of statusOptions) {
      grouped[""][col.id] = [];
    }
    grouped[""][""] = [];

    // Group objects
    objects.forEach((obj) => {
      const status = obj.values[statusField] || "";
      const row = obj.values[rowField!] || "";

      // Fall back to "" bucket if row/status value doesn't match any known option
      const targetRow = grouped[row] ? row : "";
      const targetStatus = grouped[targetRow][status] !== undefined ? status : "";
      grouped[targetRow][targetStatus].push(obj);
    });

    // Sort each cell
    Object.keys(grouped).forEach((rowId) => {
      Object.keys(grouped[rowId]).forEach((colId) => {
        grouped[rowId][colId] = sortObjects(grouped[rowId][colId], sort);
      });
    });

    return grouped;
  }, [objects, statusOptions, rowOptions, statusField, rowField, hasRows, sort]);

  const handleDrop = (objectId: string, columnId: string, newRank?: number, rowId?: string) => {
    onMoveObject?.(objectId, columnId, newRank, rowId);
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

  // Render a single column with its reorder wrapper
  const renderColumn = (status: FieldOption, columnObjects: ProjectObject[], hideHeader?: boolean, rowId?: string) => {
    const isDragging = draggedColumnId === status.id;
    const dropHandler = rowId !== undefined
      ? (objectId: string, columnId: string, newRank?: number) => handleDrop(objectId, columnId, newRank, rowId)
      : handleDrop;
    return (
      <div
        key={status.id}
        draggable={isReordering && !hideHeader}
        onDragStart={isReordering && !hideHeader ? (e) => handleColumnDragStart(e, status.id) : undefined}
        onDragOver={isReordering && !hideHeader ? (e) => handleColumnDragOver(e, status.id) : undefined}
        onDragEnd={isReordering && !hideHeader ? handleColumnDragEnd : undefined}
        className={cn(
          !hideHeader && isReordering && "cursor-grab active:cursor-grabbing transition-transform duration-200 ease-out",
          !hideHeader && isDragging && "opacity-90 scale-[1.02] shadow-xl z-10 rotate-1"
        )}
      >
        <BoardColumn
          id={status.id}
          name={status.name}
          colour={status.colour}
          objects={columnObjects}
          fields={visibleFields}
          options={classOptions}
          prefix={project.project.prefix}
          objectMap={objectMap}
          classMap={classMap}
          allObjects={objects}
          statusField={statusField}
          onCardClick={isReordering ? undefined : onCardClick}
          onCreateClick={isReordering ? undefined : () => onCreateClick?.(status.id)}
          onDrop={isReordering ? undefined : dropHandler}
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
          hideHeader={hideHeader}
        />
      </div>
    );
  };

  // Render a swimlane row
  const renderSwimlane = (rowId: string, rowOption: FieldOption | null, rowData: Record<string, ProjectObject[]>) => {
    const label = rowOption?.name || "[not set]";
    const colour = rowOption?.colour;
    const hasNoStatusItems = !isReordering && (rowData[""]?.length || 0) > 0;

    return (
      <div key={rowId || "__none__"} className="border-b last:border-b-0">
        <div className="flex gap-4">
          {/* Row label */}
          <div className="w-48 shrink-0 p-3 pt-4 sticky left-0 bg-background z-10">
            <div className="flex items-center gap-2">
              {colour && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colour }}
                />
              )}
              <span className={cn(
                "font-medium text-sm truncate",
                !rowOption && "text-muted-foreground"
              )}>
                {label}
              </span>
            </div>
          </div>

          {/* Columns within this row */}
          {columnsToRender.map((status) =>
            renderColumn(status, rowData[status.id] || [], true, rowId)
          )}

          {/* No status column within this row */}
          {hasNoStatusItems && (
            <BoardColumn
              id=""
              name="No status"
              objects={rowData[""]}
              fields={visibleFields}
              options={classOptions}
              prefix={project.project.prefix}
              objectMap={objectMap}
              classMap={classMap}
              allObjects={objects}
              statusField={statusField}
              onCardClick={onCardClick}
              onDrop={(objectId, columnId, newRank) => handleDrop(objectId, columnId, newRank, rowId)}
              hideHeader
            />
          )}
        </div>
      </div>
    );
  };

  // Swimlane layout (when rowField is active)
  if (hasRows) {
    // Check if there are any objects without a row value
    const hasNoRowObjects = Object.values(objectsByRowAndStatus[""] || {}).some(
      (arr) => arr.length > 0
    );

    return (
      <div className="pb-2">
        {/* Column headers row */}
        <div className="flex gap-4 sticky top-0 z-20 bg-background border-b">
          {/* Spacer for row label column */}
          <div className="w-48 shrink-0" />

          {/* Column headers */}
          {columnsToRender.map((status) => (
            <div
              key={status.id}
              className="w-72 shrink-0 p-3"
              draggable={isReordering}
              onDragStart={isReordering ? (e) => handleColumnDragStart(e, status.id) : undefined}
              onDragOver={isReordering ? (e) => handleColumnDragOver(e, status.id) : undefined}
              onDragEnd={isReordering ? handleColumnDragEnd : undefined}
            >
              <div className="flex items-center gap-2">
                {status.colour && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.colour }}
                  />
                )}
                <span className="font-medium text-sm">{status.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Swimlane rows */}
        {rowOptions.map((rowOpt) => {
          const rowData = objectsByRowAndStatus[rowOpt.id];
          if (!rowData) return null;
          return renderSwimlane(rowOpt.id, rowOpt, rowData);
        })}

        {/* "No value" swimlane at bottom */}
        {hasNoRowObjects && renderSwimlane("", null, objectsByRowAndStatus[""] || {})}
      </div>
    );
  }

  // Flat layout (no row field — existing behavior)
  return (
    <div className="flex gap-4 pb-2">
      {columnsToRender.map((status) =>
        renderColumn(status, objectsByStatus[status.id] || [])
      )}

      {/* Column for items without status */}
      {!isReordering && objectsByStatus[""]?.length > 0 && (
        <BoardColumn
          id=""
          name="No status"
          objects={objectsByStatus[""]}
          fields={visibleFields}
          options={classOptions}
          prefix={project.project.prefix}
          objectMap={objectMap}
          classMap={classMap}
          allObjects={objects}
          statusField={statusField}
          onCardClick={onCardClick}
          onDrop={handleDrop}
        />
      )}
    </div>
  );
}
