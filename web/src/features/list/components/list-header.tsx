// Mochi Projects: List header component
// Copyright Alistair Cunningham 2026

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@mochi/common";
import type { ProjectField } from "@/types";

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

interface ListHeaderProps {
  fields: ProjectField[];
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
}

export function ListHeader({
  fields,
  sort,
  onSortChange,
}: ListHeaderProps) {
  const handleSort = (fieldId: string) => {
    if (sort?.field === fieldId) {
      // Toggle direction
      onSortChange({
        field: fieldId,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      // New sort field, default to asc
      onSortChange({ field: fieldId, direction: "asc" });
    }
  };

  const getSortIcon = (fieldId: string) => {
    if (sort?.field !== fieldId) {
      return <ChevronsUpDown className="size-3 opacity-50" />;
    }
    return sort.direction === "asc" ? (
      <ChevronUp className="size-3" />
    ) : (
      <ChevronDown className="size-3" />
    );
  };

  return (
    <div className="flex items-center border-b border-border bg-muted/50 text-sm font-medium text-muted-foreground">
      {/* Field columns */}
      {fields.map((field) => (
        <div
          key={field.id}
          className={cn(
            "px-3 py-2 cursor-pointer hover:text-foreground flex items-center gap-1",
            field.id === "title" ? "flex-1" : "w-32",
          )}
          onClick={() => handleSort(field.id)}
        >
          {field.name}
          {getSortIcon(field.id)}
        </div>
      ))}
    </div>
  );
}
