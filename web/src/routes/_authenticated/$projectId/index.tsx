// Mochi Projects: Project page with board and tree views
// Copyright Alistair Cunningham 2026

import { useState, useMemo, useCallback, useEffect } from "react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GeneralError,
  extractStatus,
  getErrorMessage,
  Main,
  PageHeader,
  usePageTitle,
  Button,
  IconButton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Switch,
  useSearch,
  useShellStorage,
  toast,
} from "@mochi/web";
import { Columns3, Ellipsis, FolderKanban, GripVertical, Plus, Settings, Settings2, SlidersHorizontal, X } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectField, ProjectObject, SortState } from "@/types";
import { canDesign, canWrite } from "@/lib/access";
import { BoardContainer } from "@/features/board/components";
import { TreeView } from "@/features/tree";
import { FilterBar, type FilterState } from "@/features/views";
import {
  CreateObjectDialog,
  ObjectDetailPanel,
} from "@/features/objects/components";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useProjectWebsocket } from "@/hooks/use-project-websocket";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { ViewOptionsBar } from "@/components/view-options-bar";
import { OptionDialog } from "@/features/editor/components/option-dialog";

interface SearchParams {
  view?: string;
}

export const Route = createFileRoute("/_authenticated/$projectId/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  loader: async ({ params }) => {
    try {
      const projectResponse = await projectsApi.get(params.projectId);
      return { project: projectResponse.data, loaderError: null };
    } catch (error) {
      const status = extractStatus(error);
      if (status === 403 || status === 404) {
        throw redirect({ to: "/" });
      }

      return {
        project: null as ProjectDetails | null,
        loaderError:
          getErrorMessage(error, "Failed to load project"),
      };
    }
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { project, loaderError } = Route.useLoaderData() as {
    project: ProjectDetails | null;
    loaderError: string | null;
  };
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();

  if (!project) {
    return (
      <>
        <PageHeader
          title="Project"
          icon={<FolderKanban className="size-4 md:size-5" />}
          back={{ label: "Back to projects", onFallback: () => navigate({ to: "/" }) }}
        />
        <Main>
          <GeneralError
            error={new Error(loaderError ?? "Failed to load project")}
            minimal
            mode="inline"
            reset={() => void router.invalidate()}
          />
        </Main>
      </>
    );
  }

  return (
    <ProjectPageContent
      project={project}
      projectId={params.projectId}
      search={search}
    />
  );
}

export interface ProjectPageContentProps {
  project: ProjectDetails;
  projectId: string;
  search: SearchParams;
  initialObjectId?: string;
}

