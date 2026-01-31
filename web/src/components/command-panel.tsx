// Mochi Projects: Command panel for search, view, filter, and sort
// Copyright Alistair Cunningham 2026

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@mochi/common";
import { ArrowDown, ArrowUp, LayoutGrid, List } from "lucide-react";
import type { ProjectDetails, ProjectView, FieldOption } from "@/types";
import type { FilterState } from "@/features/views/components/filter-bar";
import type { SortState } from "@/features/list";

const SORT_OPTIONS = [
  { id: "rank", label: "Manual order" },
  { id: "title", label: "Title" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "created", label: "Created" },
  { id: "updated", label: "Updated" },
] as const;

interface CommandPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDetails;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState) => void;
  showSort: boolean;
}

export function CommandPanel({
  open,
  onOpenChange,
  project,
  filters,
  onFilterChange,
  activeViewId,
  onViewChange,
  sort,
  onSortChange,
  showSort,
}: CommandPanelProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const taskOptions = project.options["task"] || {};
  const statusOptions: FieldOption[] = taskOptions["status"] || [];
  const priorityOptions: FieldOption[] = taskOptions["priority"] || [];

  const hasActiveFilters = filters.search || filters.status || filters.priority || filters.owner;

  const clearAllFilters = () => {
    onFilterChange({ search: "", status: "", priority: "", owner: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        {/* View Switcher */}
        <div className="p-3 pr-12 border-b">
          <div className="flex gap-1">
            {project.views.map((view: ProjectView) => (
              <button
                key={view.id}
                onClick={() => {
                  onViewChange(view.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeViewId === view.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {view.viewtype === "list" ? (
                  <List className="size-4" />
                ) : (
                  <LayoutGrid className="size-4" />
                )}
                {view.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-muted-foreground">Filters</div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Status Filter */}
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFilterChange({ ...filters, status: value === "all" ? "" : value })
              }
            >
              <SelectTrigger className="h-8 text-sm">
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
              <SelectTrigger className="h-8 text-sm">
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
          </div>
          {/* Search */}
          <Input
            ref={searchRef}
            type="search"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="h-8 mt-2"
          />
        </div>

        {/* Sort (only for list view) */}
        {showSort && (
          <div className="p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Sort</div>
            <div className="flex gap-2">
              <Select
                value={sort?.field || "rank"}
                onValueChange={(value) =>
                  onSortChange({ field: value, direction: sort?.direction || "asc" })
                }
              >
                <SelectTrigger className="h-8 text-sm flex-1">
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
              <button
                onClick={() =>
                  onSortChange({
                    field: sort?.field || "rank",
                    direction: sort?.direction === "asc" ? "desc" : "asc",
                  })
                }
                className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted"
                title={sort?.direction === "asc" ? "Ascending" : "Descending"}
              >
                {sort?.direction === "asc" ? (
                  <ArrowUp className="size-4" />
                ) : (
                  <ArrowDown className="size-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
