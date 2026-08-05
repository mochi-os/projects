// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import {
  InlineEntitySearch,
  toastAction,
  getErrorMessage,
  type InlineEntitySearchItem,
} from "@mochi/web";
import projectsApi from "@/api/projects";
import { useProjectsStore } from "@/stores/projects-store";

interface DirectoryEntry extends InlineEntitySearchItem {
  fingerprint: string;
  location?: string;
  /** owner's peer from a mochi:// share-link probe; subscribe pins the same peer. */
  peer?: string;
}

interface InlineProjectSearchProps {
  subscribedIds: Set<string>;
  onRefresh?: () => void;
}

export function InlineProjectSearch({
  subscribedIds,
  onRefresh,
}: InlineProjectSearchProps) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const refresh = useProjectsStore((state) => state.refresh);

  const search = async (query: string): Promise<DirectoryEntry[]> => {
    const response = await projectsApi.search({ search: query });
    return response.data ?? [];
  };

  const probe = async (url: string): Promise<DirectoryEntry[]> => {
    const probed = await projectsApi.probe(url);
    const data = probed?.data;
    return data?.id
      ? [
          {
            id: data.id,
            name: data.name ?? "",
            fingerprint: data.fingerprint ?? "",
            location: data.server ?? "",
            peer: data.peer,
          },
        ]
      : [];
  };

  const handleSubscribe = async (project: DirectoryEntry) => {
    await toastAction(
      projectsApi.subscribe(
        project.id,
        project.location || undefined,
        project.peer,
      ),
      {
        loading: t`Subscribing...`,
        success: t`Subscribed`,
        error: (e) => getErrorMessage(e, t`Failed to subscribe`),
      },
    );
    void refresh();
    onRefresh?.();
    void navigate({
      to: "/$projectId",
      params: { projectId: project.fingerprint || project.id },
    });
  };

  return (
    <InlineEntitySearch
      subscribedIds={subscribedIds}
      search={search}
      probe={probe}
      onSubscribe={handleSubscribe}
      icon={FolderKanban}
      placeholder={t`Search for projects...`}
      emptyMessage={t`No projects found`}
      searchErrorMessage={t`Failed to search projects`}
      subscribeLabel={t`Subscribe`}
    />
  );
}
