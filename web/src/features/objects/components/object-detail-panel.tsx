// Mochi Projects: Object detail panel component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Eye, EyeOff, Loader2, Trash2, MessageSquare, Activity } from "lucide-react";
import { 
  Button, 
  Textarea, 
  ConfirmDialog,
  Section,
  FieldRow,
  DataChip,
} from "@mochi/common";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { FieldEditor } from "./field-editor";
import { CommentList } from "./comment-list";
import { ActivityList } from "./activity-list";
import { PrPanel } from "@/features/pr";

interface ObjectDetailPanelProps {
  projectId: string;
  objectId: string;
  project: ProjectDetails;
  onClose: () => void;
}

type Tab = "comments" | "activity";

export function ObjectDetailPanel({
  projectId,
  objectId,
  project,
  onClose,
}: ObjectDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["object", projectId, objectId],
    queryFn: async () => {
      const response = await projectsApi.getObject(projectId, objectId);
      return response.data;
    },
  });

  const updateValueMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
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
      return projectsApi.deleteObject(projectId, objectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["objects", projectId],
      });
      onClose();
    },
  });

  if (isLoading) {
    return (
      <div className="w-96 border-l bg-background flex flex-col items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground mt-2">Loading details...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-96 border-l bg-background p-4">
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
          {error instanceof Error ? error.message : "Failed to load object"}
        </div>
      </div>
    );
  }

  const object = data.object;
  const typeFields = project.fields[object.type] || [];
  const typeOptions = project.options[object.type] || {};
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
    <div className="w-96 border-l bg-background flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/20">
        <div className="flex items-center gap-2">
           <DataChip value={object.readable} copyable={false} chipClassName="bg-primary/10 border-primary/20 text-primary font-bold text-[11px]" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => watchMutation.mutate(data.watching)}
            disabled={watchMutation.isPending}
            title={data.watching ? "Stop watching" : "Watch"}
          >
            {data.watching ? (
              <Eye className="size-4 text-primary" />
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
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-px">
        {/* Title Section */}
        <div className="p-4 bg-background">
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
              className="text-lg font-bold resize-none min-h-[80px]"
              autoFocus
            />
          ) : (
            <h2
              className="text-lg font-bold cursor-pointer hover:text-primary transition-colors leading-tight"
              onClick={() => {
                setTitleValue(data.values.title || "");
                setEditingTitle(true);
              }}
            >
              {title}
            </h2>
          )}
        </div>

        {/* Fields Section */}
        <Section 
          title="Properties" 
          className="rounded-none border-x-0 border-t-0 shadow-none" 
          contentClassName="py-0 px-4"
        >
          <div className="divide-y-0">
            {typeFields
              .filter(
                (f) =>
                  f.id !== "title" &&
                  !["repository", "source_branch", "target_branch"].includes(
                    f.id,
                  ),
              )
              .map((field) => (
                <FieldRow key={field.id} label={field.name} className="py-3 grid-cols-[100px_1fr] gap-2">
                  <div className="w-full">
                    <FieldEditor
                      field={field}
                      value={data.values[field.id] || ""}
                      options={typeOptions[field.id] || []}
                      onChange={(value) => handleFieldChange(field.id, value)}
                      disabled={updateValueMutation.isPending}
                      hideLabel // I'll add this prop to FieldEditor or just use unique styling
                    />
                  </div>
                </FieldRow>
              ))}
          </div>
        </Section>

        {/* Pull Request Panel */}
        {(data.values.repository ||
          typeFields.some((f) => f.id === "repository")) && (
          <Section 
            title="Development" 
            className="rounded-none border-x-0 border-t-0 shadow-none"
            contentClassName="p-4"
          >
            <PrPanel
              values={data.values}
              onValueChange={handleFieldChange}
              objectTitle={title}
              objectReadable={object.readable}
            />
          </Section>
        )}

        {/* Tabs for Comments/Activity */}
        <div className="bg-background flex flex-col min-h-[400px]">
          <div className="flex border-b sticky top-0 bg-background z-10 px-4">
            <button
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "comments"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              onClick={() => setActiveTab("comments")}
            >
              <MessageSquare className="size-3.5" />
              Comments
            </button>
            <button
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "activity"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              onClick={() => setActiveTab("activity")}
            >
              <Activity className="size-3.5" />
              Activity
            </button>
          </div>

          <div className="p-4 flex-1">
            {activeTab === "comments" && (
              <CommentList projectId={projectId} objectId={objectId} />
            )}
            {activeTab === "activity" && (
              <ActivityList projectId={projectId} objectId={objectId} />
            )}
          </div>
        </div>
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
    </div>
  );
}
