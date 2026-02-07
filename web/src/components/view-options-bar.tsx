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
import { LayoutGrid, ListTree } from "lucide-react";
import type { ProjectDetails, ProjectView, SortState } from "@/types";
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
            {view.viewtype === "list" ? (
              <ListTree className="size-3.5" />
            ) : (
              <LayoutGrid className="size-3.5" />
            )}
            {view.name}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-border" />

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
