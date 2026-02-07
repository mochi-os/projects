// Mochi Projects: Board container component
// Copyright Alistair Cunningham 2026

import { useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { cn } from "@mochi/common";
import { BoardColumn, type BoardColumnRow } from "./board-column";
import type { ProjectObject, ProjectDetails, ProjectClass, FieldOption, SortState } from "@/types";

interface BoardContainerProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  statusField: string;
  rowField?: string;
  viewFields?: string;
  sort?: SortState | null;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: (statusId: string, rowId?: string) => void;
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

  // Map view fields in order, looking up from class fields
  const visibleFields = useMemo(() => {
    const fieldMap = new Map(classFields.map((f) => [f.id, f]));
    return viewFieldsList.map((id) => fieldMap.get(id)).filter(Boolean) as typeof classFields;
  }, [classFields, viewFieldsList]);

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

  // Measure board position to compute viewport-filling min-height dynamically.
  // Observes ancestor elements for resize so minHeight recalculates when
  // siblings like the view options bar appear or disappear.
  const boardRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState("");

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const top = Math.ceil(el.getBoundingClientRect().top);
      setMinHeight(`calc(100dvh - ${top}px)`);
    };
    update();
    const observer = new ResizeObserver(update);
    let ancestor = el.parentElement;
    while (ancestor) {
      observer.observe(ancestor);
      ancestor = ancestor.parentElement;
    }
    return () => observer.disconnect();
  }, []);

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

  // Auto-scroll the nearest scrollable ancestor when dragging near its edges
  const scrollRafRef = useRef(0);
  const scrollVelocityRef = useRef({ x: 0, y: 0 });
  const scrollContainerRef = useRef<Element | null>(null);

  useEffect(() => {
    // Find the scrollable ancestor (the SidebarInset with overflow-auto)
    const findScrollParent = (el: Element | null): Element | null => {
      while (el) {
        const style = getComputedStyle(el);
        if (style.overflow === "auto" || style.overflow === "scroll" ||
            style.overflowX === "auto" || style.overflowX === "scroll" ||
            style.overflowY === "auto" || style.overflowY === "scroll") {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    if (boardRef.current) {
      scrollContainerRef.current = findScrollParent(boardRef.current);
    }
  }, []);

  useEffect(() => {
    const edgeSize = 60;
    const maxSpeed = 20;

    const onDragOver = (e: DragEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const { clientX, clientY } = e;
      let vx = 0;
      let vy = 0;

      // Horizontal edges relative to scroll container
      const distLeft = clientX - rect.left;
      const distRight = rect.right - clientX;
      if (distLeft < edgeSize && distLeft >= 0) {
        vx = -maxSpeed * (1 - distLeft / edgeSize);
      } else if (distRight < edgeSize && distRight >= 0) {
        vx = maxSpeed * (1 - distRight / edgeSize);
      }

      // Vertical edges relative to scroll container
      const distTop = clientY - rect.top;
      const distBottom = rect.bottom - clientY;
      if (distTop < edgeSize && distTop >= 0) {
        vy = -maxSpeed * (1 - distTop / edgeSize);
      } else if (distBottom < edgeSize && distBottom >= 0) {
        vy = maxSpeed * (1 - distBottom / edgeSize);
      }

      scrollVelocityRef.current = { x: vx, y: vy };

      if ((vx !== 0 || vy !== 0) && !scrollRafRef.current) {
        const tick = () => {
          const { x, y } = scrollVelocityRef.current;
          if (x === 0 && y === 0) {
            scrollRafRef.current = 0;
            return;
          }
          container.scrollBy(x, y);
          scrollRafRef.current = requestAnimationFrame(tick);
        };
        scrollRafRef.current = requestAnimationFrame(tick);
      }
    };

    const onDragEnd = () => {
      scrollVelocityRef.current = { x: 0, y: 0 };
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = 0;
      }
    };

    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragend", onDragEnd);
    document.addEventListener("drop", onDragEnd);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragend", onDragEnd);
      document.removeEventListener("drop", onDragEnd);
      onDragEnd();
    };
  }, []);

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
  const renderColumn = (
    status: FieldOption,
    columnObjects: ProjectObject[],
    rows?: BoardColumnRow[],
    gridCol?: number,
    gridRowSpan?: number,
    onCreateInRow?: (rowId: string) => void,
  ) => {
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
        style={gridCol ? {
          gridColumn: gridCol,
          gridRow: `1 / span ${gridRowSpan}`,
          display: 'grid',
          gridTemplateRows: 'subgrid',
        } : undefined}
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
          onCreateInRow={isReordering ? undefined : onCreateInRow}
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
          rows={rows}
        />
      </div>
    );
  };

  // Swimlane layout (when rowField is active)
  if (hasRows) {
    // Check if there are any objects without a row value
    const hasNoRowObjects = Object.values(objectsByRowAndStatus[""] || {}).some(
      (arr) => arr.length > 0
    );

    // Build row metadata for swimlane columns
    const swimlaneRows: { id: string; label: string; colour?: string }[] = [
      ...rowOptions.map((r) => ({ id: r.id, label: r.name, colour: r.colour })),
      ...(hasNoRowObjects ? [{ id: "", label: "[not set]" }] : []),
    ];

    // Check if any row has objects without a status
    const hasNoStatusSwimlane = !isReordering && swimlaneRows.some(
      (row) => (objectsByRowAndStatus[row.id]?.[""]?.length || 0) > 0
    );

    const totalCols = columnsToRender.length + (hasNoStatusSwimlane ? 1 : 0);

    return (
      <div
        ref={boardRef}
        className="grid pb-2 gap-x-4"
        style={{
          minHeight,
          gridTemplateColumns: `max-content repeat(${totalCols}, 18rem)`,
          gridTemplateRows: `auto repeat(${swimlaneRows.length}, 1fr)`,
        }}
      >
        {/* Row indicators in left column */}
        {swimlaneRows.map((row, r) => (
          <div
            key={`label-${row.id}`}
            className={cn(
              "flex items-start gap-2 pt-2 pr-3",
              r < swimlaneRows.length - 1 && "border-b"
            )}
            style={{ gridColumn: 1, gridRow: r + 2 }}
          >
            {row.colour && (
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: row.colour }}
              />
            )}
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {row.label}
            </span>
          </div>
        ))}

        {/* Board columns */}
        {columnsToRender.map((status, c) =>
          renderColumn(
            status,
            [],
            swimlaneRows.map((row) => ({
              id: row.id,
              label: row.label,
              colour: row.colour,
              objects: objectsByRowAndStatus[row.id]?.[status.id] || [],
            })),
            c + 2,
            swimlaneRows.length + 1,
            onCreateClick ? (rowId: string) => onCreateClick(status.id, rowId) : undefined,
          )
        )}

        {/* Column for items without status */}
        {hasNoStatusSwimlane && (
          <div
            style={{
              gridColumn: columnsToRender.length + 2,
              gridRow: `1 / span ${swimlaneRows.length + 1}`,
              display: 'grid',
              gridTemplateRows: 'subgrid',
            }}
          >
            <BoardColumn
              id=""
              name="No status"
              objects={[]}
              fields={visibleFields}
              options={classOptions}
              prefix={project.project.prefix}
              objectMap={objectMap}
              classMap={classMap}
              allObjects={objects}
              statusField={statusField}
              onCardClick={onCardClick}
              onDrop={handleDrop}
              rows={swimlaneRows.map((row) => ({
                id: row.id,
                label: row.label,
                colour: row.colour,
                objects: objectsByRowAndStatus[row.id]?.[""] || [],
              }))}
            />
          </div>
        )}
      </div>
    );
  }

  // Flat layout (no row field — existing behavior)
  return (
    <div ref={boardRef} className="flex gap-4 pb-2" style={{ minHeight }}>
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
