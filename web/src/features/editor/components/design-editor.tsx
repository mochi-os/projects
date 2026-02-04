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
  AddClassDialog,
  AddFieldDialog,
  AddOptionDialog,
  AddViewDialog,
} from "./add-dialogs";
import {
  EditViewDialog,
  EditClassDialog,
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
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    project.classes[0]?.id || null,
  );

  // Add dialog state
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [addOptionOpen, setAddOptionOpen] = useState(false);
  const [addViewOpen, setAddViewOpen] = useState(false);

  // Edit dialog state
  const [editViewOpen, setEditViewOpen] = useState(false);
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [editFieldOpen, setEditFieldOpen] = useState(false);
  const [editOptionOpen, setEditOptionOpen] = useState(false);
  const [editingView, setEditingView] = useState<ProjectView | null>(null);
  const [editingField, setEditingField] = useState<ProjectField | null>(null);
  const [editingOption, setEditingOption] = useState<FieldOption | null>(null);

  // Get current selections
  const selectedClass = project.classes.find((c) => c.id === selectedClassId);
  const selectedFields = selectedClassId
    ? project.fields[selectedClassId] || []
    : [];
  const hierarchy = selectedClassId
    ? project.hierarchy[selectedClassId] || []
    : [];

  // Get options for editing field
  const editingFieldOptions =
    selectedClassId && editingField
      ? project.options[selectedClassId]?.[editingField.id] || []
      : [];

  // Invalidate project data
  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };

  // Class mutations
  const createClassMutation = useMutation({
    mutationFn: (name: string) => projectsApi.createClass(projectId, { name }),
    onSuccess: (data) => {
      invalidateProject();
      setSelectedClassId(data.data.id);
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ classId, name }: { classId: string; name: string }) =>
      projectsApi.updateClass(projectId, classId, { name }),
    onSuccess: invalidateProject,
  });

  const deleteClassMutation = useMutation({
    mutationFn: (classId: string) => projectsApi.deleteClass(projectId, classId),
    onSuccess: () => {
      invalidateProject();
      setSelectedClassId(project.classes[0]?.id || null);
      setEditClassOpen(false);
    },
  });

  // Hierarchy mutation
  const setHierarchyMutation = useMutation({
    mutationFn: ({ classId, parents }: { classId: string; parents: string[] }) =>
      projectsApi.setHierarchy(projectId, classId, parents),
    onSuccess: invalidateProject,
  });

  // Field mutations
  const createFieldMutation = useMutation({
    mutationFn: ({
      classId,
      name,
      fieldtype,
    }: {
      classId: string;
      name: string;
      fieldtype: string;
    }) => projectsApi.createField(projectId, classId, { name, fieldtype }),
    onSuccess: invalidateProject,
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({
      classId,
      fieldId,
      updates,
    }: {
      classId: string;
      fieldId: string;
      updates: Partial<ProjectField>;
    }) =>
      projectsApi.updateField(projectId, classId, fieldId, {
        name: updates.name,
        required: updates.required?.toString(),
        card: updates.card?.toString(),
      }),
    onSuccess: invalidateProject,
  });

  const deleteFieldMutation = useMutation({
    mutationFn: ({ classId, fieldId }: { classId: string; fieldId: string }) =>
      projectsApi.deleteField(projectId, classId, fieldId),
    onSuccess: () => {
      invalidateProject();
      setEditFieldOpen(false);
    },
  });

  // Option mutations
  const createOptionMutation = useMutation({
    mutationFn: ({
      classId,
      fieldId,
      name,
      colour,
    }: {
      classId: string;
      fieldId: string;
      name: string;
      colour: string;
    }) =>
      projectsApi.createOption(projectId, classId, fieldId, { name, colour }),
    onSuccess: invalidateProject,
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({
      classId,
      fieldId,
      optionId,
      updates,
    }: {
      classId: string;
      fieldId: string;
      optionId: string;
      updates: { name?: string; colour?: string };
    }) =>
      projectsApi.updateOption(projectId, classId, fieldId, optionId, updates),
    onSuccess: invalidateProject,
  });

  const deleteOptionMutation = useMutation({
    mutationFn: ({
      classId,
      fieldId,
      optionId,
    }: {
      classId: string;
      fieldId: string;
      optionId: string;
    }) => projectsApi.deleteOption(projectId, classId, fieldId, optionId),
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
      if (updates?.fields !== undefined) payload.fields = updates.fields;
      if (updates?.sort !== undefined) payload.sort = updates.sort;
      if (updates?.direction !== undefined) payload.direction = updates.direction;
      if (types !== undefined) payload.classes = types.join(",");
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

          {/* Classes Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-sm font-medium">Classes</Label>
                <p className="text-xs text-muted-foreground">What you can create</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddClassOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {project.classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    setEditClassOpen(true);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    selectedClassId === cls.id
                      ? "bg-muted"
                      : "hover:bg-muted"
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* Preview panel (right) */}
      <div className="flex-1 overflow-hidden">
        <DesignPreview
          classes={project.classes}
          fields={project.fields}
          options={project.options}
          views={project.views}
          selectedClassId={selectedClassId}
        />
      </div>

      {/* Add dialogs */}
      <AddViewDialog
        open={addViewOpen}
        onOpenChange={setAddViewOpen}
        onAdd={(name, viewtype) => createViewMutation.mutate({ name, viewtype })}
      />

      <AddClassDialog
        open={addClassOpen}
        onOpenChange={setAddClassOpen}
        onAdd={(name) => createClassMutation.mutate(name)}
      />

      <AddFieldDialog
        open={addFieldOpen}
        onOpenChange={setAddFieldOpen}
        onAdd={(name, fieldtype) => {
          if (selectedClassId) {
            createFieldMutation.mutate({
              classId: selectedClassId,
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
          if (selectedClassId && editingField) {
            createOptionMutation.mutate({
              classId: selectedClassId,
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
        classes={project.classes}
        onUpdate={(updates) => {
          if (editingView) {
            updateViewMutation.mutate({ viewId: editingView.id, updates });
          }
        }}
        onUpdateClasses={(classes) => {
          if (editingView) {
            updateViewMutation.mutate({ viewId: editingView.id, types: classes });
          }
        }}
        onDelete={() => {
          if (editingView) {
            deleteViewMutation.mutate(editingView.id);
          }
        }}
      />

      <EditClassDialog
        open={editClassOpen}
        onOpenChange={setEditClassOpen}
        cls={selectedClass || null}
        classes={project.classes}
        hierarchy={hierarchy}
        fields={selectedFields}
        onUpdate={(name) => {
          if (selectedClassId) {
            updateClassMutation.mutate({ classId: selectedClassId, name });
          }
        }}
        onUpdateHierarchy={(parents) => {
          if (selectedClassId) {
            setHierarchyMutation.mutate({ classId: selectedClassId, parents });
          }
        }}
        onDelete={() => {
          if (selectedClassId) {
            deleteClassMutation.mutate(selectedClassId);
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
          if (selectedClassId && editingField) {
            updateFieldMutation.mutate({
              classId: selectedClassId,
              fieldId: editingField.id,
              updates,
            });
          }
        }}
        onDelete={() => {
          if (selectedClassId && editingField) {
            deleteFieldMutation.mutate({
              classId: selectedClassId,
              fieldId: editingField.id,
            });
          }
        }}
        onAddOption={() => setAddOptionOpen(true)}
        onEditOption={handleEditOption}
        onDeleteOption={(optionId) => {
          if (selectedClassId && editingField) {
            deleteOptionMutation.mutate({
              classId: selectedClassId,
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
          if (selectedClassId && editingField && editingOption) {
            updateOptionMutation.mutate({
              classId: selectedClassId,
              fieldId: editingField.id,
              optionId: editingOption.id,
              updates,
            });
          }
        }}
        onDelete={() => {
          if (selectedClassId && editingField && editingOption) {
            deleteOptionMutation.mutate({
              classId: selectedClassId,
              fieldId: editingField.id,
              optionId: editingOption.id,
            });
          }
        }}
      />
    </div>
  );
}
