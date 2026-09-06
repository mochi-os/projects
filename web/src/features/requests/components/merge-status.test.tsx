// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { MergeStatus } from "./merge-status";
import projectsApi from "@/api/projects";

vi.mock("@/api/projects", () => ({
  default: {
    checkMerge: vi.fn(),
  },
}));

describe("MergeStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports a clean merge", async () => {
    vi.mocked(projectsApi.checkMerge).mockResolvedValue({
      data: { mergeable: true, conflicts: [], ahead: 2, behind: 0 },
    });
    render(<MergeStatus repositoryId="repo1" source="feature" target="main" />);
    expect(await screen.findByText("Ready to merge")).toBeInTheDocument();
  });

  it("shows the service's own error instead of a verdict on the branches", async () => {
    // mergeable is false in the fallback answer, but the branches were never
    // compared: "Cannot merge automatically" was a claim about the wrong thing.
    vi.mocked(projectsApi.checkMerge).mockResolvedValue({
      data: { mergeable: false, conflicts: [], ahead: 0, behind: 0, error: "Repositories service unavailable" },
    });
    render(<MergeStatus repositoryId="repo1" source="feature" target="main" />);
    expect(await screen.findByText("Repositories service unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Cannot merge automatically")).not.toBeInTheDocument();
  });
});
