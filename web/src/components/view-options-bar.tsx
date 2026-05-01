// Mochi Projects: Collapsible view options bar
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Button,
  Input,
  Label,
  PageUtilityBar,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SortDirectionButton,
  cn,
} from "@mochi/web";
import { Eye, LayoutGrid, ListTree, SlidersHorizontal } from "lucide-react";
import type { ProjectDetails, ProjectField, ProjectView, SortState } from "@/types";
import type { FilterState } from "@/features/views/components/filter-bar";

const BUILT_IN_SORT_OPTIONS = [
  { id: "rank", label: "Manual" },
  { id: "number", label: "Number" },
  { id: "created", label: "Created" },
  { id: "updated", label: "Updated" },
] as const;

interface ViewOptionsBarProps {
  project: ProjectDetails;
  fields?: ProjectField[];
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
  fields,
  filters,
  onFilterChange,
  activeViewId,
  onViewChange,
  sort,
  onSortChange,
  showSort,
}: ViewOptionsBarProps) {
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
  const hasSearchValue = filters.search.trim().length > 0;

  // Build sort options: built-in + fields with 'sort' flag
  const sortFieldOptions = (fields || [])
    .filter((f) => f.flags?.split(",").includes("sort"))
    .map((f) => ({ id: `field:${f.id}`, label: f.name }));

  const updateSearch = (search: string) => {
    onFilterChange({ ...filters, search });
  };

  const hasActiveMobileControls =
    hasSearchValue ||
    filters.watched ||
    (showSort && (sort?.field || "rank") !== "rank") ||
    (showSort && (sort?.direction || "asc") !== "asc");

  return (
    <>
      <div className="sticky top-[calc(var(--sticky-top,0px)+56px)] z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:hidden">
        <div className="flex items-center">
          <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <div className="flex min-w-max items-center gap-1 px-4 py-2">
              {project.views.map((view: ProjectView) => (
                <ViewTab
                  key={view.id}
                  view={view}
                  active={activeViewId === view.id}
                  onClick={() => onViewChange(view.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center border-l px-2">
            <Button
              variant={hasActiveMobileControls ? "secondary" : "ghost"}
              size="icon"
              className="size-9"
              aria-label={t`Open view controls`}
              onClick={() => setIsMobileControlsOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={isMobileControlsOpen} onOpenChange={setIsMobileControlsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] gap-0 rounded-t-lg p-0 sm:hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle><Trans>View controls</Trans></SheetTitle>
            <SheetDescription><Trans>Search, watch, and sort this view.</Trans></SheetDescription>
          </SheetHeader>
          <div className="space-y-5 overflow-y-auto p-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="project-mobile-view-search"><Trans>Search</Trans></Label>
              <Input
                id="project-mobile-view-search"
                type="search"
                placeholder={t`Search...`}
                value={filters.search}
                onChange={(e) => updateSearch(e.target.value)}
              />
            </div>

            <Button
              variant={filters.watched ? "secondary" : "outline"}
              className="w-full justify-start"
              aria-label={t`Toggle watched filter`}
              onClick={() => onFilterChange({ ...filters, watched: !filters.watched })}
            >
              <Eye className="size-4" />
              <Trans>Watched only</Trans>
            </Button>

            {showSort && (
              <div className="space-y-2">
                <Label><Trans>Sort</Trans></Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={sort?.field || "rank"}
                    onValueChange={(value) =>
                      onSortChange({ field: value, direction: sort?.direction || "asc" })
                    }
                  >
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortFieldOptions.length > 0 && (
                        <>
                          <SelectGroup>
                            {sortFieldOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                        </>
                      )}
                      <SelectGroup>
                        {BUILT_IN_SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
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
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PageUtilityBar compact scrollable className="hidden sm:block">
        {project.views.map((view: ProjectView) => (
          <ViewTab
            key={view.id}
            view={view}
            active={activeViewId === view.id}
            onClick={() => onViewChange(view.id)}
          />
        ))}

        <div className="bg-border mx-1 h-6 w-px shrink-0" />

        <Input
          type="search"
          placeholder={t`Search...`}
          value={filters.search}
          onChange={(e) => updateSearch(e.target.value)}
          className="h-9 w-[200px] text-xs"
        />

        <Button
          variant={filters.watched ? "secondary" : "ghost"}
          size="sm"
          className="px-2 text-xs"
          aria-label={t`Toggle watched filter`}
          onClick={() => onFilterChange({ ...filters, watched: !filters.watched })}
        >
          <Eye className="size-3.5 sm:mr-1" />
          <span><Trans>Watched</Trans></span>
        </Button>

        {showSort && (
          <div className="flex items-center gap-2">
            <Select
              value={sort?.field || "rank"}
              onValueChange={(value) =>
                onSortChange({ field: value, direction: sort?.direction || "asc" })
              }
            >
              <SelectTrigger className="w-[132px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortFieldOptions.length > 0 && (
                  <>
                    <SelectGroup>
                      {sortFieldOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                  </>
                )}
                <SelectGroup>
                  {BUILT_IN_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
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
              className="size-9"
            />
          </div>
        )}
      </PageUtilityBar>
    </>
  );
}

interface ViewTabProps {
  view: ProjectView;
  active: boolean;
  onClick: () => void;
}

function ViewTab({ view, active, onClick }: ViewTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors whitespace-nowrap",
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      )}
    >
      {view.viewtype === "list" ? (
        <ListTree className="size-3.5" />
      ) : (
        <LayoutGrid className="size-3.5" />
      )}
      {view.name}
    </button>
  );
}
