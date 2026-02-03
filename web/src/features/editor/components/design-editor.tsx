// Mochi Projects: Design editor main component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Label } from "@mochi/common";
import { Plus } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectField, ProjectView, FieldOption } from "@/types";
import { DesignPreview } from "./design-preview";
import {
  AddTypeDialog,
  AddFieldDialog,
  AddOptionDialog,
  AddViewDialog,
} from "./add-dialogs";
import {
  EditViewDialog,
  EditTypeDialog,
  EditFieldDialog,
  EditOptionDialog,
} from "./edit-dialogs";

interface DesignEditorProps {
  projectId: string;
  project: ProjectDetails;
}

export function DesignEditor({ projectId, project }: DesignEditorProps) {
  const queryClient = useQueryClient();

  // Selection state
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    project.types[0]?.id || null,
  );

  // Add dialog state
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [addViewOpen, setAddViewOpen] = useState(false);

  // Edit dialog state
  const [editViewOpen, setEditViewOpen] = useState(false);
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [editFieldOpen, setEditFieldOpen] = useState(false);
  const [editOptionOpen, setEditOptionOpen] = useState(false);
  const [editingView, setEditingView] = useState<ProjectView | null>(null);
  const [editingField, setEditingField] = useState<ProjectField | null>(null);
  const [editingOption, setEditingOption] = useState<FieldOption | null>(null);

  // Get current selections
  const selectedType = project.types.find((t) => t.id === selectedTypeId);
  const selectedFields = selectedTypeId
    ? project.fields[selectedTypeId] || []
    : [];
  const hierarchy = selectedTypeId
    ? project.hierarchy[selectedTypeId] || []
    : [];

  // Get options for editing field
  const editingFieldOptions =
    selectedTypeId && editingField
      ? project.options[selectedTypeId]?.[editingField.id] || []
      : [];

  // Invalidate project data
  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };

  // Type mutations
  const createTypeMutation = useMutation({
    mutationFn: (name: string) => projectsApi.createType(projectId, { name }),
    onSuccess: (data) => {
      invalidateProject();
      setSelectedTypeId(data.data.id);
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ typeId, name }: { typeId: string; name: string }) =>
      projectsApi.updateType(projectId, typeId, { name }),
    onSuccess: invalidateProject,
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (typeId: string) => projectsApi.deleteType(projectId, typeId),
    onSuccess: () => {
      invalidateProject();
      setSelectedTypeId(project.types[0]?.id || null);
      setEditTypeOpen(false);
    },
  });

  // Hierarchy mutation
  const setHierarchyMutation = useMutation({
    mutationFn: ({ typeId, parents }: { typeId: string; parents: string[] }) =>
      projectsApi.setHierarchy(projectId, typeId, parents),
    onSuccess: invalidateProject,
  });

  // Field mutations
  const createFieldMutation = useMutation({
    mutationFn: ({
      typeId,
      name,
      fieldtype,
    }: {
      typeId: string;
      name: string;
      fieldtype: string;
    }) => projectsApi.createField(projectId, typeId, { name, fieldtype }),
    onSuccess: invalidateProject,
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({
      typeId,
      fieldId,
      updates,
    }: {
      typeId: string;
      fieldId: string;
      updates: Partial<ProjectField>;
    }) =>
      projectsApi.updateField(projectId, typeId, fieldId, {
        name: updates.name,
        required: updates.required?.toString(),
        card: updates.card?.toString(),
      }),
    onSuccess: invalidateProject,
  });

  const deleteFieldMutation = useMutation({
    mutationFn: ({ typeId, fieldId }: { typeId: string; fieldId: string }) =>
      projectsApi.deleteField(projectId, typeId, fieldId),
    onSuccess: () => {
      invalidateProject();
      setEditFieldOpen(false);
    },
  });

  // Option mutations
  const createOptionMutation = useMutation({
    mutationFn: ({
      typeId,
      fieldId,
      name,
      colour,
    }: {
      typeId: string;
      fieldId: string;
      name: string;
      colour: string;
    }) =>
      projectsApi.createOption(projectId, typeId, fieldId, { name, colour }),
    onSuccess: invalidateProject,
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({
      typeId,
      fieldId,
      optionId,
      updates,
    }: {
      typeId: string;
      fieldId: string;
      optionId: string;
      updates: { name?: string; colour?: string };
    }) =>
      projectsApi.updateOption(projectId, typeId, fieldId, optionId, updates),
    onSuccess: invalidateProject,
  });

  const deleteOptionMutation = useMutation({
    mutationFn: ({
      typeId,
      fieldId,
      optionId,
    }: {
      typeId: string;
      fieldId: string;
      optionId: string;
    }) => projectsApi.deleteOption(projectId, typeId, fieldId, optionId),
    onSuccess: () => {
      invalidateProject();
      setEditOptionOpen(false);
    },
  });

  // View mutations
  const createViewMutation = useMutation({
    mutationFn: ({ name, viewtype }: { name: string; viewtype: string }) =>
      projectsApi.createView(projectId, {
        name,
        viewtype: viewtype as "board" | "tree",
      }),
    onSuccess: invalidateProject,
  });

  const updateViewMutation = useMutation({
    mutationFn: ({
      viewId,
      updates,
      types,
    }: {
      viewId: string;
      updates?: Partial<ProjectView>;
      types?: string[];
    }) => {
      const payload: Record<string, string> = {};
      if (updates?.name !== undefined) payload.name = updates.name;
      if (updates?.viewtype !== undefined) payload.viewtype = updates.viewtype;
      if (updates?.filter !== undefined) payload.filter = updates.filter;
      if (updates?.columns !== undefined) payload.columns = updates.columns;
      if (updates?.rows !== undefined) payload.rows = updates.rows;
      if (updates?.cardfields !== undefined) payload.cardfields = updates.cardfields;
      if (updates?.sort !== undefined) payload.sort = updates.sort;
      if (updates?.direction !== undefined) payload.direction = updates.direction;
      if (types !== undefined) payload.types = types.join(",");
      return projectsApi.updateView(projectId, viewId, payload);
    },
    onSuccess: invalidateProject,
  });

  const deleteViewMutation = useMutation({
    mutationFn: (viewId: string) => projectsApi.deleteView(projectId, viewId),
    onSuccess: () => {
      invalidateProject();
      setEditViewOpen(false);
    },
  });

  // Handlers
  const handleEditView = (view: ProjectView) => {
    setEditingView(view);
    setEditViewOpen(true);
  };

  const handleEditField = (field: ProjectField) => {
    setEditingField(field);
    setEditFieldOpen(true);
  };

  const handleEditOption = (option: FieldOption) => {
    setEditingOption(option);
    setEditOptionOpen(true);
  };

  return (
    <div className="flex h-full">
      {/* Editor panel (left) */}
      <div className="w-80 border-r flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Views Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-sm font-medium">Views</Label>
                <p className="text-xs text-muted-foreground">How items are displayed</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddViewOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {project.views.map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleEditView(view)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{view.name}</span>
                  <span className="text-muted-foreground ml-2 capitalize">
                    ({view.viewtype})
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Types Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-sm font-medium">Item types</Label>
                <p className="text-xs text-muted-foreground">What you can create</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddTypeOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {project.types.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedTypeId(type.id);
                    setEditTypeOpen(true);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    selectedTypeId === type.id
                      ? "bg-muted"
                      : "hover:bg-muted"
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* Preview panel (right) */}
      <div className="flex-1 overflow-hidden">
        <DesignPreview
          types={project.types}
          fields={project.fields}
          options={project.options}
          views={project.views}
          selectedTypeId={selectedTypeId}
        />
      </div>

      {/* Add dialogs */}
      <AddViewDialog
        open={addViewOpen}
        onOpenChange={setAddViewOpen}
        onAdd={(name, viewtype) => createViewMutation.mutate({ name, viewtype })}
      />

      <AddTypeDialog
        open={addTypeOpen}
        onOpenChange={setAddTypeOpen}
        onAdd={(name) => createTypeMutation.mutate(name)}
      />

      <AddFieldDialog
        open={addFieldOpen}
        onOpenChange={setAddFieldOpen}
        onAdd={(name, fieldtype) => {
          if (selectedTypeId) {
            createFieldMutation.mutate({
              typeId: selectedTypeId,
              name,
              fieldtype,
            });
          }
        }}
      />

      <AddOptionDialog
        open={addOptionOpen}
        onOpenChange={setAddOptionOpen}
        onAdd={(name, colour) => {
          if (selectedTypeId && editingField) {
            createOptionMutation.mutate({
              typeId: selectedTypeId,
              fieldId: editingField.id,
              name,
              colour,
            });
          }
        }}
      />

      {/* Edit dialogs */}
      <EditViewDialog
        open={editViewOpen}
        onOpenChange={setEditViewOpen}
        view={editingView}
        fields={selectedFields}
        types={project.types}
        onUpdate={(updates) => {
          if (editingView) {
            updateViewMutation.mutate({ viewId: editingView.id, updates });
          }
        }}
        onUpdateTypes={(types) => {
          if (editingView) {
            updateViewMutation.mutate({ viewId: editingView.id, types });
          }
        }}
        onDelete={() => {
          if (editingView) {
            deleteViewMutation.mutate(editingView.id);
          }
        }}
      />

      <EditTypeDialog
        open={editTypeOpen}
        onOpenChange={setEditTypeOpen}
        type={selectedType || null}
        types={project.types}
        hierarchy={hierarchy}
        fields={selectedFields}
        onUpdate={(name) => {
          if (selectedTypeId) {
            updateTypeMutation.mutate({ typeId: selectedTypeId, name });
          }
        }}
        onUpdateHierarchy={(parents) => {
          if (selectedTypeId) {
            setHierarchyMutation.mutate({ typeId: selectedTypeId, parents });
          }
        }}
        onDelete={() => {
          if (selectedTypeId) {
            deleteTypeMutation.mutate(selectedTypeId);
          }
        }}
        onAddField={() => setAddFieldOpen(true)}
        onEditField={handleEditField}
      />

      <EditFieldDialog
        open={editFieldOpen}
        onOpenChange={setEditFieldOpen}
        field={editingField}
        options={editingFieldOptions}
        onUpdate={(updates) => {
          if (selectedTypeId && editingField) {
            updateFieldMutation.mutate({
              typeId: selectedTypeId,
              fieldId: editingField.id,
              updates,
            });
          }
        }}
        onDelete={() => {
          if (selectedTypeId && editingField) {
            deleteFieldMutation.mutate({
              typeId: selectedTypeId,
              fieldId: editingField.id,
            });
          }
        }}
        onAddOption={() => setAddOptionOpen(true)}
        onEditOption={handleEditOption}
        onDeleteOption={(optionId) => {
          if (selectedTypeId && editingField) {
            deleteOptionMutation.mutate({
              typeId: selectedTypeId,
              fieldId: editingField.id,
              optionId,
            });
          }
        }}
        onReorderOptions={() => {}}
      />

      <EditOptionDialog
        open={editOptionOpen}
        onOpenChange={setEditOptionOpen}
        option={editingOption}
        onUpdate={(updates) => {
          if (selectedTypeId && editingField && editingOption) {
            updateOptionMutation.mutate({
              typeId: selectedTypeId,
              fieldId: editingField.id,
              optionId: editingOption.id,
              updates,
            });
          }
        }}
        onDelete={() => {
          if (selectedTypeId && editingField && editingOption) {
            deleteOptionMutation.mutate({
              typeId: selectedTypeId,
              fieldId: editingField.id,
              optionId: editingOption.id,
            });
          }
        }}
      />
    </div>
  );
}
