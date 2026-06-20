// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { create } from "zustand";
import { getErrorMessage } from "@mochi/web";
import { t } from '@lingui/core/macro'
import type { Project } from "@/types";
import projectsApi from "@/api/projects";

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>()((set) => ({
  projects: [],
  isLoading: false,
  error: null,

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsApi.list();
      const projects = response.data?.projects ?? [];
      set({ projects, isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error, t`Failed to load projects`), isLoading: false });
    }
  },
}));
