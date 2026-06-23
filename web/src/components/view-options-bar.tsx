// Mochi Projects: Collapsible view options bar
// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState, useMemo } from "react";
import { Trans, useLingui } from '@lingui/react/macro'
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
  ViewTabs,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@mochi/web";
import { Eye, SlidersHorizontal } from "lucide-react";
import type { ProjectDetails, ProjectField, SortState } from "@/types";
import type { FilterState } from "@/features/views/components/filter-bar";

function useBuiltInSortOptions() {
  const { t } = useLingui();
  return useMemo(
    () => [
      { id: "rank", label: t`Manual` },
      { id: "number", label: t`Number` },
      { id: "created", label: t`Created` },
      { id: "updated", label: t`Updated` },
    ],
    [t],
  );
}

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
  const builtInSortOptions = useBuiltInSortOptions();
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
            <div className="flex min-w-max items-center px-4 py-2">
              <ViewTabs variant="pill" views={project.views} activeViewId={activeViewId} onViewChange={onViewChange} />
            </div>
          </div>
          <div className="flex shrink-0 items-center border-s px-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasActiveMobileControls ? "default" : "ghost"}
                  size="icon"
                  className="size-9"
                  aria-label={t`Open view controls`}
                  onClick={() => setIsMobileControlsOpen(true)}
                >
                  <SlidersHorizontal className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t`Open view controls`}</TooltipContent>
            </Tooltip>
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
              variant={filters.watched ? "default" : "outline"}
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
                        {builtInSortOptions.map((option) => (
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
        <ViewTabs variant="pill" views={project.views} activeViewId={activeViewId} onViewChange={onViewChange} />

        <div className="bg-border mx-1 h-6 w-px shrink-0" />

        <Input
          type="search"
          placeholder={t`Search...`}
          value={filters.search}
          onChange={(e) => updateSearch(e.target.value)}
          className="h-9 w-[200px] text-xs"
        />

        <Button
          variant={filters.watched ? "default" : "ghost"}
          size="sm"
          className="px-2 text-xs"
          aria-label={t`Toggle watched filter`}
          onClick={() => onFilterChange({ ...filters, watched: !filters.watched })}
        >
          <Eye className="size-3.5 sm:me-1" />
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
                  {builtInSortOptions.map((option) => (
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

