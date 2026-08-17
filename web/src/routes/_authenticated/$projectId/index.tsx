// Mochi Projects: Project page with board and tree views
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The page body is EntityObjectsPage in @mochi/web, shared with the crm app.
// What stays here is the route, the loader, the wording, and the bindings the
// shared page renders through its slots.

import { useEffect } from "react";
import { useLingui } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import {
  DropdownMenuItem,
  EntityObjectsPage,
  GeneralError,
  extractStatus,
  getErrorMessage,
  Main,
  PageHeader,
  toast,
} from "@mochi/web";
import { FolderKanban, Settings, Settings2 } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectObject } from "@/types";
import { useProjectsStore } from "@/stores/projects-store";
import { BoardContainer } from "@/features/board/components";
import { TreeView } from "@/features/tree";
import {
  CreateObjectDialog,
  ObjectDetailPanel,
} from "@/features/objects/components";
import { ViewOptionsBar } from "@/components/view-options-bar";

interface SearchParams {
  view?: string;
}

export const Route = createFileRoute("/_authenticated/$projectId/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  loader: async ({ params }) => {
    try {
      const projectResponse = await projectsApi.get(params.projectId);
      return { project: projectResponse.data, loaderError: null, loaderStatus: null };
    } catch (error) {
      const status = extractStatus(error);
      if (status === 403) {
        return { project: null as ProjectDetails | null, loaderError: null, loaderStatus: 403 };
      }
      if (status === 404) {
        throw redirect({ to: "/" });
      }

      return {
        project: null as ProjectDetails | null,
        loaderError: getErrorMessage(error, t`Failed to load project`),
        loaderStatus: status,
      };
    }
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { t } = useLingui()
  const { project, loaderError, loaderStatus } = Route.useLoaderData() as {
    project: ProjectDetails | null;
    loaderError: string | null;
    loaderStatus: number | null;
  };
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (loaderStatus === 403) {
      toast.error(t`You don't have access to this project.`);
      void navigate({ to: "/" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loaderStatus === 403) return null;

  if (!project) {
    return (
      <>
        <PageHeader
          title={t`Project`}
          icon={<FolderKanban className="size-4 md:size-5" />}
          back={{ label: t`Back to projects`, onFallback: () => navigate({ to: "/" }) }}
        />
        <Main>
          <GeneralError
            error={new Error(loaderError ?? "Failed to load project")}
            minimal
            mode="inline"
            reset={() => void router.invalidate()}
          />
        </Main>
      </>
    );
  }

  return (
    <ProjectPageContent
      project={project}
      projectId={params.projectId}
      search={search}
    />
  );
}

export interface ProjectPageContentProps {
  project: ProjectDetails;
  projectId: string;
  search: SearchParams;
  initialObjectId?: string;
}

export function ProjectPageContent({ project, projectId, search, initialObjectId }: ProjectPageContentProps) {
  const { t } = useLingui()
  const navigate = useNavigate();
  const refreshSidebar = useProjectsStore((state) => state.refresh);

  return (
    <EntityObjectsPage<ProjectObject>
      design={project}
      container={project.project}
      containerId={projectId}
      search={search}
      initialObjectId={initialObjectId}
      icon={FolderKanban}
      api={projectsApi}
      entity="project"
      storagePrefix="projects"
      listKey="projects"
      backupSlug="projects"
      refreshSidebar={refreshSidebar}
      onLeave={() => void navigate({ to: "/" })}
      showSidebarTrigger
      labels={{
        pageActions: t`Open page actions`,
        createShort: t`New`,
        // The lowercased name goes through a variable, so the extracted message
        // keeps the named placeholder this app already ships.
        createAction: (name) => {
          if (!name) return t`New`;
          const className = name.toLowerCase();
          return t`New ${className}`;
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
        shareAction: t`Link`,
        shareTitle: t`Project link`,
        shareFailed: t`Failed to create link`,
        unsubscribe: t`Unsubscribe`,
        unsubscribeTitle: t`Unsubscribe from project?`,
        unsubscribeDescription: t`This will remove "${project.project.name}" from your sidebar and stop updates for this project.`,
        unsubscribing: t`Unsubscribing...`,
        unsubscribed: t`Unsubscribed`,
        unsubscribeFailed: t`Failed to unsubscribe`,
      }}
      designMenuItem={
        <DropdownMenuItem asChild>
          <Link to="/$projectId/design" params={{ projectId }}>
            <Settings2 className="size-4 me-2" />
            {t`Design`}
          </Link>
        </DropdownMenuItem>
      }
      settingsMenuItem={
        <DropdownMenuItem asChild>
          <Link to="/$projectId/settings" params={{ projectId }}>
            <Settings className="size-4 me-2" />
            {t`Settings`}
          </Link>
        </DropdownMenuItem>
      }
      renderViewOptionsBar={(props) => <ViewOptionsBar project={project} {...props} />}
      renderBoard={(props) => <BoardContainer project={project} {...props} />}
      renderTree={(props) => (
        <TreeView project={project} projectId={projectId} {...props} />
      )}
      renderCreateDialog={(props) => (
        <CreateObjectDialog projectId={projectId} project={project} {...props} />
      )}
      renderDetailPanel={({ objectId, onClose }) => (
        <ObjectDetailPanel
          projectId={projectId}
          objectId={objectId}
          project={project}
          access={project.project.access}
          onClose={onClose}
        />
      )}
    />
  );
}
