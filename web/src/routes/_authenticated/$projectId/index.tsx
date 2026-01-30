// Mochi Projects: Project page with board and list views
// Copyright Alistair Cunningham 2026

import { useState, useMemo, useCallback, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GeneralError,
  Main,
  PageHeader,
  usePageTitle,
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@mochi/common";
import { Check, Ellipsis, Filter, FolderKanban, LayoutGrid, List, Plus, Search, Settings2 } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectObject, ObjectTemplate } from "@/types";
import { BoardContainer } from "@/features/board/components";
import { ListView, type SortState } from "@/features/list";
import { FilterBar, type FilterState } from "@/features/views";
import {
  CreateObjectDialog,
  ObjectDetailPanel,
} from "@/features/objects/components";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";

interface SearchParams {
  view?: string;
}

export const Route = createFileRoute("/_authenticated/$projectId/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  loader: async ({ params }) => {
    const [projectResponse, templatesResponse] = await Promise.all([
      projectsApi.get(params.projectId),
      projectsApi.objectTemplates(),
    ]);
    return {
      project: projectResponse.data,
      templates: templatesResponse.data.templates,
    };
  },
  component: ProjectPage,
  errorComponent: ({ error }) => <GeneralError error={error} />,
});

function ProjectPage() {
  const { project, templates } = Route.useLoaderData() as {
    project: ProjectDetails;
    templates: ObjectTemplate[];
  };
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  usePageTitle(project.project.name);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<
    string | undefined
  >();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);

  // View state - initialize from URL or first view
  const defaultViewId = project.views[0]?.id || "board";
  const initialViewId = search.view && project.views.some((v) => v.id === search.view)
    ? search.view
    : defaultViewId;
  const [activeViewId, setActiveViewId] = useState(initialViewId);
  const activeView =
    project.views.find((v) => v.id === activeViewId) || project.views[0];

  // Sync URL when view changes
  useEffect(() => {
    const newView = activeViewId === defaultViewId ? undefined : activeViewId;
    if (search.view !== newView) {
      navigate({
        to: ".",
        search: { view: newView },
        replace: true,
      });
    }
  }, [activeViewId, defaultViewId, search.view, navigate]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    priority: "",
    assignee: "",
  });

  // Sort state for list view (default to rank/manual order)
  const [sort, setSort] = useState<SortState | null>({ field: "rank", direction: "asc" });

  // Get status and priority options
  const taskOptions = project.options["task"] || {};
  const statusOptions = taskOptions["status"] || [];
  const priorityOptions = taskOptions["priority"] || [];

  const queryClient = useQueryClient();

  // Load objects
  const { data: objectsData } = useQuery({
    queryKey: ["objects", params.projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(params.projectId);
      return response.data.objects;
    },
  });

  // Move object mutation
  const moveMutation = useMutation({
    mutationFn: async ({
      objectId,
      status,
      rank,
    }: {
      objectId: string;
      status: string;
      rank?: number;
    }) => {
      return projectsApi.moveObject(params.projectId, objectId, { status, rank });
    },
    onMutate: async ({ objectId, status, rank }) => {
      // Optimistically update the UI
      await queryClient.cancelQueries({
        queryKey: ["objects", params.projectId],
      });

      const previousObjects = queryClient.getQueryData<ProjectObject[]>([
        "objects",
        params.projectId,
      ]);

      queryClient.setQueryData<ProjectObject[]>(
        ["objects", params.projectId],
        (old) =>
          old?.map((obj) =>
            obj.id === objectId
              ? { ...obj, rank: rank ?? obj.rank, values: { ...obj.values, status } }
              : obj,
          ),
      );

      return { previousObjects };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousObjects) {
        queryClient.setQueryData(
          ["objects", params.projectId],
          context.previousObjects,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["objects", params.projectId],
      });
    },
  });

  // Filter objects
  const filteredObjects = useMemo(() => {
    let result = objectsData || [];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((obj) => {
        const title = obj.values.title?.toLowerCase() || "";
        const description = obj.values.description?.toLowerCase() || "";
        return title.includes(searchLower) || description.includes(searchLower);
      });
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter((obj) => obj.values.status === filters.status);
    }

    // Apply priority filter
    if (filters.priority) {
      result = result.filter((obj) => obj.values.priority === filters.priority);
    }

    // Apply assignee filter
    if (filters.assignee) {
      result = result.filter((obj) => obj.values.assignee === filters.assignee);
    }

    return result;
  }, [objectsData, filters]);

  // Keyboard navigation helpers
  const handleSelectNext = useCallback(() => {
    if (filteredObjects.length === 0) return;
    setSelectedCardIndex((prev) => {
      const next = prev + 1;
      if (next >= filteredObjects.length) return 0;
      return next;
    });
  }, [filteredObjects.length]);

  const handleSelectPrevious = useCallback(() => {
    if (filteredObjects.length === 0) return;
    setSelectedCardIndex((prev) => {
      if (prev <= 0) return filteredObjects.length - 1;
      return prev - 1;
    });
  }, [filteredObjects.length]);

  const handleOpenSelected = useCallback(() => {
    if (selectedCardIndex >= 0 && selectedCardIndex < filteredObjects.length) {
      setSelectedObjectId(filteredObjects[selectedCardIndex].id);
    }
  }, [selectedCardIndex, filteredObjects]);

  const handleSwitchView = useCallback(
    (index: number) => {
      if (index < project.views.length) {
        setActiveViewId(project.views[index].id);
        setSort({ field: "rank", direction: "asc" });
      }
    },
    [project.views],
  );

  // Get default status (first option of status field for first type)
  const getDefaultStatus = useCallback(() => {
    const firstType = project.types[0]?.id;
    if (firstType && project.options[firstType]?.status?.length > 0) {
      return project.options[firstType].status[0].id;
    }
    return undefined;
  }, [project.types, project.options]);

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDefaultStatus(getDefaultStatus());
    setCreateDialogOpen(true);
  }, [getDefaultStatus]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateNew: handleOpenCreateDialog,
    onSwitchView: handleSwitchView,
    onSelectNext: handleSelectNext,
    onSelectPrevious: handleSelectPrevious,
    onOpenSelected: handleOpenSelected,
    onEditSelected: handleOpenSelected,
    onClose: () => {
      if (selectedObjectId) {
        setSelectedObjectId(null);
      } else {
        setSelectedCardIndex(-1);
      }
    },
    onShowHelp: () => setShowShortcutsHelp(true),
    enabled: !createDialogOpen,
  });

  const handleCardClick = (object: ProjectObject) => {
    setSelectedObjectId(object.id);
  };

  const handleCreateClick = (statusId: string) => {
    setCreateDefaultStatus(statusId);
    setCreateDialogOpen(true);
  };

  const handleMoveObject = (objectId: string, newStatus: string, newRank?: number) => {
    moveMutation.mutate({ objectId, status: newStatus, rank: newRank });
  };

  const handleObjectCreated = () => {
    // Object created successfully, queries will be invalidated by the mutation
  };

  const handleViewChange = (viewId: string) => {
    setActiveViewId(viewId);
    // Reset sort when switching views
    setSort({ field: "rank", direction: "asc" });
  };

  return (
    <>
      <PageHeader
        title={project.project.name}
        icon={<FolderKanban className="size-4 md:size-5" />}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenCreateDialog}>
                <Plus className="size-4 mr-2" />
                New
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Search className="size-4 mr-2" />
                  Search
                  {filters.search && <span className="ml-2 text-xs text-muted-foreground">(active)</span>}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="p-2">
                    <Input
                      type="search"
                      placeholder="Search..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="h-8"
                      autoFocus
                    />
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {activeView?.viewtype === "list" ? (
                    <List className="size-4 mr-2" />
                  ) : (
                    <LayoutGrid className="size-4 mr-2" />
                  )}
                  View
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {project.views.map((view) => (
                    <DropdownMenuItem
                      key={view.id}
                      onClick={() => handleViewChange(view.id)}
                    >
                      {view.viewtype === "list" ? (
                        <List className="size-4 mr-2" />
                      ) : (
                        <LayoutGrid className="size-4 mr-2" />
                      )}
                      {view.name}
                      {activeViewId === view.id && <Check className="size-4 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Filter className="size-4 mr-2" />
                  Status
                  {filters.status && <span className="ml-2 text-xs text-muted-foreground">(active)</span>}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setFilters({ ...filters, status: "" })}>
                    All
                    {!filters.status && <Check className="size-4 ml-auto" />}
                  </DropdownMenuItem>
                  {statusOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => setFilters({ ...filters, status: option.id })}
                    >
                      <span
                        className="size-2 rounded-full mr-2"
                        style={{ backgroundColor: option.colour }}
                      />
                      {option.name}
                      {filters.status === option.id && <Check className="size-4 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Filter className="size-4 mr-2" />
                  Priority
                  {filters.priority && <span className="ml-2 text-xs text-muted-foreground">(active)</span>}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setFilters({ ...filters, priority: "" })}>
                    All
                    {!filters.priority && <Check className="size-4 ml-auto" />}
                  </DropdownMenuItem>
                  {priorityOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => setFilters({ ...filters, priority: option.id })}
                    >
                      <span
                        className="size-2 rounded-full mr-2"
                        style={{ backgroundColor: option.colour }}
                      />
                      {option.name}
                      {filters.priority === option.id && <Check className="size-4 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  to="/$projectId/design"
                  params={{ projectId: params.projectId }}
                >
                  <Settings2 className="size-4 mr-2" />
                  Design
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <Main fluid className="flex flex-col min-h-0 flex-1">
        {/* Filters */}
        <FilterBar
          project={project}
          filters={filters}
          onFilterChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          showSort={activeView?.viewtype === "list"}
        />

        {/* Content area */}
        <div className={activeView?.viewtype === "list" ? "flex-1 min-h-0 overflow-auto" : ""}>
          {activeView?.viewtype === "list" ? (
            <div className="p-4">
              <ListView
                project={project}
                objects={filteredObjects}
                sort={sort}
                onSortChange={setSort}
                onCardClick={handleCardClick}
              />
            </div>
          ) : (
            <div className="pl-2 pr-4 pt-1">
              <BoardContainer
                project={project}
                objects={filteredObjects}
                statusField="status"
                onCardClick={handleCardClick}
                onCreateClick={handleCreateClick}
                onMoveObject={handleMoveObject}
              />
            </div>
          )}
        </div>
      </Main>

      {/* Object detail dialog */}
      <ObjectDetailPanel
        projectId={params.projectId}
        objectId={selectedObjectId}
        project={project}
        onClose={() => setSelectedObjectId(null)}
      />

      <CreateObjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={params.projectId}
        project={project}
        templates={templates}
        defaultStatus={createDefaultStatus}
        onCreated={handleObjectCreated}
      />

      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </>
  );
}
