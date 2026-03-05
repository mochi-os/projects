export interface DiffFile {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed";
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "context" | "add" | "remove" | "header";
  content: string;
  oldNum?: number;
  newNum?: number;
}

// Parse raw unified diff text into structured file sections
export function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileSections = raw.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split("\n");
    const headerLine = lines[0] || "";

    // Extract file paths from "a/path b/path"
    const pathMatch = headerLine.match(/a\/(.+?) b\/(.+)/);
    const oldPath = pathMatch?.[1] || "";
    const newPath = pathMatch?.[2] || oldPath;

    // Determine status from diff headers
    let status: DiffFile["status"] = "modified";
    const headerText = lines.slice(0, 6).join("\n");
    if (headerText.includes("new file mode")) {
      status = "added";
    } else if (headerText.includes("deleted file mode")) {
      status = "deleted";
    } else if (headerText.includes("rename from")) {
      status = "renamed";
    }

    // Parse hunks
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let oldNum = 0;
    let newNum = 0;
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
        if (match) {
          oldNum = parseInt(match[1], 10);
          newNum = parseInt(match[2], 10);
          currentHunk = {
            header: line,
            lines: [{ type: "header", content: line }],
          };
          hunks.push(currentHunk);
        }
      } else if (currentHunk) {
        if (line.startsWith("+")) {
          currentHunk.lines.push({
            type: "add",
            content: line.substring(1),
            newNum: newNum++,
          });
          additions++;
        } else if (line.startsWith("-")) {
          currentHunk.lines.push({
            type: "remove",
            content: line.substring(1),
            oldNum: oldNum++,
          });
          deletions++;
        } else if (line.startsWith("\\")) {
          // "\ No newline at end of file" - skip
        } else {
          // Context line (starts with space or is empty within a hunk)
          currentHunk.lines.push({
            type: "context",
            content: line.substring(1),
            oldNum: oldNum++,
            newNum: newNum++,
          });
        }
      }
    }

    if (hunks.length > 0) {
      files.push({
        path: newPath,
        oldPath: oldPath !== newPath ? oldPath : undefined,
        status,
        hunks,
        additions,
        deletions,
      });
    }
  }

  return files;
}
