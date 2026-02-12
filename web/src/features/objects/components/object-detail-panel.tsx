// Mochi Projects: Object detail dialog component
// Copyright Alistair Cunningham 2026

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Trash2, MessageSquare, Activity, Settings2, GitPullRequest, X } from "lucide-react";
import {
  Button,
  Input,
  ConfirmDialog,
  DataChip,
  Sheet,
  SheetContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  getErrorMessage,
} from "@mochi/common";
import projectsApi from "@/api/projects";
import type { ProjectAccess, ProjectDetails } from "@/types";
import { canWrite, canComment } from "@/lib/access";
import { FieldEditor } from "./field-editor";
import { CommentList } from "./comment-list";
import { ActivityList } from "./activity-list";
import { PrPanel } from "@/features/pr";

interface ObjectDetailPanelProps {
  projectId: string;
  objectId: string | null;
  project: ProjectDetails;
  access: ProjectAccess;
  onClose: () => void;
}

type Tab = "properties" | "prs" | "comments" | "activity";

export function ObjectDetailPanel({
  projectId,
  objectId,
  project,
  access,
  onClose,
}: ObjectDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("properties");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["object", projectId, objectId],
    queryFn: async () => {
      if (!objectId) throw new Error("No object ID");
      const response = await projectsApi.getObject(projectId, objectId);
      return response.data;
    },
    enabled: !!objectId,
  });

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
      onClose();
    },
  });

  const updateParentMutation = useMutation({
    mutationFn: async (newParent: string) => {
      if (!objectId) return;
      return projectsApi.updateObject(projectId, objectId, { parent: newParent });
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

    return objectsData.filter(
      (obj) => parentClassIds.includes(obj.class) && !descendants.has(obj.id)
    );
  }, [objectsData, data, project.hierarchy]);

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
        <SheetContent className="w-full sm:max-w-2xl p-0 gap-0">
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground ml-2">Loading details...</span>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (error || !data) {
    return (
      <Sheet open={true} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-2xl p-6">
          <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
            {getErrorMessage(error, "Failed to load object")}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const object = data.object;
  const classFields = project.fields[object.class] || [];
  const classOptions = project.options[object.class] || {};
  const cls = project.classes.find((c) => c.id === object.class);
  const titleField = cls?.title ? classFields.find((f) => f.id === cls.title) : undefined;
  const title = (titleField ? data.values[titleField.id] : "") || object.readable;
  const hasPrs = cls?.pull_requests === 1;

  // Get display title for any object using its class's title field
  const objectTitle = (obj: { class: string; number: number; values: Record<string, string> }) => {
    const objCls = project.classes.find((c) => c.id === obj.class);
    return (objCls?.title ? obj.values[objCls.title] : "") || `${project.project.prefix}-${obj.number}`;
  };
  const prCount = data.prs?.length || 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "properties", label: "Properties", icon: <Settings2 className="size-4" /> },
    ...(hasPrs
      ? [{ id: "prs" as Tab, label: `Pull requests (${prCount})`, icon: <GitPullRequest className="size-4" /> }]
      : []),
    { id: "comments", label: `Comments (${data.comment_count || 0})`, icon: <MessageSquare className="size-4" /> },
    { id: "activity", label: "Activity", icon: <Activity className="size-4" /> },
  ];

  const handleTitleSave = () => {
    const currentTitle = titleField ? data.values[titleField.id] : "";
    if (titleField && titleValue !== currentTitle) {
      updateValueMutation.mutate({ field: titleField.id, value: titleValue });
    }
    setEditingTitle(false);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    updateValueMutation.mutate({ field: fieldId, value });
  };

  return (
    <Sheet open={true} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 gap-0 [&>button:last-child]:hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
          {editingTitle && canWrite(access) ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleTitleSave();
                }
                if (e.key === "Escape") {
                  setEditingTitle(false);
                }
              }}
              className="text-xl font-bold flex-1"
              autoFocus
            />
          ) : (
            <h2
              className={cn(
                "text-xl font-bold leading-tight truncate flex-1 min-w-0",
                canWrite(access) && "cursor-pointer hover:text-primary transition-colors"
              )}
              onClick={canWrite(access) && titleField ? () => {
                setTitleValue(titleField ? data.values[titleField.id] || "" : "");
                setEditingTitle(true);
              } : undefined}
            >
              {title}
            </h2>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => watchMutation.mutate(data.watching)}
              disabled={watchMutation.isPending}
              title={data.watching ? "Stop watching" : "Watch"}
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
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete item"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b px-6 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                "border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "properties" && (
            <div className="max-w-2xl space-y-6">
              {/* ID */}
              <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                <label className="text-sm font-medium text-muted-foreground pt-2">
                  ID
                </label>
                <DataChip value={object.readable} copyable chipClassName="bg-primary/10 border-primary/20 text-primary font-bold text-[11px]" />
              </div>

              {/* Parent */}
              {(validParentOptions.length > 0 || currentParent) && (
                <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
                  <label className="text-sm font-medium text-muted-foreground pt-2">
                    Parent
                  </label>
                  {!canWrite(access) ? (
                    <span className="text-sm h-9 flex items-center">
                      {currentParent
                        ? objectTitle(currentParent)
                        : "None"}
                    </span>
                  ) : (
                    <Select
                      value={object.parent || "_none_"}
                      onValueChange={(value) => updateParentMutation.mutate(value === "_none_" ? "" : value)}
                      disabled={updateParentMutation.isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None">
                          {currentParent
                            ? objectTitle(currentParent)
                            : "None"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">None</SelectItem>
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
                  <div key={field.id} className="grid grid-cols-[120px_1fr] gap-4 items-start">
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
                      onValidationError={(hasError) => handleValidationError(field.id, hasError)}
                    />
                  </div>
                ))}

            </div>
          )}

          {activeTab === "prs" && hasPrs && (
            <div className="max-w-2xl">
              <PrPanel
                projectId={projectId}
                objectId={objectId!}
                prs={data.prs || []}
                objectTitle={title}
                objectReadable={object.readable}
                readOnly={!canWrite(access)}
              />
            </div>
          )}

          {activeTab === "comments" && (
            <div className="max-w-2xl">
              <CommentList projectId={projectId} objectId={objectId} readOnly={!canComment(access)} />
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
          title="Delete item"
          desc={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
          confirmText="Delete"
          destructive
          isLoading={deleteMutation.isPending}
          handleConfirm={() => deleteMutation.mutate()}
        />
      </SheetContent>
    </Sheet>
  );
}
