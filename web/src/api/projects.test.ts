// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
// The shared object/class/field client is asserted once in @mochi/web, in
// src/lib/entity-api.test.ts. What is left here is what only this app has,
// templates and the merge-request surface, plus this app's own wiring: its
// request module, its endpoint table, and the resource key its unsubscribe
// sends.
import { describe, it, expect, vi, beforeEach } from "vitest";
import projectsApi from "./projects";
import { projectsRequest } from "./request";

vi.mock("./request", () => ({
  projectsRequest: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("projectsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("wiring", () => {
    it("reads through this app's request module and the shared route table", async () => {
      const mockResponse = {
        data: { projects: [{ id: "1", fingerprint: "abc", name: "Project 1" }] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.list();

      expect(projectsRequest.get).toHaveBeenCalledWith("-/list");
      expect(result).toEqual(mockResponse);
    });

    it("resolves an entity route against the shared table", async () => {
      vi.mocked(projectsRequest.get).mockResolvedValue({ data: {} });

      await projectsApi.get("proj123");

      expect(projectsRequest.get).toHaveBeenCalledWith("proj123/-/info");
    });

    it("names the resource `project` when unsubscribing", async () => {
      vi.mocked(projectsRequest.post).mockResolvedValue({ data: { success: true } });

      await projectsApi.unsubscribe("proj123");

      expect(projectsRequest.post).toHaveBeenCalledWith("-/unsubscribe", {
        project: "proj123",
      });
    });
  });

  describe("create", () => {
    it("carries the template this app's create takes and crm's does not", async () => {
      vi.mocked(projectsRequest.post).mockResolvedValue({
        data: { id: "123", fingerprint: "abc123" },
      });

      await projectsApi.create({ name: "New Project", template: "simple" });

      expect(projectsRequest.post).toHaveBeenCalledWith("-/create", {
        name: "New Project",
        template: "simple",
      });
    });
  });

  describe("templates", () => {
    it("should fetch available templates", async () => {
      const mockResponse = {
        data: {
          templates: [
            { id: "simple", name: "Simple", description: "Basic project" },
          ],
        },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.templates();

      expect(projectsRequest.get).toHaveBeenCalledWith("-/templates");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("listRepositories", () => {
    it("should fetch available repositories", async () => {
      const mockResponse = {
        data: { repositories: [{ id: "repo1", name: "main-repo" }] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.listRepositories();

      expect(projectsRequest.get).toHaveBeenCalledWith("-/repositories");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getRepositoryBranches", () => {
    it("should fetch branches for a repository", async () => {
      const mockResponse = {
        data: { branches: ["main", "develop", "feature/test"] },
      };
      vi.mocked(projectsRequest.get).mockResolvedValue(mockResponse);

      const result = await projectsApi.getRepositoryBranches("repo1");

      expect(projectsRequest.get).toHaveBeenCalledWith(
        "-/repositories/repo1/branches",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("checkMerge", () => {
    it("should check merge compatibility", async () => {
      const mockResponse = {
        data: { can_merge: true, conflicts: [] },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.checkMerge(
        "repo1",
        "feature/test",
        "main",
      );

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "-/repositories/repo1/merge/check",
        { source: "feature/test", target: "main" },
      );
      expect(result.data.can_merge).toBe(true);
    });

    it("should return conflicts when merge is not possible", async () => {
      const mockResponse = {
        data: { can_merge: false, conflicts: ["file1.ts", "file2.ts"] },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.checkMerge(
        "repo1",
        "feature/conflict",
        "main",
      );

      expect(result.data.can_merge).toBe(false);
      expect(result.data.conflicts).toHaveLength(2);
    });
  });

  describe("getDiff", () => {
    it("should fetch diff between branches", async () => {
      const mockResponse = {
        data: "diff --git a/file1.ts b/file1.ts\n--- a/file1.ts\n+++ b/file1.ts\n@@ -1,3 +1,3 @@\n line1\n-old\n+new\n line3\n",
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.getDiff("repo1", "main", "feature/test");

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "-/repositories/repo1/diff",
        { base: "main", head: "feature/test" },
      );
      expect(result.data).toContain("diff --git");
    });
  });

  describe("merge", () => {
    it("should perform merge", async () => {
      const mockResponse = {
        data: { success: true, commit: "abc123" },
      };
      vi.mocked(projectsRequest.post).mockResolvedValue(mockResponse);

      const result = await projectsApi.merge(
        "repo1",
        "feature/test",
        "main",
        "Merge feature/test into main",
      );

      expect(projectsRequest.post).toHaveBeenCalledWith(
        "-/repositories/repo1/merge",
        {
          source: "feature/test",
          target: "main",
          message: "Merge feature/test into main",
        },
      );
      expect(result.data.success).toBe(true);
    });
  });
});
