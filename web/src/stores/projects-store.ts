import { create } from "zustand";
import { getErrorMessage } from "@mochi/web";
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
      set({ error: getErrorMessage(error, "Failed to load projects"), isLoading: false });
    }
  },
}));