export function ProjectPageContent({ project, projectId, search, initialObjectId }: ProjectPageContentProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const params = { projectId };
  const access = project.project.access;

  usePageTitle(project.project.name);
  useProjectWebsocket(project.project.fingerprint);

  // Disable global Ctrl+K search shortcut so we can use it for view options
  const { setShortcutEnabled } = useSearch();
  useEffect(() => {
    setShortcutEnabled(false);
    return () => setShortcutEnabled(true);
  }, [setShortcutEnabled]);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(initialObjectId ?? null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDefaultFields, setCreateDefaultFields] = useState<
    { field: string; value: string }[] | undefined
  >();
  const [createDefaultParent, setCreateDefaultParent] = useState<string | undefined>();
  const [createChildClasses, setCreateChildClasses] = useState<string[] | undefined>();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showViewOptions, setShowViewOptions] = useShellStorage("projects-view-options-expanded", true);
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [isReorderingColumns, setIsReorderingColumns] = useState(false);
  const [pendingColumnOrder, setPendingColumnOrder] = useState<string[] | null>(null);
  const [hintDismissed, setHintDismissed] = useShellStorage("projects-hint-dismissed", false);

  const dismissBoardHint = () => {
    setHintDismissed(true);
  };

  // View state - initialize from URL or first view
  const defaultViewId = project.views[0]?.id || "board";
  const initialViewId = search.view && project.views.some((v) => v.id === search.view)
    ? search.view
    : defaultViewId;
  const [activeViewId, setActiveViewId] = useState(initialViewId);
  const activeView =
    project.views.find((v) => v.id === activeViewId) || project.views[0];

  // Deduplicated field list across all classes (for sort dropdown)
  const allFields = useMemo(() => {
    const seen = new Set<string>();
    const result: ProjectField[] = [];
    for (const fields of Object.values(project.fields)) {
      for (const f of fields) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          result.push(f);
        }
      }
    }
    return result;
  }, [project.fields]);

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
    watched: false,
  });

  // Sort state for list view (default to rank/manual order)
  const [sort, setSort] = useState<SortState | null>({ field: "rank", direction: "asc" });

  const queryClient = useQueryClient();

  // Load objects
  const { data: objectListData } = useQuery({
    queryKey: ["objects", params.projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(params.projectId);
      return response.data;
    },
  });
  const objectsData = objectListData?.objects;
  const watchedIds = objectListData?.watched;

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

  // Check if an object is a descendant of a given ancestor
  const isDescendant = (obj: ProjectObject, ancestorId: string, allObjects: ProjectObject[]): boolean => {
    let current = obj.parent;
    while (current) {
      if (current === ancestorId) return true;
      const parent = allObjects.find((o) => o.id === current);
      current = parent?.parent || "";
    }
    return false;
  };

  // Move object mutation
  const moveMutation = useMutation({
    mutationFn: async ({
      objectId,
      field,
      value,
      rank,
      rowField: rf,
      rowValue,
      scopeParent,
      promote,
    }: {
      objectId: string;
      field: string;
      value: string;
      rank?: number;
      rowField?: string;
      rowValue?: string;
      scopeParent?: string;
      promote?: boolean;
    }) => {
      return projectsApi.moveObject(params.projectId, objectId, {
        field,
        value,
        rank,
        row_field: rf,
        row_value: rowValue,
        scope_parent: scopeParent,
        promote: promote ? "true" : undefined,
      });
    },
    onMutate: ({ objectId, field, value, rank, rowField: rf, rowValue, scopeParent, promote }) => {
      // Optimistically update the UI
      queryClient.cancelQueries({
        queryKey: ["objects", params.projectId],
      });

      const previousData = queryClient.getQueryData<{ objects: ProjectObject[]; watched?: string[] }>([
        "objects",
        params.projectId,
      ]);

      queryClient.setQueryData<{ objects: ProjectObject[]; watched?: string[] }>(
        ["objects", params.projectId],
        (old) => {
          if (!old) return old;

          // Sibling reorder: renumber siblings sequentially
          if (scopeParent && rank) {
            const siblings = old.objects
              .filter((o) => o.parent === scopeParent && o.id !== objectId)
              .sort((a, b) => (a.rank || 0) - (b.rank || 0));
            const movedObj = old.objects.find((o) => o.id === objectId);
            if (movedObj) {
              siblings.splice(rank - 1, 0, movedObj);
              const rankMap: Record<string, number> = {};
              siblings.forEach((s, i) => { rankMap[s.id] = i + 1; });
              return {
                ...old,
                objects: old.objects.map((obj) =>
                  rankMap[obj.id] !== undefined ? { ...obj, rank: rankMap[obj.id] } : obj,
                ),
              };
            }
          }

          // Renumber objects in scope to avoid rank ties (mirrors server logic)
          const oldVal = old.objects.find((o) => o.id === objectId)?.values[field] || "";
          const targetValue = value || oldVal;
          const inScope = old.objects
            .filter((o) => o.id !== objectId && (o.values[field] || "") === targetValue)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));
          const rankMap: Record<string, number> = {};
          if (rank) {
            let r = 1;
            for (const obj of inScope) {
              if (r === rank) r++;
              rankMap[obj.id] = r;
              r++;
            }
          }

          return {
            ...old,
            objects: old.objects.map((obj) => {
              if (obj.id === objectId) {
                const updatedValues = { ...obj.values, [field]: value };
                if (rf && rowValue !== undefined) {
                  updatedValues[rf] = rowValue;
                }
                return {
                  ...obj,
                  rank: rank ?? obj.rank,
                  values: updatedValues,
                  ...(promote ? { parent: "" } : {}),
                };
              }
              // Cascade status/row changes to descendants
              if (field && isDescendant(obj, objectId, old.objects)) {
                const updatedValues = { ...obj.values, [field]: value };
                if (rf && rowValue !== undefined) {
                  updatedValues[rf] = rowValue;
                }
                return { ...obj, rank: rankMap[obj.id] ?? obj.rank, values: updatedValues };
              }
              if (rankMap[obj.id] !== undefined) {
                return { ...obj, rank: rankMap[obj.id] };
              }
              return obj;
            }),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["objects", params.projectId],
          context.previousData,
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

      const previousData = queryClient.getQueryData<{ objects: ProjectObject[]; watched?: string[] }>([
        "objects",
        params.projectId,
      ]);

      queryClient.setQueryData<{ objects: ProjectObject[]; watched?: string[] }>(
        ["objects", params.projectId],
        (old) => {
          if (!old) return old;
          const newParent = parentId ? old.objects.find((o) => o.id === parentId) : null;
          const sf = activeView?.columns || "";
          const rf = activeView?.rows || "";
          return {
            ...old,
            objects: old.objects.map((obj) => {
              if (obj.id !== objectId) return obj;
              const updated = { ...obj, parent: parentId || "" };
              if (newParent && sf) {
                updated.values = { ...updated.values, [sf]: newParent.values[sf] || "" };
                if (rf) updated.values[rf] = newParent.values[rf] || "";
              }
              return updated;
            }),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["objects", params.projectId],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["objects", params.projectId],
      });
    },
  });

  // Delete column (option) mutation
  const deleteColumnMutation = useMutation({
    mutationFn: async ({
      classId,
      fieldId,
      optionId,
    }: {
      classId: string;
      fieldId: string;
      optionId: string;
    }) => {
      return projectsApi.deleteOption(params.projectId, classId, fieldId, optionId);
    },
    onSuccess: () => {
      router.invalidate();
    },
  });

  // Rename column (option) mutation
  const renameColumnMutation = useMutation({
    mutationFn: async ({
      classId,
      fieldId,
      optionId,
      name,
    }: {
      classId: string;
      fieldId: string;
      optionId: string;
      name: string;
    }) => {
      return projectsApi.updateOption(params.projectId, classId, fieldId, optionId, { name });
    },
    onSuccess: () => {
      router.invalidate();
    },
  });

  // Create column (option) mutation
  const createColumnMutation = useMutation({
    mutationFn: async ({
      classId,
      fieldId,
      name,
      colour,
    }: {
      classId: string;
      fieldId: string;
      name: string;
      colour: string;
    }) => {
      return projectsApi.createOption(params.projectId, classId, fieldId, { name, colour });
    },
    onSuccess: () => {
      router.invalidate();
    },
  });

  // Reorder columns (options) mutation
  const reorderColumnsMutation = useMutation({
    mutationFn: async ({
      classId,
      fieldId,
      order,
    }: {
      classId: string;
      fieldId: string;
      order: string[];
    }) => {
      return projectsApi.reorderOptions(params.projectId, classId, fieldId, order);
    },
    onSuccess: () => {
      router.invalidate();
      setIsReorderingColumns(false);
      setPendingColumnOrder(null);
    },
  });

  // Filter objects
  const filteredObjects = useMemo(() => {
    let result = objectsData || [];

    // Apply view's class filter (if view has specific classes selected)
    const viewClasses = activeView?.classes || [];
    if (viewClasses.length > 0) {
      result = result.filter((obj) => viewClasses.includes(obj.class));
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((obj) =>
        Object.values(obj.values).some(
          (v) => typeof v === "string" && v.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply watched filter
    if (filters.watched && watchedIds) {
      const watchedSet = new Set(watchedIds);
      result = result.filter((obj) => watchedSet.has(obj.id));
    }

    return result;
  }, [objectsData, watchedIds, filters, activeView?.classes]);

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

  // Get the column and row fields for the current view
  const columnField = activeView?.columns || "";
  const rowField = activeView?.rows || "";

  // Get default column value (first option of column field for the view's class)
  const viewClasses = activeView?.classes;
  const getDefaultColumnValue = useCallback(() => {
    const effectiveType = viewClasses && viewClasses.length > 0
      ? viewClasses[0]
      : project.classes[0]?.id;
    if (effectiveType && project.options[effectiveType]?.[columnField]?.length > 0) {
      return [{ field: columnField, value: project.options[effectiveType][columnField][0].id }];
    }
    return undefined;
  }, [project.classes, project.options, columnField, viewClasses]);

  const handleOpenCreateDialog = useCallback(() => {
    if (project.classes.length === 0) {
      toast.error("Please add one or more classes to the project design.");
      return;
    }
    setSelectedObjectId(null);
    setCreateDefaultFields(getDefaultColumnValue());
    setCreateDialogOpen(true);
  }, [project.classes.length, getDefaultColumnValue]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateNew: handleOpenCreateDialog,
    onFocusSearch: () => setShowViewOptions(!showViewOptions),
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

  const handleCreateClick = (columnValue: string, rowValue?: string) => {
    if (project.classes.length === 0) {
      toast.error("Please add one or more classes to the project design.");
      return;
    }
    const fields = [{ field: columnField, value: columnValue }];
    if (rowValue !== undefined && rowField) {
      fields.push({ field: rowField, value: rowValue });
    }
    setSelectedObjectId(null);
    setCreateDefaultFields(fields);
    setCreateDefaultParent(undefined);
    setCreateChildClasses(undefined);
    setCreateDialogOpen(true);
  };

  // Double-click on an object: create a child of that object
  const handleCreateChild = (parent: ProjectObject) => {
    setSelectedObjectId(null);
    // Find all classes that can be children of this object's class
    const childClasses = project.classes
      .filter((c) => (project.hierarchy[c.id] || []).includes(parent.class))
      .map((c) => c.id);
    if (childClasses.length === 0) return;
    // Pre-fill column fields from the parent's values
    const fields: { field: string; value: string }[] = [];
    if (columnField && parent.values[columnField]) {
      fields.push({ field: columnField, value: parent.values[columnField] });
    }
    setCreateDefaultFields(fields.length > 0 ? fields : undefined);
    setCreateDefaultParent(parent.id);
    setCreateChildClasses(childClasses);
    setCreateDialogOpen(true);
  };

  const handleMoveObject = (objectId: string, newValue: string, newRank?: number, newRow?: string, scopeParent?: string, promote?: boolean) => {
    moveMutation.mutate({
      objectId,
      field: newValue ? columnField : "",
      value: newValue,
      rank: newRank,
      rowField: newRow !== undefined ? rowField : undefined,
      rowValue: newRow,
      scopeParent,
      promote,
    });
  };

  const handleReparent = (objectId: string, newParentId: string | null) => {
    reparentMutation.mutate({ objectId, parentId: newParentId });
  };

  const handleReorder = (objectId: string, newRank: number) => {
    // Use move mutation with just rank (no field/value change)
    moveMutation.mutate({ objectId, field: "", value: "", rank: newRank });
  };

  const handleDeleteColumn = async (classId: string, fieldId: string, optionId: string) => {
    await deleteColumnMutation.mutateAsync({ classId, fieldId, optionId });
  };

  const handleRenameColumn = async (classId: string, fieldId: string, optionId: string, newName: string) => {
    await renameColumnMutation.mutateAsync({ classId, fieldId, optionId, name: newName });
  };

  const handleObjectCreated = () => {
    // Object created successfully, queries will be invalidated by the mutation
  };

  const handleViewChange = (viewId: string) => {
    setActiveViewId(viewId);
    // Reset sort when switching views
    setSort({ field: "rank", direction: "asc" });
  };

  const handleAddColumn = (name: string, colour: string) => {
    const defaultClass = project.classes[0];
    if (!defaultClass) return;
    createColumnMutation.mutate({
      classId: defaultClass.id,
      fieldId: columnField,
      name,
      colour,
    });
  };

  const handleReorderColumns = (order: string[]) => {
    setPendingColumnOrder(order);
  };

  const handleSaveColumnOrder = () => {
    const defaultClass = project.classes[0];
    if (!defaultClass || !pendingColumnOrder) return;
    reorderColumnsMutation.mutate({
      classId: defaultClass.id,
      fieldId: columnField,
      order: pendingColumnOrder,
    });
  };

  const handleCancelReorder = () => {
    setIsReorderingColumns(false);
    setPendingColumnOrder(null);
  };

  return (
    <>
      <PageHeader
        title={project.project.name}
        icon={<FolderKanban className="size-4 md:size-5" />}
        actions={
          <div className="flex items-center gap-2">
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
            />
            {canWrite(access) && (
              <IconButton
                variant='ghost'
                onClick={handleOpenCreateDialog}
                label='Create object'
              >
                <Plus className="size-4" />
              </IconButton>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton variant='ghost' label='Open page actions'>
                  <Ellipsis className="size-4" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                >
                  <SlidersHorizontal className="size-4 mr-2" />
                  View options
                  <Switch
                    className="ml-auto"
                    checked={showViewOptions}
                    onCheckedChange={setShowViewOptions}
                  />
                </DropdownMenuItem>
                {canDesign(access) && activeView?.viewtype !== "list" && (
                  <>
                    <DropdownMenuItem onClick={() => setAddColumnDialogOpen(true)}>
                      <Columns3 className="size-4 mr-2" />
                      Add column
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsReorderingColumns(true)}>
                      <GripVertical className="size-4 mr-2" />
                      Re-order columns
                    </DropdownMenuItem>
                  </>
                )}
                {canDesign(access) && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/$projectId/design"
                      params={{ projectId: params.projectId }}
                    >
                      <Settings2 className="size-4 mr-2" />
                      Design
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    to="/$projectId/settings"
                    params={{ projectId: params.projectId }}
                  >
                    <Settings className="size-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      {showViewOptions && (
        <ViewOptionsBar
          project={project}
          fields={allFields}
          filters={filters}
          onFilterChange={setFilters}
          activeViewId={activeViewId}
          onViewChange={handleViewChange}
          sort={sort}
          onSortChange={setSort}
          showSort
        />
      )}
      {isReorderingColumns && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
          <span className="text-sm text-muted-foreground">
            Drag columns to re-order them
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelReorder}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveColumnOrder}
              disabled={!pendingColumnOrder || reorderColumnsMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      )}
      {!hintDismissed && !isReorderingColumns && activeView?.viewtype !== "list" && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
          <span className="text-sm text-muted-foreground">
            Double click on a column to add content
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={dismissBoardHint}
            aria-label="Dismiss board hint"
            title="Dismiss board hint"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      <Main fluid className="flex flex-col min-h-0 min-w-0 flex-1 !p-0">
        {/* Content area */}
        <div className={activeView?.viewtype === "list" ? "flex-1 min-h-0 overflow-auto" : "flex-1 min-h-0 overflow-x-auto"}>
          {activeView?.viewtype === "list" ? (
            <div className="p-4">
              <TreeView
                project={project}
                projectId={params.projectId}
                objects={filteredObjects}
                peopleMap={peopleMap}
                viewFields={activeView?.fields}
                sort={sort}
                onCardClick={handleCardClick}
                onReparent={canWrite(access) ? handleReparent : undefined}
                onReorder={canWrite(access) ? handleReorder : undefined}
                onCreateClick={canWrite(access) ? handleOpenCreateDialog : undefined}
              />
            </div>
          ) : (
            <div className="px-4 w-fit min-w-full">
              <BoardContainer
                project={project}
                objects={filteredObjects}
                statusField={columnField}
                rowField={rowField}
                borderField={activeView?.border}
                viewFields={activeView?.fields}
                viewClasses={activeView?.classes}
                sort={sort}
                peopleMap={peopleMap}
                onCardClick={handleCardClick}
                onCardDoubleClick={canWrite(access) ? handleCreateChild : undefined}
                onCreateClick={canWrite(access) ? handleCreateClick : undefined}
                onMoveObject={canWrite(access) ? handleMoveObject : undefined}
                onReparentObject={canWrite(access) ? handleReparent : undefined}
                onRenameColumn={canDesign(access) ? handleRenameColumn : undefined}
                onDeleteColumn={canDesign(access) ? handleDeleteColumn : undefined}
                isReordering={isReorderingColumns}
                onReorderColumns={handleReorderColumns}
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
        access={access}
        onClose={() => {
          setSelectedObjectId(null);
          if (initialObjectId) {
            navigate({ to: '/$projectId', params: { projectId }, replace: true });
          }
        }}
      />

      {canWrite(access) && (
        <CreateObjectDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={params.projectId}
          project={project}
          defaultFields={createDefaultFields}
          defaultParent={createDefaultParent}
          allowedClasses={createChildClasses || (activeView?.classes?.length ? activeView.classes : undefined)}
          onCreated={handleObjectCreated}
        />
      )}

      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />

      <OptionDialog
        open={addColumnDialogOpen}
        onOpenChange={setAddColumnDialogOpen}
        onAdd={handleAddColumn}
        title="Add column"
      />
    </>
  );
}
