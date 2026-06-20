// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
// Tests for the projects store
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProjectsStore } from "./projects-store";
import type { Project } from "@/types";

// Mock the API module
vi.mock("@/api/projects", () => ({
  default: {
    list: vi.fn(),
  },
}));

import projectsApi from "@/api/projects";

describe("useProjectsStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useProjectsStore.setState({
      projects: [],
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it("should have correct initial state", () => {
    const state = useProjectsStore.getState();

    expect(state.projects).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should set loading state when refreshing", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: { projects: [] },
    });

    const refreshPromise = useProjectsStore.getState().refresh();

    // Should be loading immediately
    expect(useProjectsStore.getState().isLoading).toBe(true);

    await refreshPromise;

    // Should not be loading after completion
    expect(useProjectsStore.getState().isLoading).toBe(false);
  });

  it("should load projects successfully", async () => {
    const mockProjects: Project[] = [
      {
        id: "1",
        fingerprint: "abc123",
        name: "Project 1",
        description: "",
        prefix: "P1",
        owner: 1,
        ownername: "testuser",
        server: "local",
        created: Date.now(),
        updated: Date.now(),
        access: "owner",
      },
      {
        id: "2",
        fingerprint: "def456",
        name: "Project 2",
        description: "Test project",
        prefix: "P2",
        owner: 1,
        ownername: "testuser",
        server: "local",
        created: Date.now(),
        updated: Date.now(),
        access: "owner",
      },
    ];

    vi.mocked(projectsApi.list).mockResolvedValue({
      data: { projects: mockProjects },
    });

    await useProjectsStore.getState().refresh();

    const state = useProjectsStore.getState();
    expect(state.projects).toEqual(mockProjects);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should handle API errors", async () => {
    vi.mocked(projectsApi.list).mockRejectedValue(new Error("Network error"));

    await useProjectsStore.getState().refresh();

    const state = useProjectsStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Failed to load projects");
  });

  it("should handle empty projects list", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: { projects: [] },
    });

    await useProjectsStore.getState().refresh();

    const state = useProjectsStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.error).toBeNull();
  });

  it("should handle missing projects array gracefully", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: { projects: undefined as unknown as [] },
    });

    await useProjectsStore.getState().refresh();

    const state = useProjectsStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.error).toBeNull();
  });
});
