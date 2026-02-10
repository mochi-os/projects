// Mochi Projects: Filter bar component
// Copyright Alistair Cunningham 2026

import { X } from "lucide-react";
import { Button } from "@mochi/common";
import type { ProjectDetails, FieldOption } from "@/types";

export interface FilterState {
  search: string;
  status: string;
  priority: string;
  owner: string;
  watched: boolean;
}

interface FilterBarProps {
  project: ProjectDetails;
  columnField: string;
  rowField: string;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterBar({
  project,
  columnField,
  rowField,
  filters,
  onFilterChange,
}: FilterBarProps) {
  const firstClassId = project.classes[0]?.id;
  const classOptions = firstClassId ? project.options[firstClassId] || {} : {};
  const statusOptions: FieldOption[] = columnField ? classOptions[columnField] || [] : [];
  const priorityOptions: FieldOption[] = rowField ? classOptions[rowField] || [] : [];

  const clearFilter = (key: keyof FilterState) => {
    onFilterChange({ ...filters, [key]: key === "watched" ? false : "" });
  };

  const clearAllFilters = () => {
    onFilterChange({ search: "", status: "", priority: "", owner: "", watched: false });
  };

  const activeFilters: {
    key: keyof FilterState;
    label: string;
    value: string;
  }[] = [];

  if (filters.search) {
    activeFilters.push({
      key: "search",
      label: "Search",
      value: filters.search,
    });
  }
  if (filters.status) {
    const option = statusOptions.find((o) => o.id === filters.status);
    activeFilters.push({
      key: "status",
      label: "Status",
      value: option?.name || filters.status,
    });
  }
  if (filters.priority) {
    const option = priorityOptions.find((o) => o.id === filters.priority);
    activeFilters.push({
      key: "priority",
      label: "Priority",
      value: option?.name || filters.priority,
    });
  }
  if (filters.watched) {
    activeFilters.push({
      key: "watched",
      label: "Watched",
      value: "On",
    });
  }

  // Don't render anything if no active filters
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Active filter chips */}
      {activeFilters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-muted rounded-full"
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span className="truncate max-w-[100px]">{filter.value}</span>
          <button
            onClick={() => clearFilter(filter.key)}
            className="ml-0.5 hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {/* Clear all filters */}
      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground"
          onClick={clearAllFilters}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
