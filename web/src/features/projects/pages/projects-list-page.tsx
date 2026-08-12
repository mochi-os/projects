// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { EntityListPage } from "@mochi/web/components/entity/entity-list-page";
import { FolderKanban } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useSidebarContext } from "@/context/sidebar-context";
import { InlineProjectSearch } from "../components/inline-project-search";
import { RecommendedProjects } from "../components/recommended-projects";
import projectsApi from "@/api/projects";

export function ProjectsListPage() {
  const { t } = useLingui();
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const error = useProjectsStore((state) => state.error);
  const refresh = useProjectsStore((state) => state.refresh);
  const { openCreateDialog } = useSidebarContext();

  return (
    <EntityListPage
      rows={projects}
      isLoading={isLoading}
      error={error}
      refresh={refresh}
      icon={FolderKanban}
      onCreate={openCreateDialog}
      unsubscribe={(projectId) => projectsApi.unsubscribe(projectId)}
      invalidateKey="projects"
      labels={{
        title: t`Projects`,
        emptyDescription: t`You have no projects yet.`,
        createAction: t`Create a new project`,
        rowActions: t`Project actions`,
        unsubscribe: t`Unsubscribe`,
        unsubscribeConfirmation: t`Are you sure you want to unsubscribe from this project?`,
        unsubscribing: t`Unsubscribing...`,
        unsubscribed: t`Unsubscribed`,
        unsubscribeFailed: t`Failed to unsubscribe`,
      }}
      renderLink={(project, className) => (
        <Link
          preload={false}
          to="/$projectId"
          params={{ projectId: project.fingerprint }}
          className={className}
        >
          <span className="sr-only">
            <Trans>Open {project.name}</Trans>
          </span>
        </Link>
      )}
      renderSearch={(subscribedIds) => (
        <InlineProjectSearch subscribedIds={subscribedIds} />
      )}
      renderRecommended={(subscribedIds) => (
        <RecommendedProjects
          subscribedIds={subscribedIds}
          onSubscribe={() => void refresh()}
        />
      )}
    />
  );
}
