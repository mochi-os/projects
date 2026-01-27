// Mochi Projects: Project page with board and list views
// Copyright Alistair Cunningham 2026

import { useState, useMemo, useRef, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GeneralError, Main, PageHeader, usePageTitle } from '@mochi/common'
import { FolderKanban, Plus, Settings2 } from 'lucide-react'
import { Button } from '@mochi/common'
import projectsApi from '@/api/projects'
import type { ProjectDetails, ProjectObject, ObjectTemplate } from '@/types'
import { BoardContainer } from '@/features/board/components'
import { ListView, type SortState } from '@/features/list'
import { ViewTabs, FilterBar, type FilterState } from '@/features/views'
import {
  CreateObjectDialog,
  ObjectDetailPanel,
} from '@/features/objects/components'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help'

export const Route = createFileRoute('/_authenticated/$projectId/')({
  loader: async ({ params }) => {
    const [projectResponse, templatesResponse] = await Promise.all([
      projectsApi.get(params.projectId),
      projectsApi.objectTemplates(),
    ])
    return {
      project: projectResponse.data,
      templates: templatesResponse.data.templates,
    }
  },
  component: ProjectPage,
  errorComponent: ({ error }) => <GeneralError error={error} />,
})

function ProjectPage() {
  const { project, templates } = Route.useLoaderData() as {
    project: ProjectDetails
    templates: ObjectTemplate[]
  }
  const params = Route.useParams()

  usePageTitle(project.project.name)

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDefaultStatus, setCreateDefaultStatus] = useState<
    string | undefined
  >()
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // View state
  const [activeViewId, setActiveViewId] = useState(
    project.views[0]?.id || 'board'
  )
  const activeView = project.views.find((v) => v.id === activeViewId) ||
    project.views[0]

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    priority: '',
    assignee: '',
  })

  // Sort state for list view
  const [sort, setSort] = useState<SortState | null>(null)

  const queryClient = useQueryClient()

  // Load objects
  const { data: objectsData } = useQuery({
    queryKey: ['objects', params.projectId],
    queryFn: async () => {
      const response = await projectsApi.listObjects(params.projectId)
      return response.data.objects
    },
  })

  // Move object mutation
  const moveMutation = useMutation({
    mutationFn: async ({
      objectId,
      status,
    }: {
      objectId: string
      status: string
    }) => {
      return projectsApi.moveObject(params.projectId, objectId, { status })
    },
    onMutate: async ({ objectId, status }) => {
      // Optimistically update the UI
      await queryClient.cancelQueries({
        queryKey: ['objects', params.projectId],
      })

      const previousObjects = queryClient.getQueryData<ProjectObject[]>([
        'objects',
        params.projectId,
      ])

      queryClient.setQueryData<ProjectObject[]>(
        ['objects', params.projectId],
        (old) =>
          old?.map((obj) =>
            obj.id === objectId
              ? { ...obj, values: { ...obj.values, status } }
              : obj
          )
      )

      return { previousObjects }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousObjects) {
        queryClient.setQueryData(
          ['objects', params.projectId],
          context.previousObjects
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['objects', params.projectId],
      })
    },
  })

  // Filter objects
  const filteredObjects = useMemo(() => {
    let result = objectsData || []

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter((obj) => {
        const title = obj.values.title?.toLowerCase() || ''
        const description = obj.values.description?.toLowerCase() || ''
        return title.includes(searchLower) || description.includes(searchLower)
      })
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter((obj) => obj.values.status === filters.status)
    }

    // Apply priority filter
    if (filters.priority) {
      result = result.filter((obj) => obj.values.priority === filters.priority)
    }

    // Apply assignee filter
    if (filters.assignee) {
      result = result.filter((obj) => obj.values.assignee === filters.assignee)
    }

    return result
  }, [objectsData, filters])

  // Keyboard navigation helpers
  const handleSelectNext = useCallback(() => {
    if (filteredObjects.length === 0) return
    setSelectedCardIndex((prev) => {
      const next = prev + 1
      if (next >= filteredObjects.length) return 0
      return next
    })
  }, [filteredObjects.length])

  const handleSelectPrevious = useCallback(() => {
    if (filteredObjects.length === 0) return
    setSelectedCardIndex((prev) => {
      if (prev <= 0) return filteredObjects.length - 1
      return prev - 1
    })
  }, [filteredObjects.length])

  const handleOpenSelected = useCallback(() => {
    if (selectedCardIndex >= 0 && selectedCardIndex < filteredObjects.length) {
      setSelectedObjectId(filteredObjects[selectedCardIndex].id)
    }
  }, [selectedCardIndex, filteredObjects])

  const handleSwitchView = useCallback(
    (index: number) => {
      if (index < project.views.length) {
        setActiveViewId(project.views[index].id)
        setSort(null)
      }
    },
    [project.views]
  )

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateNew: () => setCreateDialogOpen(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onSwitchView: handleSwitchView,
    onSelectNext: handleSelectNext,
    onSelectPrevious: handleSelectPrevious,
    onOpenSelected: handleOpenSelected,
    onEditSelected: handleOpenSelected,
    onClose: () => {
      if (selectedObjectId) {
        setSelectedObjectId(null)
      } else {
        setSelectedCardIndex(-1)
      }
    },
    onShowHelp: () => setShowShortcutsHelp(true),
    enabled: !createDialogOpen,
  })

  const handleCardClick = (object: ProjectObject) => {
    setSelectedObjectId(object.id)
  }

  const handleCreateClick = (statusId: string) => {
    setCreateDefaultStatus(statusId)
    setCreateDialogOpen(true)
  }

  const handleMoveObject = (objectId: string, newStatus: string) => {
    moveMutation.mutate({ objectId, status: newStatus })
  }

  const handleObjectCreated = () => {
    // Object created successfully, queries will be invalidated by the mutation
  }

  const handleViewChange = (viewId: string) => {
    setActiveViewId(viewId)
    // Reset sort when switching views
    setSort(null)
  }

  return (
    <>
      <PageHeader
        title={project.project.name}
        icon={<FolderKanban className="size-4 md:size-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/$projectId/design" params={{ projectId: params.projectId }}>
                <Settings2 className="size-4 mr-1" />
                Design
              </Link>
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="size-4 mr-1" />
              New item
            </Button>
          </div>
        }
      />
      <Main className="flex flex-col overflow-hidden">
        {/* View tabs and filters */}
        <div className="px-4 pt-2 space-y-3">
          <ViewTabs
            views={project.views}
            activeViewId={activeViewId}
            onViewChange={handleViewChange}
          />
          <FilterBar
            ref={searchInputRef}
            project={project}
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {activeView?.viewtype === 'list' ? (
            <div className="p-4">
              <ListView
                project={project}
                objects={filteredObjects}
                sort={sort}
                onSortChange={setSort}
                onCardClick={handleCardClick}
              />
            </div>
          ) : (
            <div className="p-4 overflow-x-auto">
              <BoardContainer
                project={project}
                objects={filteredObjects}
                statusField="status"
                onCardClick={handleCardClick}
                onCreateClick={handleCreateClick}
                onMoveObject={handleMoveObject}
              />
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedObjectId && (
          <ObjectDetailPanel
            projectId={params.projectId}
            objectId={selectedObjectId}
            project={project}
            onClose={() => setSelectedObjectId(null)}
          />
        )}
      </Main>

      <CreateObjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        project={project}
        templates={templates}
        defaultStatus={createDefaultStatus}
        onCreated={handleObjectCreated}
      />

      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </>
  )
}
