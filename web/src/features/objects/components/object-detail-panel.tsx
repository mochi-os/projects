// Mochi Projects: Object detail dialog component
// Copyright Alistair Cunningham 2026

import { useState, useEffect, useRef, useMemo } from "react";
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  Activity,
  Settings2,
  GitMerge,
} from "lucide-react";
import {
  Button,
  cn,
  ConfirmDialog,
  GeneralError,
  ListSkeleton,
  naturalCompare,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useShellOverlay,
} from "@mochi/web";
import projectsApi from "@/api/projects";
import type { ProjectAccess, ProjectDetails } from "@/types";
import { canWrite, canComment } from "@/lib/access";
import { FieldEditor } from "./field-editor";
import { CommentList } from "./comment-list";
import { ActivityList } from "./activity-list";
import { RequestPanel } from "@/features/requests";
import { ObjectAttachments } from "./object-attachments";
import { ObjectLinks } from "./object-links";

interface ObjectDetailPanelProps {
  projectId: string;
  objectId: string | null;
  project: ProjectDetails;
  access: ProjectAccess;
  onClose: () => void;
}

type Tab = "properties" | "requests" | "comments" | "activity";

export function ObjectDetailPanel({
  projectId,
  objectId,
  project,
  access,
  onClose,
}: ObjectDetailPanelProps) {
  useShellOverlay(!!objectId);
  const [activeTab, setActiveTab] = useState<Tab>("properties");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  );
  const queryClient = useQueryClient();

  // Track validation errors from fields
  const handleValidationError = (fieldId: string, hasError: boolean) => {
    setValidationErrors((prev) => {
      const next = new Set(prev);
      if (hasError) {
        next.add(fieldId);
      } else {
        next.delete(fieldId);
      }
      return next;
    });
  };

  // Try to close, but prevent if there are validation errors
  const handleClose = () => {
    if (validationErrors.size > 0) {
      // Don't close - there are validation errors
      return;
    }
    onClose();
  };

  const { data, isPlaceholderData, isLoading, error, refetch } = useQuery({
    queryKey: ["object", projectId, objectId],
    queryFn: async () => {
      if (!objectId) throw new Error("No object ID");
      const response = await projectsApi.getObject(projectId, objectId);
      return response.data;
    },
    enabled: !!objectId,
    // Use cached objects list as placeholder so the panel renders immediately
    placeholderData: () => {
      const cached = queryClient.getQueryData<{
        objects: Array<{
          id: string;
          project: string;
          class: string;
          number: number;
          parent: string;
          rank: number;
          created: number;
          updated: number;
          values: Record<string, string>;
        }>;
        watched?: string[];
      }>(["objects", projectId]);
      if (!cached || !objectId) return undefined;
      const obj = cached.objects.find((o) => o.id === objectId);
      if (!obj) return undefined;
      return {
        object: { ...obj, readable: `${project.project.prefix}-${obj.number}` },
        values: obj.values,
        outgoing: [],
        incoming: [],
        watching: cached.watched?.includes(objectId) ?? false,
        requests: [],
        comment_count: 0,
      };
    },
  });

  // When opening a different object, default to comments tab if it has comments
  const tabInitializedFor = useRef<string | null>(null);
  useEffect(() => {
    if (objectId !== tabInitializedFor.current && data && !isPlaceholderData) {
      tabInitializedFor.current = objectId;
      setActiveTab(data.comment_count > 0 ? "comments" : "properties");
    }
  }, [objectId, data, isPlaceholderData]);

  // Fetch project members for the owner picker
  const { data: peopleData } = useQuery({
    queryKey: ["people", projectId],
    queryFn: async () => {
      const response = await projectsApi.listPeople(projectId);
      return response.data.people;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch all objects for parent picker (shares cache with project page)
  const { data: objectListData } = useQuery({
    queryKey: ["objects", projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(projectId);
      return response.data;
    },
  });
  const objectsData = objectListData?.objects;

  const updateValueMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      if (!objectId) return;
      await projectsApi.setValue(projectId, objectId, field, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["object", projectId, objectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["objects", projectId],
      });
    },
  });

  const watchMutation = useMutation({
    mutationFn: async (watching: boolean) => {
      if (!objectId) return;
      if (watching) {
        return projectsApi.removeWatcher(projectId, objectId);
      } else {
        return projectsApi.addWatcher(projectId, objectId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["object", projectId, objectId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!objectId) return;
      return projectsApi.deleteObject(projectId, objectId);
    },
    onSuccess: () => {
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({
        queryKey: ["objects", projectId],
      });
      requestAnimationFrame(() => onClose());
    },
  });

  const updateParentMutation = useMutation({
    mutationFn: async (newParent: string) => {
      if (!objectId) return;
      return projectsApi.updateObject(projectId, objectId, {
        parent: newParent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["object", projectId, objectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["objects", projectId],
      });
    },
  });

  // Get valid parent options based on hierarchy rules - must be before early returns
  const validParentOptions = useMemo(() => {
    if (!objectsData || !data) return [];

    const object = data.object;
    // Get allowed parent types for this object type
    const allowedParentClasses = project.hierarchy[object.class] || [];
    const parentClassIds = allowedParentClasses.filter((t) => t !== "");

    if (parentClassIds.length === 0) return [];

    // Filter objects to those matching allowed parent types
    // Also exclude this object and its descendants
    const descendants = new Set<string>();
    const findDescendants = (id: string) => {
      descendants.add(id);
      for (const obj of objectsData) {
        if (obj.parent === id && !descendants.has(obj.id)) {
          findDescendants(obj.id);
        }
      }
    };
    findDescendants(object.id);

    const title = (obj: {
      class: string;
      number: number;
      values: Record<string, string>;
    }) => {
      const cls = project.classes.find((c) => c.id === obj.class);
      return (
        (cls?.title ? obj.values[cls.title] : "") ||
        `${project.project.prefix}-${obj.number}`
      );
    };
    return objectsData
      .filter(
        (obj) => parentClassIds.includes(obj.class) && !descendants.has(obj.id),
      )
      .sort((a, b) => naturalCompare(title(a), title(b)));
  }, [
    objectsData,
    data,
    project.classes,
    project.hierarchy,
    project.project.prefix,
  ]);

  // Get current parent object info - must be before early returns
  const currentParent = useMemo(() => {
    if (!data?.object.parent || !objectsData) return null;
    return objectsData.find((obj) => obj.id === data.object.parent);
  }, [data, objectsData]);

  if (!objectId) {
    return null;
  }

  if (isLoading) {
    return (
      <Sheet open={true} onOpenChange={handleClose}>
        <SheetContent
          className="w-full sm:max-w-2xl p-0 gap-0"
          onInteractOutside={() => {}}
        >
          <SheetHeader className="sr-only">
            <SheetTitle><Trans>Loading item</Trans></SheetTitle>
            <SheetDescription><Trans>Loading item details</Trans></SheetDescription>
          </SheetHeader>
          <div className="p-6">
            <ListSkeleton variant="simple" height="h-12" count={3} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error || !data) {
    return (
      <Sheet open={true} onOpenChange={handleClose}>
        <SheetContent
          className="w-full sm:max-w-2xl p-6"
          onInteractOutside={() => {}}
        >
          <SheetHeader className="sr-only">
            <SheetTitle><Trans>Error</Trans></SheetTitle>
            <SheetDescription><Trans>Failed to load item</Trans></SheetDescription>
          </SheetHeader>
          <GeneralError
            error={error ?? new Error("Failed to load object")}
            minimal
            mode="inline"
            reset={() => {
              void refetch();
            }}
          />
        </SheetContent>
      </Sheet>
    );
  }

  const object = data.object;
  const classFields = project.fields[object.class] || [];
  const classOptions = project.options[object.class] || {};
  const cls = project.classes.find((c) => c.id === object.class);
  const titleField = cls?.title
    ? classFields.find((f) => f.id === cls.title)
    : undefined;
  const title =
    (titleField ? data.values[titleField.id] : "") || object.readable;
  const hasRequests = cls?.requests?.includes("merge") ?? false;

  // Get display title for any object using its class's title field
  const objectTitle = (obj: {
    class: string;
    number: number;
    values: Record<string, string>;
  }) => {
    const objCls = project.classes.find((c) => c.id === obj.class);
    return (
      (objCls?.title ? obj.values[objCls.title] : "") ||
      `${project.project.prefix}-${obj.number}`
    );
  };
  const requestCount = data.requests?.length || 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "properties",
      label: t`Properties`,
      icon: <Settings2 className="size-4" />,
    },
    ...(hasRequests
      ? [
          {
            id: "requests" as Tab,
            label: t`Merge requests (${requestCount})`,
            icon: <GitMerge className="size-4" />,
          },
        ]
      : []),
    {
      id: "comments",
      label: t`Comments (${data.comment_count || 0})`,
      icon: <MessageSquare className="size-4" />,
    },
    {
      id: "activity",
      label: t`Activity`,
      icon: <Activity className="size-4" />,
    },
  ];

  const handleFieldChange = (fieldId: string, value: string) => {
    updateValueMutation.mutate({ field: fieldId, value });
  };

  return (
    <Sheet open={true} onOpenChange={handleClose}>
      <SheetContent
        className="w-full sm:max-w-3xl p-0 gap-0 [&>button:last-child]:hidden"
        onInteractOutside={() => {}}
      >
        <SheetHeader className="sr-only">
          <SheetTitle><Trans>Item details</Trans></SheetTitle>
          <SheetDescription><Trans>View and edit item details</Trans></SheetDescription>
        </SheetHeader>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
          <div className="flex flex-col md:flex-row gap-0.5 md:gap-2 flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight line-clamp-2 md:truncate min-w-0">
              {title}
            </h2>
            <span className="hidden md:block">·</span>
            <span className="text-xs md:text-sm md:pt-1 text-muted-foreground truncate">
              {object.readable}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => watchMutation.mutate(data.watching)}
              disabled={watchMutation.isPending}
              title={data.watching ? t`Stop watching` : t`Watch`}
            >
              {data.watching ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </Button>
            {canWrite(access) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setShowDeleteDialog(true)}
                title={t`Delete item`}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleClose}
            >
              <Trans>Done</Trans>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b shrink-0">
          <div className="flex gap-1 px-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="max-w-2xl space-y-6"
            hidden={activeTab !== "properties"}
          >
            {/* Title */}
            {titleField && (
              <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                <label className="text-sm font-medium text-muted-foreground pt-2">
                  {titleField.name}
                </label>
                <FieldEditor
                  field={titleField}
                  value={data.values[titleField.id] || ""}
                  options={classOptions[titleField.id] || []}
                  onChange={(value) => handleFieldChange(titleField.id, value)}
                  readOnly={!canWrite(access)}
                  hideLabel
                  localPeople={peopleData}
                  onValidationError={(hasError) =>
                    handleValidationError(titleField.id, hasError)
                  }
                />
              </div>
            )}

            {/* Parent */}
            {(validParentOptions.length > 0 || currentParent) && (
              <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                <label className="text-sm font-medium text-muted-foreground pt-2">
                  <Trans>Parent</Trans>
                </label>
                {!canWrite(access) ? (
                  <span className="text-sm h-9 flex items-center">
                    {currentParent ? objectTitle(currentParent) : t`None`}
                  </span>
                ) : (
                  <Select
                    value={object.parent || "_none_"}
                    onValueChange={(value) =>
                      updateParentMutation.mutate(
                        value === "_none_" ? "" : value,
                      )
                    }
                    disabled={updateParentMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t`None`}>
                        {currentParent ? objectTitle(currentParent) : "None"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_"><Trans>None</Trans></SelectItem>
                      {validParentOptions.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {objectTitle(obj)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {classFields
              .filter((f) => f.id !== cls?.title)
              .map((field) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[120px_1fr] gap-4 items-start"
                >
                  <label className="text-sm font-medium text-muted-foreground pt-2">
                    {field.name}
                  </label>
                  <FieldEditor
                    field={field}
                    value={data.values[field.id] || ""}
                    options={classOptions[field.id] || []}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    readOnly={!canWrite(access)}
                    hideLabel
                    localPeople={peopleData}
                    onValidationError={(hasError) =>
                      handleValidationError(field.id, hasError)
                    }
                  />
                </div>
              ))}

            <ObjectAttachments
              projectId={projectId}
              objectId={objectId!}
              readOnly={!canWrite(access)}
            />

            <ObjectLinks
              projectId={projectId}
              objectId={objectId!}
              outgoing={data.outgoing}
              incoming={data.incoming}
              prefix={project.project.prefix}
              classes={project.classes}
              readOnly={!canWrite(access)}
            />
          </div>

          {hasRequests && activeTab === "requests" && (
            <div className="max-w-2xl">
              <RequestPanel
                projectId={projectId}
                objectId={objectId!}
                requests={data.requests || []}
                objectTitle={title}
                objectReadable={object.readable}
                readOnly={!canWrite(access)}
              />
            </div>
          )}

          {activeTab === "comments" && (
            <div className="max-w-2xl">
              <CommentList
                projectId={projectId}
                objectId={objectId}
                readOnly={!canComment(access)}
              />
            </div>
          )}

          {activeTab === "activity" && (
            <div className="max-w-2xl">
              <ActivityList projectId={projectId} objectId={objectId} />
            </div>
          )}
        </div>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={t`Delete item`}
          desc={t`Are you sure you want to delete "${title}"? This action cannot be undone.`}
          confirmText={t`Delete`}
          destructive
          isLoading={deleteMutation.isPending}
          handleConfirm={() => deleteMutation.mutate()}
        />
      </SheetContent>
    </Sheet>
  );
}
