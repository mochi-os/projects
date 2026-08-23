// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings -- vitest names and URL literals are not user-facing */
import { describe, it, expect } from "vitest";
import { diffUrl } from "./diff";

const request = { repository: "r1", source: "feature", target: "main" };

describe("diffUrl", () => {
  it("carries the project segment the route declares", () => {
    // routeTree.gen.ts routes the page at /$projectId/diff. Without the
    // project the path matches /$projectId with projectId "diff".
    expect(diffUrl("/projects", "p1", request)).toBe(
      "/projects/p1/diff?repo=r1&source=feature&target=main",
    );
  });

  it("puts the project before diff, not after", () => {
    const url = new URL(diffUrl("/projects", "p1", request), "https://example.test");
    expect(url.pathname.split("/").filter(Boolean)).toEqual(["projects", "p1", "diff"]);
  });

  it("escapes branch names that carry URL punctuation", () => {
    expect(
      diffUrl("/projects", "p1", {
        repository: "r 1",
        source: "feature/a&b",
        target: "release/1.0",
      }),
    ).toBe("/projects/p1/diff?repo=r%201&source=feature%2Fa%26b&target=release%2F1.0");
  });

  it("keeps working under a non-root app path", () => {
    expect(diffUrl("/9fL2xQm4T", "p1", request)).toBe(
      "/9fL2xQm4T/p1/diff?repo=r1&source=feature&target=main",
    );
  });
});
