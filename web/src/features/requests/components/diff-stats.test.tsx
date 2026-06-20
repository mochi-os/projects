// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
// Tests for DiffStats component
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import { DiffStats } from "./diff-stats";
import projectsApi from "@/api/projects";

// Mock the API module
vi.mock("@/api/projects", () => ({
  default: {
    getDiff: vi.fn(),
  },
}));

// Helper to build a raw unified diff string
function makeDiff(
  files: { path: string; oldPath?: string; status?: string; lines: string[] }[],
): string {
  return files
    .map((f) => {
      const aPath = f.oldPath || f.path;
      let header = `diff --git a/${aPath} b/${f.path}\n`;
      if (f.status === "added") {
        header += `new file mode 100644\n--- /dev/null\n+++ b/${f.path}\n`;
      } else if (f.status === "deleted") {
        header += `deleted file mode 100644\n--- a/${f.path}\n+++ /dev/null\n`;
      } else if (f.status === "renamed") {
        header += `rename from ${aPath}\nrename to ${f.path}\n--- a/${aPath}\n+++ b/${f.path}\n`;
      } else {
        header += `--- a/${f.path}\n+++ b/${f.path}\n`;
      }
      header += `@@ -1,10 +1,10 @@\n`;
      header += f.lines.join("\n") + "\n";
      return header;
    })
    .join("");
}

describe("DiffStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when repoId is empty", () => {
    const { container } = render(
      <DiffStats repoId="" base="main" head="feature" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should return null when base is empty", () => {
    const { container } = render(
      <DiffStats repoId="repo1" base="" head="feature" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should return null when head is empty", () => {
    const { container } = render(
      <DiffStats repoId="repo1" base="main" head="" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should show loading state while fetching", async () => {
    vi.mocked(projectsApi.getDiff).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    expect(screen.getByText("Loading diff...")).toBeInTheDocument();
  });

  it("should show no changes message when diff is empty", async () => {
    vi.mocked(projectsApi.getDiff).mockResolvedValue({
      data: "",
    });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("No changes detected")).toBeInTheDocument();
    });
  });

  it("should display file count", async () => {
    const diff = makeDiff([
      { path: "file1.ts", lines: ["-old", "+new"] },
      { path: "file2.ts", status: "added", lines: ["+new line"] },
    ]);
    vi.mocked(projectsApi.getDiff).mockResolvedValue({ data: diff });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("2 files changed")).toBeInTheDocument();
    });
  });

  it("should display total additions and deletions", async () => {
    const diff = makeDiff([
      {
        path: "file1.ts",
        lines: ["-old1", "-old2", "+new1", "+new2", "+new3"],
      },
    ]);
    vi.mocked(projectsApi.getDiff).mockResolvedValue({ data: diff });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument(); // additions
      expect(screen.getByText("2")).toBeInTheDocument(); // deletions
    });
  });

  it("should display file paths", async () => {
    const diff = makeDiff([
      { path: "src/utils/helpers.ts", lines: ["-old", "+new"] },
      { path: "package.json", lines: ["-old", "+new"] },
    ]);
    vi.mocked(projectsApi.getDiff).mockResolvedValue({ data: diff });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("src/utils/helpers.ts")).toBeInTheDocument();
      expect(screen.getByText("package.json")).toBeInTheDocument();
    });
  });

  it("should display per-file additions", async () => {
    const diff = makeDiff([
      { path: "file1.ts", status: "added", lines: ["+line1", "+line2"] },
    ]);
    vi.mocked(projectsApi.getDiff).mockResolvedValue({ data: diff });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("+2")).toBeInTheDocument();
    });
  });

  it("should display per-file deletions", async () => {
    const diff = makeDiff([
      { path: "file1.ts", lines: ["-line1", "-line2", "-line3"] },
    ]);
    vi.mocked(projectsApi.getDiff).mockResolvedValue({ data: diff });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("-3")).toBeInTheDocument();
    });
  });

  it("should render status indicators for different file statuses", async () => {
    const diff = makeDiff([
      { path: "added.ts", status: "added", lines: ["+new"] },
      { path: "modified.ts", lines: ["-old", "+new"] },
      { path: "deleted.ts", status: "deleted", lines: ["-removed"] },
      { path: "renamed.ts", oldPath: "old.ts", status: "renamed", lines: [" context"] },
    ]);
    vi.mocked(projectsApi.getDiff).mockResolvedValue({ data: diff });

    render(<DiffStats repoId="repo1" base="main" head="feature" />);

    await waitFor(() => {
      expect(screen.getByText("added.ts")).toBeInTheDocument();
      expect(screen.getByText("modified.ts")).toBeInTheDocument();
      expect(screen.getByText("deleted.ts")).toBeInTheDocument();
      expect(screen.getByText("renamed.ts")).toBeInTheDocument();
    });
  });
});
