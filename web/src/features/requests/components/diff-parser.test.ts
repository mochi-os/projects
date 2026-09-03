// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
import { describe, it, expect } from "vitest";
import { parseDiff } from "./diff-parser";

const hunk =
  "diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,2 +1,2 @@\n-old\n+new\n context\n";
const large = "diff --git a/big.bin b/big.bin\n# not compared: over the 1048576 byte limit\n";
const binary = "diff --git a/i.png b/i.png\nBinary files a/i.png and b/i.png differ\n";

describe("parseDiff", () => {
  it("keeps a file core did not compare, with the ceiling it names", () => {
    const { files, truncated } = parseDiff(hunk + large);
    expect(files.map((f) => f.path)).toEqual(["src/a.ts", "big.bin"]);
    expect(files[1]).toMatchObject({
      skipped: true,
      limit: 1048576,
      hunks: [],
      additions: 0,
      deletions: 0,
      isBinary: false,
    });
    expect(files[0].skipped).toBe(false);
    expect(truncated).toBe(0);
  });

  it("reports the truncation count and keeps the marker out of the last hunk", () => {
    const { files, truncated } = parseDiff(hunk + "# diff truncated: 12 more files\n");
    expect(truncated).toBe(12);
    expect(files).toHaveLength(1);
    const contents = files[0].hunks[0].lines.map((l) => l.content);
    expect(contents.some((c) => c.includes("diff truncated"))).toBe(false);
    expect(contents).toHaveLength(4);
  });

  it("reports a diff that is nothing but the marker", () => {
    expect(parseDiff("# diff truncated: 3 more files\n")).toEqual({ files: [], truncated: 3 });
  });

  it("keeps a binary file, and a complete diff reports no truncation", () => {
    const { files, truncated } = parseDiff(binary + hunk);
    expect(files.map((f) => [f.path, f.isBinary, f.skipped])).toEqual([
      ["i.png", true, false],
      ["src/a.ts", false, false],
    ]);
    expect(truncated).toBe(0);
  });
});
