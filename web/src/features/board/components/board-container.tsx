// Mochi Projects: Board container component
// Copyright Alistair Cunningham 2026

import { useMemo } from "react";
import { BoardColumn } from "./board-column";
import type { ProjectObject, ProjectDetails, ProjectType } from "@/types";

interface BoardContainerProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  statusField: string;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: (statusId: string) => void;
  onMoveObject?: (objectId: string, newStatus: string, newRank?: number) => void;
  onDeleteColumn?: (typeId: string, fieldId: string, optionId: string) => Promise<void>;
}

export function BoardContainer({
  project,
  objects,
  statusField,
  onCardClick,
  onCreateClick,
  onMoveObject,
  onDeleteColumn,
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
    return opts.sort((a, b) => a.sort - b.sort);
  }, [typeOptions, statusField]);

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

  return (
    <div className="flex gap-4 pb-2">
      {statusOptions.map((status) => (
        <BoardColumn
          key={status.id}
          id={status.id}
          name={status.name}
          colour={status.colour}
          objects={objectsByStatus[status.id] || []}
          fields={typeFields.filter((f) => f.card === 1)}
          options={typeOptions}
          prefix={project.project.prefix}
          objectMap={objectMap}
          typeMap={typeMap}
          onCardClick={onCardClick}
          onCreateClick={() => onCreateClick?.(status.id)}
          onDrop={handleDrop}
          onDeleteColumn={
            onDeleteColumn && defaultType
              ? () => onDeleteColumn(defaultType.id, statusField, status.id)
              : undefined
          }
        />
      ))}

      {/* Column for items without status */}
      {objectsByStatus[""]?.length > 0 && (
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
