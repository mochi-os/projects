// Mochi Projects: Project page body, shared by the project and item routes
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// The page body is EntityObjectsPage in @mochi/web, shared with the CRM
// app. What lives here is the wording and the bindings the shared page
// renders through its slots. The routes keep the loader.
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import type { ProjectDetails, ProjectObject } from '@/types'
import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  DropdownMenuItem,
  EntityObjectsPage,
  EntityObjectDetailPanel,
  absoluteRouteUrl,
  type EntityObjectDetailTab,
  canWrite,
  DISALLOWED_NAME_CHARS,
} from '@mochi/web'
import { FolderKanban, GitMerge, Settings, Settings2 } from 'lucide-react'
import projectsApi from '@/api/projects'
import { useProjectsStore } from '@/stores/projects-store'
import { useShareLabels } from '@/lib/share-labels'
import { ViewOptionsBar } from '@/components/view-options-bar'
import { BoardContainer } from '@/features/board/components'
import { CreateObjectDialog } from '@/features/objects/components'
import { RequestPanel } from '@/features/requests/components/request-panel'
import { TreeView } from '@/features/tree'

interface SearchParams {
  view?: string
}

interface ProjectPageContentProps {
  project: ProjectDetails
  projectId: string
  search: SearchParams
  initialObjectId?: string
}

