// Mochi Projects: Object detail panel component
// Copyright Alistair Cunningham 2026

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
import { Button, Textarea, ConfirmDialog } from '@mochi/common'
import projectsApi from '@/api/projects'
import type { ProjectDetails } from '@/types'
import { FieldEditor } from './field-editor'
import { CommentList } from './comment-list'
import { ActivityList } from './activity-list'
import { PrPanel } from '@/features/pr'

interface ObjectDetailPanelProps {
  projectId: string
  objectId: string
  project: ProjectDetails
  onClose: () => void
}

type Tab = 'comments' | 'activity'

export function ObjectDetailPanel({
  projectId,
  objectId,
  project,
  onClose,
}: ObjectDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('comments')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['object', projectId, objectId],
    queryFn: async () => {
      const response = await projectsApi.getObject(projectId, objectId)
      return response.data
    },
  })

  const updateValueMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: string
      value: string
    }) => {
      await projectsApi.setValue(projectId, objectId, field, value)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['object', projectId, objectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['objects', projectId],
      })
    },
  })

  const watchMutation = useMutation({
    mutationFn: async (watching: boolean) => {
      if (watching) {
        return projectsApi.removeWatcher(projectId, objectId)
      } else {
        return projectsApi.addWatcher(projectId, objectId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['object', projectId, objectId],
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return projectsApi.deleteObject(projectId, objectId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['objects', projectId],
      })
      onClose()
    },
  })

  if (isLoading) {
    return (
      <div className="w-96 border-l bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-96 border-l bg-background p-4">
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : 'Failed to load object'}
        </div>
      </div>
    )
  }

  const object = data.object
  const typeFields = project.fields[object.type] || []
  const typeOptions = project.options[object.type] || {}
  const title = data.values.title || object.readable

  const handleTitleSave = () => {
    if (titleValue !== data.values.title) {
      updateValueMutation.mutate({ field: 'title', value: titleValue })
    }
    setEditingTitle(false)
  }

  const handleFieldChange = (fieldId: string, value: string) => {
    updateValueMutation.mutate({ field: fieldId, value })
  }

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="text-sm text-muted-foreground font-medium">
          {object.readable}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => watchMutation.mutate(data.watching)}
            disabled={watchMutation.isPending}
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
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="p-4 border-b">
          {editingTitle ? (
            <Textarea
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleTitleSave()
                }
                if (e.key === 'Escape') {
                  setEditingTitle(false)
                }
              }}
              className="text-lg font-semibold resize-none"
              autoFocus
            />
          ) : (
            <h2
              className="text-lg font-semibold cursor-pointer hover:text-primary"
              onClick={() => {
                setTitleValue(data.values.title || '')
                setEditingTitle(true)
              }}
            >
              {title}
            </h2>
          )}
        </div>

        {/* Fields */}
        <div className="p-4 space-y-4 border-b">
          {typeFields
            .filter((f) => f.id !== 'title' && !['repository', 'source_branch', 'target_branch'].includes(f.id))
            .map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                value={data.values[field.id] || ''}
                options={typeOptions[field.id] || []}
                onChange={(value) => handleFieldChange(field.id, value)}
                disabled={updateValueMutation.isPending}
              />
            ))}
        </div>

        {/* Pull Request Panel - shown if object has PR-related fields */}
        {(data.values.repository || typeFields.some((f) => f.id === 'repository')) && (
          <div className="p-4 border-b">
            <PrPanel
              values={data.values}
              onValueChange={handleFieldChange}
              objectTitle={title}
              objectReadable={object.readable}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'comments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('comments')}
            >
              Comments
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'activity'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4">
          {activeTab === 'comments' && (
            <CommentList projectId={projectId} objectId={objectId} />
          )}
          {activeTab === 'activity' && (
            <ActivityList projectId={projectId} objectId={objectId} />
          )}
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
  )
}
