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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useSearch,
} from "@mochi/common";
import { ChevronDown, ChevronUp, Ellipsis, FolderKanban, Plus, Settings2 } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectObject } from "@/types";
import { BoardContainer } from "@/features/board/components";
import { TreeView } from "@/features/tree";
import { FilterBar, type FilterState } from "@/features/views";
import type { SortState } from "@/features/list";
import {
  CreateObjectDialog,
  ObjectDetailPanel,
} from "@/features/objects/components";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { ViewOptionsBar } from "@/components/view-options-bar";

interface SearchParams {
  view?: string;
}

export const Route = createFileRoute("/_authenticated/$projectId/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  loader: async ({ params }) => {
    const projectResponse = await projectsApi.get(params.projectId);
    return { project: projectResponse.data };
  },
  component: ProjectPage,
  errorComponent: ({ error }) => <GeneralError error={error} />,
});

function ProjectPage() {
  const { project } = Route.useLoaderData() as {
    project: ProjectDetails;
  };
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  usePageTitle(project.project.name);

  // Disable global Ctrl+K search shortcut so we can use it for view options
  const { setShortcutEnabled } = useSearch();
  useEffect(() => {
    setShortcutEnabled(false);
    return () => setShortcutEnabled(true);
  }, [setShortcutEnabled]);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaultField, setCreateDefaultField] = useState<{
    field: string;
    value: string;
  } | undefined>();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(() => {
    const saved = localStorage.getItem("projects-view-options-expanded");
    return saved === "true";
  });
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);

  // Persist view options bar state
  useEffect(() => {
    localStorage.setItem("projects-view-options-expanded", String(showViewOptions));
  }, [showViewOptions]);

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
    owner: "",
  });

  // Sort state for list view (default to rank/manual order)
  const [sort, setSort] = useState<SortState | null>({ field: "rank", direction: "asc" });

  const queryClient = useQueryClient();

  // Load objects
  const { data: objectsData } = useQuery({
    queryKey: ["objects", params.projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(params.projectId);
      return response.data.objects;
    },
  });

  // Load people for resolving user field values to names
  const { data: peopleData } = useQuery({
    queryKey: ["people", params.projectId],
    queryFn: async () => {
      const response = await projectsApi.listPeople(params.projectId);
      return response.data.people;
    },
  });

  // Create a map of user ID to name for quick lookups
  const peopleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const person of peopleData || []) {
      map[person.id] = person.name;
    }
    return map;
  }, [peopleData]);

  // Move object mutation
  const moveMutation = useMutation({
    mutationFn: async ({
      objectId,
      field,
      value,
      rank,
    }: {
      objectId: string;
      field: string;
      value: string;
      rank?: number;
    }) => {
      return projectsApi.moveObject(params.projectId, objectId, { field, value, rank });
    },
    onMutate: async ({ objectId, field, value, rank }) => {
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
              ? { ...obj, rank: rank ?? obj.rank, values: { ...obj.values, [field]: value } }
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

  // Reparent object mutation
  const reparentMutation = useMutation({
    mutationFn: async ({
      objectId,
      parentId,
    }: {
      objectId: string;
      parentId: string | null;
    }) => {
      return projectsApi.updateObject(params.projectId, objectId, {
        parent: parentId || "",
      });
    },
    onMutate: async ({ objectId, parentId }) => {
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
              ? { ...obj, parent: parentId || "" }
              : obj,
          ),
      );

      return { previousObjects };
    },
    onError: (_err, _variables, context) => {
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

    // Apply view's type filter (if view has specific types selected)
    const viewTypes = activeView?.types || [];
    if (viewTypes.length > 0) {
      result = result.filter((obj) => viewTypes.includes(obj.type));
    }

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

    // Apply owner filter
    if (filters.owner) {
      result = result.filter((obj) => obj.values.owner === filters.owner);
    }

    return result;
  }, [objectsData, filters, activeView?.types]);

  // Keyboard navigation helpers
  const handleSelectNext = useCallback(() => {
    if (filteredObjects.length === 0) return;
    const currentIndex = selectedObjectId
      ? filteredObjects.findIndex((obj) => obj.id === selectedObjectId)
      : selectedCardIndex;
    const nextIndex = currentIndex + 1 >= filteredObjects.length ? 0 : currentIndex + 1;
    setSelectedCardIndex(nextIndex);
    if (selectedObjectId) {
      setSelectedObjectId(filteredObjects[nextIndex].id);
    }
  }, [filteredObjects, selectedCardIndex, selectedObjectId]);

  const handleSelectPrevious = useCallback(() => {
    if (filteredObjects.length === 0) return;
    const currentIndex = selectedObjectId
      ? filteredObjects.findIndex((obj) => obj.id === selectedObjectId)
      : selectedCardIndex;
    const prevIndex = currentIndex <= 0 ? filteredObjects.length - 1 : currentIndex - 1;
    setSelectedCardIndex(prevIndex);
    if (selectedObjectId) {
      setSelectedObjectId(filteredObjects[prevIndex].id);
    }
  }, [filteredObjects, selectedCardIndex, selectedObjectId]);

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

  // Get the column field for the current view
  const columnField = activeView?.columns || "status";

  // Get default column value (first option of column field for first type)
  const getDefaultColumnValue = useCallback(() => {
    const firstType = project.types[0]?.id;
    if (firstType && project.options[firstType]?.[columnField]?.length > 0) {
      return {
        field: columnField,
        value: project.options[firstType][columnField][0].id,
      };
    }
    return undefined;
  }, [project.types, project.options, columnField]);

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDefaultField(getDefaultColumnValue());
    setCreateDialogOpen(true);
  }, [getDefaultColumnValue]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateNew: handleOpenCreateDialog,
    onFocusSearch: () => setShowViewOptions((prev) => !prev),
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

  const handleCreateClick = (columnValue: string) => {
    setCreateDefaultField({ field: columnField, value: columnValue });
    setCreateDialogOpen(true);
  };

  const handleMoveObject = (objectId: string, newValue: string, newRank?: number) => {
    moveMutation.mutate({ objectId, field: columnField, value: newValue, rank: newRank });
  };

  const handleReparent = (objectId: string, newParentId: string | null) => {
    reparentMutation.mutate({ objectId, parentId: newParentId });
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
          <div className="flex items-center gap-2">
            <FilterBar
              project={project}
              filters={filters}
              onFilterChange={setFilters}
            />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenCreateDialog}
                title="New (n)"
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowViewOptions(!showViewOptions)}
                title={`View options (${navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+K)`}
              >
                {showViewOptions ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronUp className="size-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
            </div>
          </div>
        }
      />
      {showViewOptions && (
        <ViewOptionsBar
          project={project}
          filters={filters}
          onFilterChange={setFilters}
          activeViewId={activeViewId}
          onViewChange={handleViewChange}
          sort={sort}
          onSortChange={setSort}
          showSort={activeView?.viewtype === "tree"}
        />
      )}
      <Main fluid className="flex flex-col min-h-0 flex-1 !py-0">
        {/* Content area */}
        <div className={activeView?.viewtype === "tree" ? "flex-1 min-h-0 overflow-auto" : ""}>
          {activeView?.viewtype === "tree" ? (
            <div className="p-4">
              <TreeView
                project={project}
                projectId={params.projectId}
                objects={filteredObjects}
                peopleMap={peopleMap}
                onCardClick={handleCardClick}
                onReparent={handleReparent}
              />
            </div>
          ) : (
            <div className="pl-2 pr-4">
              <BoardContainer
                project={project}
                objects={filteredObjects}
                statusField={columnField}
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
        defaultField={createDefaultField}
        onCreated={handleObjectCreated}
      />

      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </>
  );
}
