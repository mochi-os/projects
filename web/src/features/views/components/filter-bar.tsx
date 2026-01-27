// Mochi Projects: Filter bar component
// Copyright Alistair Cunningham 2026

import { useState, forwardRef } from "react";
import { Search, X, Filter } from "lucide-react";
import {
  Input,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mochi/common";
import type { ProjectDetails, FieldOption } from "@/types";

export interface FilterState {
  search: string;
  status: string;
  priority: string;
  assignee: string;
}

interface FilterBarProps {
  project: ProjectDetails;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export const FilterBar = forwardRef<HTMLInputElement, FilterBarProps>(
  function FilterBar({ project, filters, onFilterChange }, ref) {
    const [searchValue, setSearchValue] = useState(filters.search);

    // Get status and priority options from the task type
    const taskFields = project.fields["task"] || [];
    const taskOptions = project.options["task"] || {};

    const statusField = taskFields.find((f) => f.id === "status");
    const priorityField = taskFields.find((f) => f.id === "priority");

    const statusOptions: FieldOption[] = statusField
      ? taskOptions["status"] || []
      : [];
    const priorityOptions: FieldOption[] = priorityField
      ? taskOptions["priority"] || []
      : [];

    const handleSearchChange = (value: string) => {
      setSearchValue(value);
      onFilterChange({ ...filters, search: value });
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchValue("");
        onFilterChange({ ...filters, search: "" });
      }
    };

    const handleStatusChange = (value: string) => {
      onFilterChange({ ...filters, status: value });
    };

    const handlePriorityChange = (value: string) => {
      onFilterChange({ ...filters, priority: value });
    };

    const clearFilter = (key: keyof FilterState) => {
      onFilterChange({ ...filters, [key]: "" });
      if (key === "search") {
        setSearchValue("");
      }
    };

    const clearAllFilters = () => {
      setSearchValue("");
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

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={ref}
              type="search"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-8 h-8"
            />
          </div>

          {/* Status filter */}
          {statusOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="size-3 mr-1" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleStatusChange("")}>
                  All
                </DropdownMenuItem>
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => handleStatusChange(option.id)}
                  >
                    <span
                      className="size-2 rounded-full mr-2"
                      style={{ backgroundColor: option.colour }}
                    />
                    {option.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Priority filter */}
          {priorityOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="size-3 mr-1" />
                  Priority
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handlePriorityChange("")}>
                  All
                </DropdownMenuItem>
                {priorityOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => handlePriorityChange(option.id)}
                  >
                    <span
                      className="size-2 rounded-full mr-2"
                      style={{ backgroundColor: option.colour }}
                    />
                    {option.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Clear all filters */}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={clearAllFilters}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
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
          </div>
        )}
      </div>
    );
  },
);
