// Mochi Projects: Object deep-link route
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useLingui } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  EntityLoadError,
  extractStatus,
  getErrorMessage,
} from "@mochi/web";
import { FolderKanban } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { ProjectPageContent } from "./index";

interface SearchParams {
  view?: string;
}

export const Route = createFileRoute("/_authenticated/$projectId/$objectId")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  loader: async ({ params }) => {
    try {
      const projectResponse = await projectsApi.get(params.projectId);
      return { project: projectResponse.data, loaderError: null };
    } catch (error) {
      const status = extractStatus(error);
      if (status === 403 || status === 404) {
        throw redirect({ to: "/" });
      }

      return {
        project: null as ProjectDetails | null,
        loaderError:
          getErrorMessage(error, t`Failed to load project`),
      };
    }
  },
  component: ObjectPage,
});

function ObjectPage() {
  const { t } = useLingui()
  const { project, loaderError } = Route.useLoaderData() as {
    project: ProjectDetails | null;
    loaderError: string | null;
  };
  const params = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();

  if (!project) {
    return (
      <EntityLoadError
        title={t`Project`}
        icon={<FolderKanban className="size-4 md:size-5" />}
        back={{ label: t`Back to projects`, onFallback: () => navigate({ to: "/" }) }}
        message={loaderError ?? t`Failed to load project`}
        onRetry={() => void router.invalidate()}
      />
    );
  }

  return (
    <ProjectPageContent
      project={project}
      projectId={params.projectId}
      search={search}
      initialObjectId={params.objectId}
    />
  );
}
