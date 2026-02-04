// Mochi Projects: Object detail dialog component
// Copyright Alistair Cunningham 2026

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Trash2, MessageSquare, Activity, X, Settings2 } from "lucide-react";
import {
  Button,
  Textarea,
  ConfirmDialog,
  DataChip,
  Dialog,
  DialogContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@mochi/common";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { FieldEditor } from "./field-editor";
import { CommentList } from "./comment-list";
import { ActivityList } from "./activity-list";
import { PrPanel } from "@/features/pr";

interface ObjectDetailPanelProps {
  projectId: string;
  objectId: string | null;
  project: ProjectDetails;
  onClose: () => void;
}

type Tab = "properties" | "comments" | "activity";

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabDef[] = [
  { id: "properties", label: "Properties", icon: <Settings2 className="size-4" /> },
  { id: "comments", label: "Comments", icon: <MessageSquare className="size-4" /> },
  { id: "activity", label: "Activity", icon: <Activity className="size-4" /> },
];

export function ObjectDetailPanel({
  projectId,
  objectId,
  project,
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

  // Fetch all objects for parent picker
  const { data: objectsData } = useQuery({
    queryKey: ["objects", projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(projectId);
      return response.data.objects;
    },
  });

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

  // Build type name map - must be before early returns to maintain hook order
  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of project.classes) {
      map[t.id] = t.name;
    }
    return map;
  }, [project.classes]);

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
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0" showCloseButton={false}>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground ml-2">Loading details...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !data) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl" showCloseButton={false}>
          <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
            {error instanceof Error ? error.message : "Failed to load object"}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const object = data.object;
  const classFields = project.fields[object.class] || [];
  const classOptions = project.options[object.class] || {};
  const title = data.values.title || object.readable;

  const handleTitleSave = () => {
    if (titleValue !== data.values.title) {
      updateValueMutation.mutate({ field: "title", value: titleValue });
    }
    setEditingTitle(false);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    updateValueMutation.mutate({ field: fieldId, value });
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0" showCloseButton={false}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
          {editingTitle ? (
            <Textarea
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTitleSave();
                }
                if (e.key === "Escape") {
                  setEditingTitle(false);
                }
              }}
              className="text-xl font-bold resize-none min-h-[40px] flex-1"
              autoFocus
            />
          ) : (
            <h2
              className="text-xl font-bold cursor-pointer hover:text-primary transition-colors leading-tight truncate flex-1 min-w-0"
              onClick={() => {
                setTitleValue(data.values.title || "");
                setEditingTitle(true);
              }}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
              title="Delete item"
            >
              <Trash2 className="size-4" />
            </Button>
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
                  <Select
                    value={object.parent || "_none_"}
                    onValueChange={(value) => updateParentMutation.mutate(value === "_none_" ? "" : value)}
                    disabled={updateParentMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None">
                        {currentParent
                          ? `${classNameMap[currentParent.class] || currentParent.class}: ${currentParent.values.title || `${project.project.prefix}-${currentParent.number}`}`
                          : "None"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">None</SelectItem>
                      {validParentOptions.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {classNameMap[obj.class] || obj.class}: {obj.values.title || `${project.project.prefix}-${obj.number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {classFields
                .filter(
                  (f) =>
                    f.id !== "title" &&
                    !["repository", "source_branch", "target_branch"].includes(f.id),
                )
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
                      disabled={updateValueMutation.isPending}
                      hideLabel
                      localPeople={peopleData}
                      onValidationError={(hasError) => handleValidationError(field.id, hasError)}
                    />
                  </div>
                ))}

              {/* Pull Request Panel */}
              {(data.values.repository ||
                classFields.some((f) => f.id === "repository")) && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Development</h3>
                  <PrPanel
                    values={data.values}
                    onValueChange={handleFieldChange}
                    objectTitle={title}
                    objectReadable={object.readable}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="max-w-2xl">
              <CommentList projectId={projectId} objectId={objectId} />
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
      </DialogContent>
    </Dialog>
  );
}
