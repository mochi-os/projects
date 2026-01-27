import { create } from "zustand";
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
    } catch (_err) {
      set({ error: "Failed to load projects", isLoading: false });
    }
  },
}));
