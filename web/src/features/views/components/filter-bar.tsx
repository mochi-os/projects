// Mochi Projects: Filter bar component
// Copyright Alistair Cunningham 2026

import { X, ArrowUpDown, Check } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mochi/common";
import type { ProjectDetails, FieldOption } from "@/types";
import type { SortState } from "@/features/list";

export interface FilterState {
  search: string;
  status: string;
  priority: string;
  assignee: string;
}

const SORT_OPTIONS = [
  { id: "rank", label: "Manual order" },
  { id: "title", label: "Title" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "created", label: "Created" },
  { id: "updated", label: "Updated" },
] as const;

interface FilterBarProps {
  project: ProjectDetails;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  showSort?: boolean;
}

export function FilterBar({
  project,
  filters,
  onFilterChange,
  sort,
  onSortChange,
  showSort,
}: FilterBarProps) {
  // Get status and priority options from the task type
  const taskOptions = project.options["task"] || {};
  const statusOptions: FieldOption[] = taskOptions["status"] || [];
  const priorityOptions: FieldOption[] = taskOptions["priority"] || [];

  const clearFilter = (key: keyof FilterState) => {
    onFilterChange({ ...filters, [key]: "" });
  };

  const clearAllFilters = () => {
    onFilterChange({ search: "", status: "", priority: "", assignee: "" });
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

  // Don't render anything if no filters and no sort to show
  if (activeFilters.length === 0 && !showSort) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap px-4">
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

      {/* Sort dropdown */}
      {showSort && onSortChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs ml-auto">
              <ArrowUpDown className="size-3 mr-1" />
              {SORT_OPTIONS.find((o) => o.id === sort?.field)?.label || "Sort"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => onSortChange({ field: option.id, direction: "asc" })}
              >
                {option.label}
                {sort?.field === option.id && <Check className="size-4 ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
