// Mochi Projects: Board container component
// Copyright Alistair Cunningham 2026

import { useMemo } from "react";
import { BoardColumn } from "./board-column";
import type { ProjectObject, ProjectDetails } from "@/types";

interface BoardContainerProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  statusField: string;
  onCardClick?: (object: ProjectObject) => void;
  onCreateClick?: (statusId: string) => void;
  onMoveObject?: (objectId: string, newStatus: string) => void;
}

export function BoardContainer({
  project,
  objects,
  statusField,
  onCardClick,
  onCreateClick,
  onMoveObject,
}: BoardContainerProps) {
  // Get the default type's fields (first type)
  const defaultType = project.types[0];
  const typeFields = defaultType ? project.fields[defaultType.id] || [] : [];
  const typeOptions = defaultType ? project.options[defaultType.id] || {} : {};

  // Get status options for columns
  const statusOptions = useMemo(() => {
    const opts = typeOptions[statusField] || [];
    return opts.sort((a, b) => a.sort - b.sort);
  }, [typeOptions, statusField]);

  // Group objects by status
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

    return grouped;
  }, [objects, statusOptions, statusField]);

  const handleDrop = (objectId: string, columnId: string) => {
    onMoveObject?.(objectId, columnId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
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
          onCardClick={onCardClick}
          onCreateClick={() => onCreateClick?.(status.id)}
          onDrop={handleDrop}
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
          onCardClick={onCardClick}
          onDrop={handleDrop}
        />
      )}
    </div>
  );
}
