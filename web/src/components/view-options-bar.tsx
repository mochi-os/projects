// Mochi Projects: Collapsible view options bar
// Copyright Alistair Cunningham 2026

import { useEffect, useRef } from "react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SortDirectionButton,
  cn,
} from "@mochi/common";
import { LayoutGrid, Network } from "lucide-react";
import type { ProjectDetails, ProjectView, FieldOption, SortState } from "@/types";
import type { FilterState } from "@/features/views/components/filter-bar";

const SORT_OPTIONS = [
  { id: "rank", label: "Manual" },
  { id: "title", label: "Title" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "created", label: "Created" },
  { id: "updated", label: "Updated" },
] as const;

interface ViewOptionsBarProps {
  project: ProjectDetails;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
  showSort: boolean;
}

export function ViewOptionsBar({
  project,
  filters,
  onFilterChange,
  activeViewId,
  onViewChange,
  sort,
  onSortChange,
  showSort,
}: ViewOptionsBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when bar mounts
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  // Get the active view to determine which fields to use for filtering
  const activeView = project.views.find((v) => v.id === activeViewId);

  // Get the column field (used for status-like filtering) from the view
  const columnField = activeView?.columns || "status";
  // Get the row field (used for priority-like filtering) from the view
  const rowField = activeView?.rows || "priority";

  // Get the first type ID (or first type from the view's type filter)
  const viewTypes = activeView?.types || [];
  const firstTypeId = viewTypes.length > 0 ? viewTypes[0] : project.types[0]?.id;

  // Get options for the column and row fields from the first type
  const typeOptions = firstTypeId ? project.options[firstTypeId] || {} : {};
  const statusOptions: FieldOption[] = typeOptions[columnField] || [];
  const priorityOptions: FieldOption[] = typeOptions[rowField] || [];

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 flex-wrap">
      {/* View Switcher */}
      <div className="flex gap-1">
        {project.views.map((view: ProjectView) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors",
              activeViewId === view.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {view.viewtype === "tree" ? (
              <Network className="size-3.5" />
            ) : (
              <LayoutGrid className="size-3.5" />
            )}
            {view.name}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-border" />

      {/* Status Filter */}
      <Select
        value={filters.status || "all"}
        onValueChange={(value) =>
          onFilterChange({ ...filters, status: value === "all" ? "" : value })
        }
      >
        <SelectTrigger className="h-7 text-xs w-auto">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statusOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: option.colour }}
                />
                {option.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority || "all"}
        onValueChange={(value) =>
          onFilterChange({ ...filters, priority: value === "all" ? "" : value })
        }
      >
        <SelectTrigger className="h-7 text-xs w-auto">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {priorityOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: option.colour }}
                />
                {option.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search */}
      <Input
        ref={searchRef}
        type="search"
        placeholder="Search..."
        value={filters.search}
        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
        className="h-7 text-xs w-[200px]"
      />

      {/* Sort (only for list view) */}
      {showSort && (
        <div className="flex items-center gap-2 ml-auto">
          <Select
            value={sort?.field || "rank"}
            onValueChange={(value) =>
              onSortChange({ field: value, direction: sort?.direction || "asc" })
            }
          >
            <SelectTrigger className="h-7 text-xs w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SortDirectionButton
            direction={sort?.direction || "asc"}
            onToggle={() =>
              onSortChange({
                field: sort?.field || "rank",
                direction: sort?.direction === "asc" ? "desc" : "asc",
              })
            }
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
