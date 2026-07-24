// Mochi Projects: Project page with board and tree views
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Trans, useLingui } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ConfirmDialog,
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
  DropdownMenuSeparator,
  Switch,
  useSearch,
  useShellStorage,
  toast,
  toastAction,
  shellClipboardWrite,
  shellSaveBlob,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  getAppPath,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  LoadingContent,
  arraysEqual,
} from "@mochi/web";
import { Check, Columns3, Copy, Ellipsis, FileDown, FolderKanban, GripVertical, Link as LinkIcon, LogOut, Plus, Settings, Settings2, SlidersHorizontal, X } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectField, ProjectObject, SortState } from "@/types";
import { canDesign, canCreate, canWrite } from "@/lib/access";
import { rankBetween, rankCompare } from "@/lib/rank";
import { useProjectsStore } from "@/stores/projects-store";
import { BoardContainer } from "@/features/board/components";
import { TreeView } from "@/features/tree";
import type { FilterState } from "@/features/views";
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
      return { project: projectResponse.data, loaderError: null, loaderStatus: null };
    } catch (error) {
      const status = extractStatus(error);
      if (status === 403) {
        return { project: null as ProjectDetails | null, loaderError: null, loaderStatus: 403 };
      }
      if (status === 404) {
        throw redirect({ to: "/" });
      }

      return {
        project: null as ProjectDetails | null,
        loaderError: getErrorMessage(error, t`Failed to load project`),
        loaderStatus: status,
      };
    }
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { t } = useLingui()
  const { project, loaderError, loaderStatus } = Route.useLoaderData() as {
    project: ProjectDetails | null;
    loaderError: string | null;
    loaderStatus: number | null;
  };
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (loaderStatus === 403) {
      toast.error(t`You don't have access to this project.`);
      void navigate({ to: "/" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loaderStatus === 403) return null;

  if (!project) {
    return (
      <>
        <PageHeader
          title={t`Project`}
          icon={<FolderKanban className="size-4 md:size-5" />}
          back={{ label: t`Back to projects`, onFallback: () => navigate({ to: "/" }) }}
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
  const { t } = useLingui()
  const router = useRouter();
  const navigate = useNavigate();
  const params = { projectId };
  const access = project.project.access;
  const isOwner = project.project.owner === 1;
  const refreshSidebar = useProjectsStore((state) => state.refresh);
  const [unsubscribeOpen, setUnsubscribeOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const openLinkDialog = useCallback(async () => {
    setShareLink("");
    setLinkCopied(false);
    setLinkOpen(true);
    try {
      const response = await projectsApi.share(project.project.id);
      setShareLink(response.data.link);
    } catch (error) {
      setLinkOpen(false);
      toast.error(getErrorMessage(error, t`Failed to create link`));
    }
  }, [project.project.id]);

  const copyShareLink = useCallback(async () => {
    if (!shareLink) return;
    const ok = await shellClipboardWrite(shareLink);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [shareLink]);

  const handleDataExport = useCallback(async () => {
    // Remote projects fetch attachment bytes over P2P in bounded server-side
    // rounds; warm until nothing remains so a large project's export doesn't
    // time out. Each round covers up to a minute of fetching.
    const warming = toast.loading(t`Loading…`);
    try {
      for (let round = 0; round < 120; round++) {
        const warm = await projectsApi.warmExport(project.project.id);
        if (!warm.data || warm.data.remaining === 0) break;
      }
      const response = await projectsApi.exportData(project.project.id);
      const json = JSON.stringify(response.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const today = new Date().toISOString().split("T")[0];
      const slug = project.project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const filename = `${slug}-projects-backup-${today}.json`;
      // A bare anchor-click save silently no-ops in the shell's sandboxed
      // iframe; shellSaveBlob hands the blob to the parent shell to save.
      if (await shellSaveBlob(blob, filename)) {
        toast.success(t`Downloaded ${filename}`);
      } else {
        toast.error(t`Failed to export data`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to export data`));
    } finally {
      toast.dismiss(warming);
    }
  }, [project.project.id, project.project.name, t]);

  usePageTitle(project.project.name);
  // onSync re-runs the route loader (where the project, schema, and `populated`
  // flag live) when a sync batch lands, flipping the board out of its loading
  // state once the freshly-subscribed data has arrived.
  useProjectWebsocket(project.project.fingerprint, () => void router.invalidate());

  // Fallback for the websocket race: if project/update is missed (fired before
  // the socket connected), poll the loader while the project is still filling so
  // the board never stays stuck on the loading spinner.
  const populated = project.project.populated;
  useEffect(() => {
    if (populated) return;
    const timer = setInterval(() => void router.invalidate(), 3000);
    return () => clearInterval(timer);
  }, [populated, router]);

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

  // Sync view and selected object to URL for bookmarkability.
  // Suppress @tanstack/history's subscriber notification around the call,
  // because otherwise the router matches the /$projectId/$objectId route
  // and triggers a full unmount/remount (making the sheet animate twice).
  // We still go through window.history.replaceState so the shell's URL-sync
  // monkey-patch (shell-bridge.ts) runs and updates the shell URL bar.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const appPath = getAppPath() || '';
    const path = selectedObjectId
      ? `${appPath}/${projectId}/${selectedObjectId}`
      : `${appPath}/${projectId}`;
    const viewParam = activeViewId !== defaultViewId ? `?view=${activeViewId}` : '';
    const routerHistory = router.history as unknown as { _ignoreSubscribers?: boolean };
    routerHistory._ignoreSubscribers = true;
    try {
      window.history.replaceState(null, '', `${path}${viewParam}`);
    } finally {
      routerHistory._ignoreSubscribers = false;
    }
  }, [selectedObjectId, activeViewId, defaultViewId, projectId, router]);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    watched: false,
  });

  // Sort state for list view (default to rank/manual order)
  const [sort, setSort] = useState<SortState | null>({ field: "rank", direction: "asc" });

  const queryClient = useQueryClient();

  // Load objects
  const { data: objectListData, isLoading: objectsLoading } = useQuery({
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

          // Compute the moved object's new fractional key between the neighbours
          // at the 1-based target position (#53): one key change, matching the
          // server — no whole-scope renumber. scopeParent may be "" (top-level),
          // so test for presence, not truthiness.
          let newRank: string | undefined;
          if (rank) {
            let others: ProjectObject[];
            if (scopeParent !== undefined) {
              others = old.objects.filter((o) => o.parent === scopeParent && o.id !== objectId);
            } else {
              const oldVal = old.objects.find((o) => o.id === objectId)?.values[field] || "";
              const targetValue = value || oldVal;
              others = old.objects.filter((o) => o.id !== objectId && (o.values[field] || "") === targetValue);
            }
            others.sort((a, b) => rankCompare(a.rank, b.rank));
            let pos = rank;
            if (pos < 1) pos = 1;
            if (pos > others.length + 1) pos = others.length + 1;
            const before = pos >= 2 ? others[pos - 2].rank : null;
            const after = pos - 1 < others.length ? others[pos - 1].rank : null;
            newRank = rankBetween(before, after);
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
                  rank: newRank ?? obj.rank,
                  values: updatedValues,
                  ...(promote ? { parent: "" } : {}),
                };
              }
              // Cascade status/row changes to descendants (rank unchanged).
              if (field && isDescendant(obj, objectId, old.objects)) {
                const updatedValues = { ...obj.values, [field]: value };
                if (rf && rowValue !== undefined) {
                  updatedValues[rf] = rowValue;
                }
                return { ...obj, values: updatedValues };
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

  const unsubscribeMutation = useMutation({
    mutationFn: () => projectsApi.unsubscribe(project.project.id),
    onSuccess: () => {
      void refreshSidebar();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const handleUnsubscribe = async () => {
    try {
      await toastAction(unsubscribeMutation.mutateAsync(), {
        loading: t`Unsubscribing...`,
        success: t`Unsubscribed`,
        error: (e) => getErrorMessage(e, t`Failed to unsubscribe`),
      });
      setUnsubscribeOpen(false);
      void navigate({ to: "/" });
    } catch {
      // toast already shown
    }
  };

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
  const boardClass = useMemo(() => {
    if (viewClasses?.length) {
      return project.classes.find((c) => c.id === viewClasses[0]) ?? project.classes[0];
    }
    return project.classes[0];
  }, [project.classes, viewClasses]);

  const getDefaultColumnValue = useCallback(() => {
    const effectiveType = boardClass?.id;
    if (effectiveType && project.options[effectiveType]?.[columnField]?.length > 0) {
      return [{ field: columnField, value: project.options[effectiveType][columnField][0].id }];
    }
    return undefined;
  }, [boardClass, project.options, columnField]);

  const baselineColumnOrder = useMemo(() => {
    const effectiveType = boardClass?.id;
    if (!effectiveType || !columnField) return [];
    return project.options[effectiveType]?.[columnField]?.map((o) => o.id) ?? [];
  }, [boardClass, project.options, columnField]);

  const handleOpenCreateDialog = useCallback(() => {
    if (project.classes.length === 0) {
      toast.error(t`Please add one or more classes to the project design.`);
      return;
    }
    setSelectedObjectId(null);
    setCreateDefaultFields(getDefaultColumnValue());
    setCreateDialogOpen(true);
  }, [project.classes.length, getDefaultColumnValue, t]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateNew: canCreate(access) ? handleOpenCreateDialog : undefined,
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
      toast.error(t`Please add one or more classes to the project design.`);
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

  const handleListMoveObject = useCallback(
    (objectId: string, statusFieldId: string, newStatus: string, newRank?: number) => {
      moveMutation.mutate({
        objectId,
        field: statusFieldId,
        value: newStatus,
        rank: newRank,
      });
    },
    [moveMutation],
  );

  const handleReparent = (objectId: string, newParentId: string | null) => {
    reparentMutation.mutate({ objectId, parentId: newParentId });
  };

  const handleReorder = (objectId: string, position: number) => {
    // Reorder within the object's own parent: the move handler treats `rank` as
    // a 1-based position and renumbers the siblings of `scopeParent` around it.
    // Scope to the parent (which may be "" for top-level) so only its children
    // are renumbered, not every object in the project.
    const parent = objectsData?.find((o) => o.id === objectId)?.parent ?? "";
    moveMutation.mutate({ objectId, field: "", value: "", rank: position, scopeParent: parent });
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
    if (!boardClass) return;
    createColumnMutation.mutate({
      classId: boardClass.id,
      fieldId: columnField,
      name,
      colour,
    });
  };

  const handleReorderColumns = (order: string[]) => {
    setPendingColumnOrder(order);
  };

  const handleSaveColumnOrder = () => {
    if (!boardClass || !pendingColumnOrder) return;
    if (arraysEqual(pendingColumnOrder, baselineColumnOrder)) {
      handleCancelReorder();
      return;
    }
    reorderColumnsMutation.mutate({
      classId: boardClass.id,
      fieldId: columnField,
      order: pendingColumnOrder,
    });
  };

  const handleCancelReorder = () => {
    setIsReorderingColumns(false);
    setPendingColumnOrder(null);
  };

  const primaryActionLabel = (() => {
    const viewClasses = activeView?.classes || [];
    if (viewClasses.length === 1) {
      const cls = project.classes.find((c) => c.id === viewClasses[0]);
      if (cls) {
        const className = cls.name.toLowerCase();
        return t`New ${className}`;
      }
    }
    return t`New`;
  })();

  return (
    <>
      <PageHeader
        title={project.project.name}
        icon={<FolderKanban className="size-4 md:size-5" />}
        showSidebarTrigger
        primaryAction={
          canCreate(access) ? (
            <Button
              variant='outline'
              size='sm'
              className='px-2.5'
              onClick={handleOpenCreateDialog}
            >
              <Plus className="size-4" />
              <span className='md:hidden'><Trans>New</Trans></span>
              <span className='hidden md:inline'>{primaryActionLabel}</span>
            </Button>
          ) : undefined
        }
        menuAction={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton variant='ghost' label={t`Open page actions`}>
                <Ellipsis className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
              >
                <SlidersHorizontal className="size-4 me-2" />
                <Trans>View options</Trans>
                <Switch
                  className="ms-auto"
                  checked={showViewOptions}
                  onCheckedChange={setShowViewOptions}
                />
              </DropdownMenuItem>
              {canDesign(access) && activeView?.viewtype !== "list" && (
                <>
                  <DropdownMenuItem onClick={() => setAddColumnDialogOpen(true)}>
                    <Columns3 className="size-4 me-2" />
                    <Trans>Add column</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsReorderingColumns(true)}>
                    <GripVertical className="size-4 me-2" />
                    <Trans>Re-order columns</Trans>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDataExport}>
                <FileDown className="size-4 me-2" />
                <Trans>Export data</Trans>
              </DropdownMenuItem>
              {/* Canonical menu tail: Link, Design, Settings, Unsubscribe. */}
              {isOwner && (
                <DropdownMenuItem onClick={() => void openLinkDialog()}>
                  <LinkIcon className="size-4 me-2" />
                  <Trans>Link</Trans>
                </DropdownMenuItem>
              )}
              {canDesign(access) && (
                <DropdownMenuItem asChild>
                  <Link
                    to="/$projectId/design"
                    params={{ projectId: params.projectId }}
                  >
                    <Settings2 className="size-4 me-2" />
                    <Trans>Design</Trans>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link
                  to="/$projectId/settings"
                  params={{ projectId: params.projectId }}
                >
                  <Settings className="size-4 me-2" />
                  <Trans>Settings</Trans>
                </Link>
              </DropdownMenuItem>
              {!isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setUnsubscribeOpen(true)}>
                    <LogOut className="size-4 me-2" />
                    <Trans>Unsubscribe</Trans>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Trans>Drag columns to re-order them</Trans>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelReorder}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              size="sm"
              onClick={handleSaveColumnOrder}
              disabled={
                !pendingColumnOrder ||
                reorderColumnsMutation.isPending ||
                arraysEqual(pendingColumnOrder, baselineColumnOrder)
              }
            >
              <Check className="size-4" />
              <Trans>Save</Trans>
            </Button>
          </div>
        </div>
      )}
      {!hintDismissed && !isReorderingColumns && activeView?.viewtype !== "list" && canCreate(access) && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
          <span className="text-sm text-muted-foreground">
            <Trans>Double click on a column to add content</Trans>
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={dismissBoardHint}
                aria-label={t`Dismiss board hint`}
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t`Dismiss board hint`}</TooltipContent>
          </Tooltip>
        </div>
      )}
      <Main fluid className="flex flex-col min-h-0 min-w-0 flex-1 !p-0">
        {/* Content area */}
        <div className={activeView?.viewtype === "list" ? "flex-1 min-h-0 overflow-auto" : "flex-1 min-h-0 overflow-x-auto"}>
          {!populated || objectsLoading ? (
            <LoadingContent />
          ) : activeView?.viewtype === "list" ? (
            <div className="p-4">
              <TreeView
                project={project}
                projectId={params.projectId}
                objects={filteredObjects}
                peopleMap={peopleMap}
                viewFields={activeView?.fields}
                viewClasses={activeView?.classes}
                statusField={activeView?.columns}
                borderField={activeView?.border}
                sort={sort}
                onCardClick={handleCardClick}
                onReparent={canWrite(access) ? handleReparent : undefined}
                onReorder={canWrite(access) ? handleReorder : undefined}
                onMoveObject={canWrite(access) ? handleListMoveObject : undefined}
                selectedObjectId={selectedObjectId}
                onCreateClick={canCreate(access) ? handleOpenCreateDialog : undefined}
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
                onCardDoubleClick={canCreate(access) ? handleCreateChild : undefined}
                onCreateClick={canCreate(access) ? handleCreateClick : undefined}
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
        onClose={() => setSelectedObjectId(null)}
      />

      {canCreate(access) && (
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
        title={t`Add column`}
      />
      <ResponsiveDialog open={linkOpen} onOpenChange={setLinkOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle><Trans>Project link</Trans></ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="bg-muted flex items-center gap-2 rounded-md p-3 font-mono text-sm">
            <code className="flex-1 break-all">{shareLink || '…'}</code>
            <Button variant="ghost" size="sm" onClick={() => void copyShareLink()} disabled={!shareLink} className="shrink-0">
              {linkCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>


      <ConfirmDialog
        open={unsubscribeOpen}
        onOpenChange={setUnsubscribeOpen}
        title={t`Unsubscribe from project?`}
        desc={t`This will remove "${project.project.name}" from your sidebar and stop updates for this project.`}
        confirmText={t`Unsubscribe`}
        handleConfirm={() => void handleUnsubscribe()}
        isLoading={unsubscribeMutation.isPending}
      />
    </>
  );
}
