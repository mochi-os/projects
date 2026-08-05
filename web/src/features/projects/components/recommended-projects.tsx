// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { Trans, useLingui } from "@lingui/react/macro";
import { FolderKanban } from "lucide-react";
import {
  RecommendedEntities,
  toastAction,
  getErrorMessage,
  type RecommendedEntityItem,
} from "@mochi/web";
import projectsApi from "@/api/projects";

interface RecommendedProjectsProps {
  subscribedIds: Set<string>;
  onSubscribe: () => void;
}

interface RecommendedProject extends RecommendedEntityItem {
  blurb: string;
  fingerprint: string;
  server: string;
}

export function RecommendedProjects({
  subscribedIds,
  onSubscribe,
}: RecommendedProjectsProps) {
  const { t } = useLingui();

  const load = async (): Promise<RecommendedProject[]> => {
    const response = await projectsApi.recommendations();
    return response.data?.projects ?? [];
  };

  const handleSubscribe = async (project: RecommendedProject) => {
    await toastAction(
      projectsApi.subscribe(project.id, project.server || undefined),
      {
        loading: t`Subscribing...`,
        success: t`Subscribed to ${project.name}`,
        error: (e) => getErrorMessage(e, t`Failed to subscribe`),
      },
    );
    onSubscribe();
  };

  return (
    <RecommendedEntities
      subscribedIds={subscribedIds}
      load={load}
      onSubscribe={handleSubscribe}
      icon={FolderKanban}
      title={<Trans>Recommended projects</Trans>}
      errorMessage={t`Failed to load recommended projects`}
      subscribeLabel={t`Subscribe`}
    />
  );
}
