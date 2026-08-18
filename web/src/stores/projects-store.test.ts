// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
// The store behaviour is asserted once in @mochi/web
// (create-entity-list-store.test.ts). What is left here is this app's wiring:
// the list call it makes and the key it reads the rows out of.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProjectsStore } from "./projects-store";

vi.mock("@/api/projects", () => ({
  default: {
    list: vi.fn(),
  },
}));

import projectsApi from "@/api/projects";

describe("useProjectsStore wiring", () => {
  beforeEach(() => {
    useProjectsStore.setState({ rows: [], isLoading: false, error: null });
    vi.clearAllMocks();
  });

  it("reads the rows out of the `projects` key this app's server answers under", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: {
        projects: [
          {
            id: "1",
            fingerprint: "abc",
            name: "Project 1",
            description: "",
            owner: 1,
            ownername: "me",
            server: "",
            created: 0,
            updated: 0,
            populated: 1,
            access: "owner",
            prefix: "PROJ",
          },
        ],
      },
    });

    await useProjectsStore.getState().refresh();

    expect(projectsApi.list).toHaveBeenCalled();
    expect(useProjectsStore.getState().rows).toHaveLength(1);
  });

  it("falls back to this app's wording when a load fails without a message", async () => {
    vi.mocked(projectsApi.list).mockRejectedValue(new Error(""));

    await useProjectsStore.getState().refresh();

    expect(useProjectsStore.getState().error).toBe("Failed to load projects");
  });
});
