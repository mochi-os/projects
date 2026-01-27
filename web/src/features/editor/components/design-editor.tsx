// Mochi Projects: Design editor main component
// Copyright Alistair Cunningham 2026

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mochi/common'
import projectsApi from '@/api/projects'
import type { ProjectDetails, ProjectField, ProjectView } from '@/types'
import { TypeList } from './type-list'
import { TypeEditor } from './type-editor'
import { FieldList } from './field-list'
import { FieldEditorPanel } from './field-editor-panel'
import { OptionList } from './option-list'
import { OptionEditor } from './option-editor'
import { HierarchyEditor } from './hierarchy-editor'
import { ViewList } from './view-list'
import { ViewEditor } from './view-editor'
import { DesignPreview } from './design-preview'
import {
  AddTypeDialog,
  AddFieldDialog,
  AddOptionDialog,
  AddViewDialog,
} from './add-dialogs'

interface DesignEditorProps {
  projectId: string
  project: ProjectDetails
}

export function DesignEditor({ projectId, project }: DesignEditorProps) {
  const queryClient = useQueryClient()

  // Selection state
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    project.types[0]?.id || null
  )
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(
    project.views[0]?.id || null
  )

  // Dialog state
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [addOptionOpen, setAddOptionOpen] = useState(false)
  const [addViewOpen, setAddViewOpen] = useState(false)

  // Get current selections
  const selectedType = project.types.find((t) => t.id === selectedTypeId)
  const selectedFields = selectedTypeId ? project.fields[selectedTypeId] || [] : []
  const selectedField = selectedFields.find((f) => f.id === selectedFieldId)
  const selectedOptions = selectedTypeId && selectedFieldId
    ? project.options[selectedTypeId]?.[selectedFieldId] || []
    : []
  const selectedOption = selectedOptions.find((o) => o.id === selectedOptionId)
  const selectedView = project.views.find((v) => v.id === selectedViewId)
  const hierarchy = selectedTypeId ? project.hierarchy[selectedTypeId] || [] : []

  // Invalidate project data
  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
  }

  // Type mutations
  const createTypeMutation = useMutation({
    mutationFn: (name: string) => projectsApi.createType(projectId, { name }),
    onSuccess: (data) => {
      invalidateProject()
      setSelectedTypeId(data.data.id)
    },
  })

  const updateTypeMutation = useMutation({
    mutationFn: ({ typeId, name }: { typeId: string; name: string }) =>
      projectsApi.updateType(projectId, typeId, { name }),
    onSuccess: invalidateProject,
  })

  const deleteTypeMutation = useMutation({
    mutationFn: (typeId: string) => projectsApi.deleteType(projectId, typeId),
    onSuccess: () => {
      invalidateProject()
      setSelectedTypeId(project.types[0]?.id || null)
      setSelectedFieldId(null)
      setSelectedOptionId(null)
    },
  })

  // Hierarchy mutation
  const setHierarchyMutation = useMutation({
    mutationFn: ({ typeId, parents }: { typeId: string; parents: string[] }) =>
      projectsApi.setHierarchy(projectId, typeId, parents),
    onSuccess: invalidateProject,
  })

  // Field mutations
  const createFieldMutation = useMutation({
    mutationFn: ({ typeId, name, fieldtype }: { typeId: string; name: string; fieldtype: string }) =>
      projectsApi.createField(projectId, typeId, { name, fieldtype }),
    onSuccess: (data) => {
      invalidateProject()
      setSelectedFieldId(data.data.id)
    },
  })

  const updateFieldMutation = useMutation({
    mutationFn: ({ typeId, fieldId, updates }: { typeId: string; fieldId: string; updates: Partial<ProjectField> }) =>
      projectsApi.updateField(projectId, typeId, fieldId, {
        name: updates.name,
        required: updates.required?.toString(),
        card: updates.card?.toString(),
      }),
    onSuccess: invalidateProject,
  })

  const deleteFieldMutation = useMutation({
    mutationFn: ({ typeId, fieldId }: { typeId: string; fieldId: string }) =>
      projectsApi.deleteField(projectId, typeId, fieldId),
    onSuccess: () => {
      invalidateProject()
      setSelectedFieldId(null)
      setSelectedOptionId(null)
    },
  })

  const reorderFieldsMutation = useMutation({
    mutationFn: ({ typeId, order }: { typeId: string; order: string[] }) =>
      projectsApi.reorderFields(projectId, typeId, order),
    onSuccess: invalidateProject,
  })

  // Option mutations
  const createOptionMutation = useMutation({
    mutationFn: ({ typeId, fieldId, name, colour }: { typeId: string; fieldId: string; name: string; colour: string }) =>
      projectsApi.createOption(projectId, typeId, fieldId, { name, colour }),
    onSuccess: (data) => {
      invalidateProject()
      setSelectedOptionId(data.data.id)
    },
  })

  const updateOptionMutation = useMutation({
    mutationFn: ({ typeId, fieldId, optionId, updates }: { typeId: string; fieldId: string; optionId: string; updates: { name?: string; colour?: string } }) =>
      projectsApi.updateOption(projectId, typeId, fieldId, optionId, updates),
    onSuccess: invalidateProject,
  })

  const deleteOptionMutation = useMutation({
    mutationFn: ({ typeId, fieldId, optionId }: { typeId: string; fieldId: string; optionId: string }) =>
      projectsApi.deleteOption(projectId, typeId, fieldId, optionId),
    onSuccess: () => {
      invalidateProject()
      setSelectedOptionId(null)
    },
  })

  const reorderOptionsMutation = useMutation({
    mutationFn: ({ typeId, fieldId, order }: { typeId: string; fieldId: string; order: string[] }) =>
      projectsApi.reorderOptions(projectId, typeId, fieldId, order),
    onSuccess: invalidateProject,
  })

  // View mutations
  const createViewMutation = useMutation({
    mutationFn: ({ name, viewtype }: { name: string; viewtype: string }) =>
      projectsApi.createView(projectId, { name, viewtype: viewtype as 'board' | 'list' }),
    onSuccess: (data) => {
      invalidateProject()
      setSelectedViewId(data.data.id)
    },
  })

  const updateViewMutation = useMutation({
    mutationFn: ({ viewId, updates }: { viewId: string; updates: Partial<ProjectView> }) =>
      projectsApi.updateView(projectId, viewId, {
        ...updates,
        viewtype: updates.viewtype as 'board' | 'list' | undefined,
        direction: updates.direction as 'asc' | 'desc' | undefined,
      }),
    onSuccess: invalidateProject,
  })

  const deleteViewMutation = useMutation({
    mutationFn: (viewId: string) => projectsApi.deleteView(projectId, viewId),
    onSuccess: () => {
      invalidateProject()
      setSelectedViewId(project.views[0]?.id || null)
    },
  })

  // Handle field selection - also check if it's an enum to show options
  const handleSelectField = (fieldId: string) => {
    setSelectedFieldId(fieldId)
    setSelectedOptionId(null)
  }

  return (
    <div className="flex h-full">
      {/* Editor panel (left) */}
      <div className="w-80 border-r flex flex-col overflow-hidden">
        <Tabs defaultValue="types" className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-2">
            <TabsTrigger value="types">Types</TabsTrigger>
            <TabsTrigger value="views">Views</TabsTrigger>
          </TabsList>

          <TabsContent value="types" className="flex-1 overflow-auto p-4 space-y-4 m-0">
            <TypeList
              types={project.types}
              selectedTypeId={selectedTypeId}
              onSelectType={setSelectedTypeId}
              onAddType={() => setAddTypeOpen(true)}
              onDeleteType={(typeId) => deleteTypeMutation.mutate(typeId)}
            />

            {selectedType && (
              <>
                <TypeEditor
                  type={selectedType}
                  onUpdate={(name) =>
                    updateTypeMutation.mutate({ typeId: selectedType.id, name })
                  }
                />

                <HierarchyEditor
                  types={project.types}
                  currentTypeId={selectedType.id}
                  allowedParents={hierarchy}
                  onUpdate={(parents) =>
                    setHierarchyMutation.mutate({ typeId: selectedType.id, parents })
                  }
                />

                <FieldList
                  fields={selectedFields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={handleSelectField}
                  onAddField={() => setAddFieldOpen(true)}
                  onDeleteField={(fieldId) =>
                    deleteFieldMutation.mutate({ typeId: selectedType.id, fieldId })
                  }
                  onReorder={(order) =>
                    reorderFieldsMutation.mutate({ typeId: selectedType.id, order })
                  }
                />

                {selectedField && (
                  <FieldEditorPanel
                    field={selectedField}
                    onUpdate={(updates) =>
                      updateFieldMutation.mutate({
                        typeId: selectedType.id,
                        fieldId: selectedField.id,
                        updates,
                      })
                    }
                  />
                )}

                {selectedField?.fieldtype === 'enum' && (
                  <>
                    <OptionList
                      options={selectedOptions}
                      selectedOptionId={selectedOptionId}
                      onSelectOption={setSelectedOptionId}
                      onAddOption={() => setAddOptionOpen(true)}
                      onDeleteOption={(optionId) =>
                        deleteOptionMutation.mutate({
                          typeId: selectedType.id,
                          fieldId: selectedField.id,
                          optionId,
                        })
                      }
                      onReorder={(order) =>
                        reorderOptionsMutation.mutate({
                          typeId: selectedType.id,
                          fieldId: selectedField.id,
                          order,
                        })
                      }
                    />

                    {selectedOption && (
                      <OptionEditor
                        option={selectedOption}
                        onUpdate={(updates) =>
                          updateOptionMutation.mutate({
                            typeId: selectedType.id,
                            fieldId: selectedField.id,
                            optionId: selectedOption.id,
                            updates,
                          })
                        }
                      />
                    )}
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="views" className="flex-1 overflow-auto p-4 space-y-4 m-0">
            <ViewList
              views={project.views}
              selectedViewId={selectedViewId}
              onSelectView={setSelectedViewId}
              onAddView={() => setAddViewOpen(true)}
              onDeleteView={(viewId) => deleteViewMutation.mutate(viewId)}
            />

            {selectedView && (
              <ViewEditor
                view={selectedView}
                fields={selectedFields}
                onUpdate={(updates) =>
                  updateViewMutation.mutate({ viewId: selectedView.id, updates })
                }
              />
            )}
          </TabsContent>
        </Tabs>
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
            createFieldMutation.mutate({ typeId: selectedTypeId, name, fieldtype })
          }
        }}
      />

      <AddOptionDialog
        open={addOptionOpen}
        onOpenChange={setAddOptionOpen}
        onAdd={(name, colour) => {
          if (selectedTypeId && selectedFieldId) {
            createOptionMutation.mutate({
              typeId: selectedTypeId,
              fieldId: selectedFieldId,
              name,
              colour,
            })
          }
        }}
      />

      <AddViewDialog
        open={addViewOpen}
        onOpenChange={setAddViewOpen}
        onAdd={(name, viewtype) => createViewMutation.mutate({ name, viewtype })}
      />
    </div>
  )
}
