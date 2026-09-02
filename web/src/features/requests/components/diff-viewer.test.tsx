// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { DiffViewer } from "./diff-viewer";

const hunk = "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-x\n+y\n";

describe("DiffViewer", () => {
  it("shows a placeholder for a file core did not compare", () => {
    render(
      <DiffViewer
        diff={"diff --git a/big.bin b/big.bin\n# not compared: over the 1048576 byte limit\n"}
        viewStyle="unified"
      />,
    );
    expect(screen.getByText("big.bin")).toBeInTheDocument();
    expect(screen.getByText(/Not compared: larger than/)).toBeInTheDocument();
    expect(screen.queryByText("No changes to display")).not.toBeInTheDocument();
  });

  it("says how many files core cut, and does not render the marker as a line", () => {
    render(<DiffViewer diff={hunk + "# diff truncated: 12 more files\n"} viewStyle="unified" />);
    expect(screen.getByText("12 more files not shown")).toBeInTheDocument();
    expect(screen.queryByText(/diff truncated/)).not.toBeInTheDocument();
  });

  it("does not report no changes when only the marker survived", () => {
    render(<DiffViewer diff={"# diff truncated: 3 more files\n"} viewStyle="unified" />);
    expect(screen.getByText("3 more files not shown")).toBeInTheDocument();
    expect(screen.queryByText("No changes to display")).not.toBeInTheDocument();
  });
});
