// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
// The shared object/class/field routes are asserted once in @mochi/web, in
// lib/entity-endpoints.test.ts. What is left here is what only projects has:
// templates, merge requests, diff preferences and the repository integration
// behind them.
import { describe, it, expect } from "vitest";
import { entityEndpoints } from "@mochi/web";
import endpoints from "./endpoints";

describe("endpoints.projects", () => {
  it("carries the shared entity table", () => {
    for (const [name, route] of Object.entries(entityEndpoints)) {
      expect(endpoints.projects[name as keyof typeof entityEndpoints]).toBe(
        route,
      );
    }
  });

  describe("template and repository endpoints", () => {
    it("should have templates endpoint", () => {
      expect(endpoints.projects.templates).toBe("-/templates");
    });

    it("should have repositories endpoint", () => {
      expect(endpoints.projects.repositories).toBe("-/repositories");
    });
  });

  describe("request endpoints", () => {
    it("should generate requests list endpoint", () => {
      expect(endpoints.projects.requests("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/requests",
      );
    });

    it("should generate request create endpoint", () => {
      expect(endpoints.projects.requestCreate("proj1", "obj1")).toBe(
        "proj1/-/objects/obj1/requests/create",
      );
    });

    it("should generate request update endpoint", () => {
      expect(endpoints.projects.requestUpdate("proj1", "obj1", "req1")).toBe(
        "proj1/-/objects/obj1/requests/req1/update",
      );
    });

    it("should generate request delete endpoint", () => {
      expect(endpoints.projects.requestDelete("proj1", "obj1", "req1")).toBe(
        "proj1/-/objects/obj1/requests/req1/delete",
      );
    });
  });

  describe("diff preference endpoints", () => {
    it("should have diff preference endpoints", () => {
      expect(endpoints.projects.diffPreference).toBe("-/diff/preference");
      expect(endpoints.projects.diffPreferenceSet).toBe(
        "-/diff/preference/set",
      );
    });
  });

  describe("repository integration endpoints", () => {
    it("should generate repository branches endpoint", () => {
      expect(endpoints.projects.repositoryBranches("repo1")).toBe(
        "-/repositories/repo1/branches",
      );
    });

    it("should generate repository merge check endpoint", () => {
      expect(endpoints.projects.repositoryMergeCheck("repo1")).toBe(
        "-/repositories/repo1/merge/check",
      );
    });

    it("should generate repository diff endpoint", () => {
      expect(endpoints.projects.repositoryDiff("repo1")).toBe(
        "-/repositories/repo1/diff",
      );
    });

    it("should generate repository merge endpoint", () => {
      expect(endpoints.projects.repositoryMerge("repo1")).toBe(
        "-/repositories/repo1/merge",
      );
    });
  });
});
