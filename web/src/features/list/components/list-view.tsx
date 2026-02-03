// Mochi Projects: List view component
// Copyright Alistair Cunningham 2026

import { useMemo } from "react";
import { ListSkeleton, EmptyState, Button } from "@mochi/common";
import { FolderKanban, Plus } from "lucide-react";
import { ListHeader, type SortState } from "./list-header";
import { ListRow } from "./list-row";
import type { ProjectDetails, ProjectObject } from "@/types";

interface ListViewProps {
  project: ProjectDetails;
  objects: ProjectObject[];
  peopleMap: Record<string, string>;
  sort: SortState | null;
  isLoading?: boolean;
  onSortChange: (sort: SortState) => void;
  onCardClick: (object: ProjectObject) => void;
  onCreateClick?: () => void;
}

export function ListView({
  project,
  objects,
  peopleMap,
  sort,
  isLoading,
  onSortChange,
  onCardClick,
  onCreateClick,
}: ListViewProps) {
  // Get fields to display from the first type (card fields or all fields)
  const firstTypeId = project.types[0]?.id;
  
  const taskFields = useMemo(() => 
    firstTypeId ? project.fields[firstTypeId] || [] : [],
    [firstTypeId, project.fields]
  );
  
  const taskOptions = useMemo(() => 
    firstTypeId ? project.options[firstTypeId] || {} : {},
    [firstTypeId, project.options]
  );

  // Get visible fields (exclude description for list view)
  const visibleFields = useMemo(() => 
    taskFields.filter((f) => f.card === 1 || f.id === "title"),
    [taskFields]
  );

  // Sort objects
  const sortedObjects = useMemo(() => {
    if (!sort) {
      return objects;
    }

    // Check if the sort field is an enumerated
    const sortField = taskFields.find((f) => f.id === sort.field);
    const isEnum = sortField?.fieldtype === "enumerated";
    const fieldOptions = isEnum ? taskOptions[sort.field] || [] : [];

    // Build a map of option ID to rank for enumerated fields
    const optionRankMap: Record<string, number> = {};
    if (isEnum) {
      for (const opt of fieldOptions) {
        optionRankMap[opt.id] = opt.rank;
      }
    }

    return [...objects].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sort.field === "rank") {
        aVal = a.rank || 0;
        bVal = b.rank || 0;
      } else if (sort.field === "number") {
        aVal = a.number;
        bVal = b.number;
      } else if (sort.field === "created") {
        aVal = a.created;
        bVal = b.created;
      } else if (sort.field === "updated") {
        aVal = a.updated;
        bVal = b.updated;
      } else if (isEnum) {
        // For enumerated fields, sort by option rank
        const aOptVal = a.values[sort.field] || "";
        const bOptVal = b.values[sort.field] || "";
        // Use rank if available, otherwise put at end (9999)
        aVal = optionRankMap[aOptVal] ?? 9999;
        bVal = optionRankMap[bOptVal] ?? 9999;
      } else {
        aVal = a.values[sort.field] || "";
        bVal = b.values[sort.field] || "";
      }

      // Handle numeric comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle string comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sort.direction === "asc") {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [objects, sort, taskFields, taskOptions]);

  if (isLoading) {
    return <ListSkeleton count={5} />;
  }

  if (objects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No items found"
        description="Try adjusting your filters or create a new item to get started."
      >
        {onCreateClick && (
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 size-4" />
            Create item
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <ListHeader
        fields={visibleFields}
        sort={sort}
        onSortChange={onSortChange}
      />
      <div className="divide-y divide-border">
        {sortedObjects.map((object) => (
          <ListRow
            key={object.id}
            object={object}
            fields={visibleFields}
            options={taskOptions}
            peopleMap={peopleMap}
            onClick={() => onCardClick(object)}
          />
        ))}
      </div>
    </div>
  );
}