export function ProjectPageContent({
  project,
  projectId,
  search,
  initialObjectId,
}: ProjectPageContentProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const router = useRouter()
  const refreshSidebar = useProjectsStore((state) => state.refresh)
  const share = useShareLabels()

  return (
    <EntityObjectsPage<ProjectObject>
      design={project}
      container={project.project}
      containerId={projectId}
      search={search}
      initialObjectId={initialObjectId}
      icon={FolderKanban}
      api={projectsApi}
      entity='project'
      storagePrefix='projects'
      listKey='projects'
      backupSlug='projects'
      refreshSidebar={refreshSidebar}
      onLeave={() => void navigate({ to: '/' })}
      shareUrl={() =>
        absoluteRouteUrl(router, {
          to: '/$projectId',
          params: { projectId },
        })
      }
      labels={{
        pageActions: t`Open page actions`,
        createShort: t`New`,
        // The lowercased name goes through a variable, so the extracted message
        // keeps the named placeholder this app already ships.
        createAction: (name) => {
          if (!name) return t`New`
          const className = name.toLowerCase()
          return t`New ${className}`
        },
        noClasses: t`Please add one or more classes to the project design.`,
        viewOptions: t`View options`,
        addColumn: t`Add column`,
        reorderColumns: t`Re-order columns`,
        reorderHint: t`Drag columns to re-order them`,
        cancel: t`Cancel`,
        save: t`Save`,
        boardHint: t`Double click on a column to add content`,
        dismissBoardHint: t`Dismiss board hint`,
        exportData: t`Export data`,
        loading: t`Loading...`,
        downloaded: (filename) => t`Downloaded ${filename}`,
        exportFailed: t`Failed to export data`,
        share,
        moveFailed: t`Failed to move`,
        columnCreateFailed: t`Failed to add column`,
        columnRenameFailed: t`Failed to rename column`,
        columnDeleteFailed: t`Failed to delete column`,
        columnReorderFailed: t`Failed to re-order columns`,
        unsubscribe: t`Unsubscribe`,
        unsubscribeTitle: t`Unsubscribe from project?`,
        unsubscribeDescription: t`This will remove "${project.project.name}" from your sidebar and stop updates for this project.`,
        unsubscribing: t`Unsubscribing...`,
        unsubscribed: t`Unsubscribed`,
        unsubscribeFailed: t`Failed to unsubscribe`,
      }}
      // Copy runs the backup export and the create-from-backup import as
      // one step. A failed import removes the half-made copy.
      duplicate={{
        menuAction: t`Copy`,
        api: projectsApi,
        create: async (name, privacy) => {
          const response = await projectsApi.create({
            name,
            // Keeps the original's readable ids (PREFIX-1) and starts
            // blank: the import brings the design.
            prefix: project.project.prefix,
            // The import does not carry the description, so it is set here.
            description: project.project.description,
            template: 'blank',
            privacy,
          })
          const id = response.data?.fingerprint
          if (!id) throw new Error(t`Failed to copy project`)
          return id
        },
        remove: (id) => projectsApi.delete(id),
        onDuplicated: (id) => {
          void refreshSidebar()
          void navigate({ to: '/$projectId', params: { projectId: id } })
        },
        validateName: (name) => {
          if (!name.trim()) return t`Project name is required`
          if (name.length > 1000) return t`Name must be 1000 characters or less`
          if (DISALLOWED_NAME_CHARS.test(name))
            return t`Name cannot contain < or > characters`
          return null
        },
        labels: {
          title: t`Copy project`,
          name: t`Name`,
          everything: t`Everything`,
          designOnly: t`Design only`,
          allowSearch: t`Allow anyone to view and comment on project`,
          cancel: t`Cancel`,
          confirm: t`Copy`,
          duplicating: t`Copying project...`,
          duplicated: t`Project copied`,
          failed: t`Failed to copy project`,
          defaultName: (name) => t`Copy of ${name}`,
          leftBehind: t`Could not remove the unfinished copy`,
          incomplete: t`The copy may be incomplete. Check it before you use it.`,
        },
      }}
      designMenuItem={
        <DropdownMenuItem asChild>
          <Link to='/$projectId/design' params={{ projectId }}>
            <Settings2 className='me-2 size-4' />
            {t`Design`}
          </Link>
        </DropdownMenuItem>
      }
      settingsMenuItem={
        <DropdownMenuItem asChild>
          <Link to='/$projectId/settings' params={{ projectId }}>
            <Settings className='me-2 size-4' />
            {t`Settings`}
          </Link>
        </DropdownMenuItem>
      }
      renderViewOptionsBar={(props) => (
        <ViewOptionsBar project={project} {...props} />
      )}
      renderBoard={(props) => <BoardContainer project={project} {...props} />}
      renderTree={(props) => (
        <TreeView project={project} projectId={projectId} {...props} />
      )}
      renderCreateDialog={(props) => (
        <CreateObjectDialog
          projectId={projectId}
          project={project}
          {...props}
        />
      )}
      renderDetailPanel={({ objectId, onCopy, onClose }) => (
        <EntityObjectDetailPanel
          containerId={projectId}
          objectId={objectId}
          design={project}
          access={project.project.access}
          api={projectsApi}
          prefix={project.project.prefix}
          extraTabs={(detail) => {
            // Only classes that opted into merge requests get the tab. The
            // flag lives on the class, so it is read off the object's own.
            const cls = project.classes.find(
              (c) => c.id === detail.object.class
            )
            if (!cls?.requests?.includes('merge')) return []
            const requests = detail.requests ?? []
            // Destructured, not `requests.length`: lingui names a placeholder
            // after the identifier it sees, so a member expression extracts as
            // `Merge requests ({0})` and drops every existing translation.
            const requestCount = requests.length
            const tab: EntityObjectDetailTab = {
              id: 'requests',
              label: t`Merge requests (${requestCount})`,
              icon: <GitMerge className='size-4' />,
              content: (
                <RequestPanel
                  projectId={projectId}
                  objectId={detail.object.id}
                  requests={requests}
                  objectTitle={
                    (cls.title ? detail.values[cls.title] : '') ||
                    detail.object.readable
                  }
                  objectReadable={detail.object.readable}
                  readOnly={!canWrite(project.project.access)}
                />
              ),
            }
            return [tab]
          }}
          itemUrl={(objectId) =>
            absoluteRouteUrl(router, {
              to: '/$projectId/$objectId',
              params: { projectId, objectId },
            })
          }
          labels={{
            copyLink: t`Copy link`,
            // The server deletes everything under an item with it.
            deleteWithChildren: (title, count) =>
              t`Are you sure you want to delete "${title}" and the ${plural(count, { one: '# item', other: '# items' })} under it? This action cannot be undone.`,
          }}
          onCopy={onCopy}
          onClose={onClose}
        />
      )}
    />
  )
}
