// Mochi Projects: Diff viewer component
// Copyright Alistair Cunningham 2026

import { useState, useMemo, type ReactNode } from "react";
import { diffWords } from "diff";
import { ChevronDown, ChevronRight, FileCode2, Plus, Minus } from "lucide-react";
import { cn } from "@mochi/common";

interface DiffViewerProps {
  diff: string;
  viewStyle: "unified" | "split";
}

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

interface DiffLine {
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

// Pair consecutive remove/add lines for intra-line highlighting
function pairLines(lines: DiffLine[]): { removes: DiffLine[]; adds: DiffLine[]; contexts: DiffLine[] }[] {
  const groups: { removes: DiffLine[]; adds: DiffLine[]; contexts: DiffLine[] }[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.type === "header") {
      i++;
      continue;
    }
    if (line.type === "context") {
      groups.push({ removes: [], adds: [], contexts: [line] });
      i++;
    } else if (line.type === "remove") {
      const removes: DiffLine[] = [];
      while (i < lines.length && lines[i].type === "remove") {
        removes.push(lines[i]);
        i++;
      }
      const adds: DiffLine[] = [];
      while (i < lines.length && lines[i].type === "add") {
        adds.push(lines[i]);
        i++;
      }
      groups.push({ removes, adds, contexts: [] });
    } else if (line.type === "add") {
      const adds: DiffLine[] = [];
      while (i < lines.length && lines[i].type === "add") {
        adds.push(lines[i]);
        i++;
      }
      groups.push({ removes: [], adds, contexts: [] });
    } else {
      i++;
    }
  }

  return groups;
}

// Render a line with intra-line word highlighting
function IntraLineHighlight({
  oldContent,
  newContent,
  side,
}: {
  oldContent: string;
  newContent: string;
  side: "old" | "new";
}) {
  const changes = diffWords(oldContent, newContent);

  return (
    <span>
      {changes.map((change, i) => {
        if (change.added) {
          if (side === "new") {
            return (
              <span key={i} className="bg-green-300/60 dark:bg-green-500/40">
                {change.value}
              </span>
            );
          }
          return null;
        }
        if (change.removed) {
          if (side === "old") {
            return (
              <span key={i} className="bg-red-300/60 dark:bg-red-500/40">
                {change.value}
              </span>
            );
          }
          return null;
        }
        return <span key={i}>{change.value}</span>;
      })}
    </span>
  );
}

// File header with collapsible toggle
function FileHeader({
  file,
  collapsed,
  onToggle,
}: {
  file: DiffFile;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const statusColors: Record<string, string> = {
    added: "bg-green-500 text-white",
    modified: "bg-amber-500 text-white",
    deleted: "bg-red-500 text-white",
    renamed: "bg-blue-500 text-white",
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-3 py-2 bg-muted/50 border-b text-sm font-mono hover:bg-muted/80 transition-colors sticky top-0 z-10"
    >
      {collapsed ? (
        <ChevronRight className="size-3.5 shrink-0" />
      ) : (
        <ChevronDown className="size-3.5 shrink-0" />
      )}
      <span
        className={cn(
          "text-[10px] font-sans font-medium px-1.5 py-0.5 rounded shrink-0",
          statusColors[file.status] || "bg-muted-foreground text-white",
        )}
      >
        {file.status.charAt(0).toUpperCase()}
      </span>
      <span className="truncate text-left flex-1">{file.path}</span>
      {file.oldPath && (
        <span className="text-muted-foreground text-xs font-sans shrink-0">
          (from {file.oldPath})
        </span>
      )}
      <span className="flex items-center gap-2 shrink-0 font-sans text-xs">
        {file.additions > 0 && (
          <span className="text-green-600 flex items-center gap-0.5">
            <Plus className="size-3" />
            {file.additions}
          </span>
        )}
        {file.deletions > 0 && (
          <span className="text-red-600 flex items-center gap-0.5">
            <Minus className="size-3" />
            {file.deletions}
          </span>
        )}
      </span>
    </button>
  );
}

// Unified diff view
function UnifiedView({ file }: { file: DiffFile }) {
  return (
    <table className="w-full text-xs font-mono border-collapse">
      <tbody>
        {file.hunks.map((hunk, hi) => {
          const groups = pairLines(hunk.lines);
          return (
            <tbody key={hi}>
              <tr className="bg-blue-50 dark:bg-blue-950/30">
                <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
                  ...
                </td>
                <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
                  ...
                </td>
                <td className="px-3 py-0.5 text-blue-600 dark:text-blue-400">
                  {hunk.header}
                </td>
              </tr>
              {groups.map((group, gi) => (
                <UnifiedGroup key={gi} group={group} />
              ))}
            </tbody>
          );
        })}
      </tbody>
    </table>
  );
}

function UnifiedGroup({
  group,
}: {
  group: { removes: DiffLine[]; adds: DiffLine[]; contexts: DiffLine[] };
}) {
  if (group.contexts.length > 0) {
    return (
      <>
        {group.contexts.map((line, i) => (
          <tr key={`c${i}`}>
            <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
              {line.oldNum}
            </td>
            <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
              {line.newNum}
            </td>
            <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
              {" "}{line.content}
            </td>
          </tr>
        ))}
      </>
    );
  }

  const paired = Math.min(group.removes.length, group.adds.length);

  return (
    <>
      {group.removes.map((line, i) => (
        <tr key={`r${i}`} className="bg-red-100 dark:bg-red-950/30">
          <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
            {line.oldNum}
          </td>
          <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap" />
          <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
            <span className="select-none text-red-500">-</span>
            {i < paired ? (
              <IntraLineHighlight
                oldContent={line.content}
                newContent={group.adds[i].content}
                side="old"
              />
            ) : (
              line.content
            )}
          </td>
        </tr>
      ))}
      {group.adds.map((line, i) => (
        <tr key={`a${i}`} className="bg-green-100 dark:bg-green-950/30">
          <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap" />
          <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
            {line.newNum}
          </td>
          <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
            <span className="select-none text-green-500">+</span>
            {i < paired ? (
              <IntraLineHighlight
                oldContent={group.removes[i].content}
                newContent={line.content}
                side="new"
              />
            ) : (
              line.content
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

// Split diff view
function SplitView({ file }: { file: DiffFile }) {
  return (
    <table className="w-full text-xs font-mono border-collapse">
      <tbody>
        {file.hunks.map((hunk, hi) => {
          const groups = pairLines(hunk.lines);
          return (
            <tbody key={hi}>
              <tr className="bg-blue-50 dark:bg-blue-950/30">
                <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
                  ...
                </td>
                <td className="w-1/2 px-3 py-0.5 text-blue-600 dark:text-blue-400 border-r">
                  {hunk.header}
                </td>
                <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
                  ...
                </td>
                <td className="w-1/2 px-3 py-0.5 text-blue-600 dark:text-blue-400">
                  {hunk.header}
                </td>
              </tr>
              {groups.map((group, gi) => (
                <SplitGroup key={gi} group={group} />
              ))}
            </tbody>
          );
        })}
      </tbody>
    </table>
  );
}

function SplitGroup({
  group,
}: {
  group: { removes: DiffLine[]; adds: DiffLine[]; contexts: DiffLine[] };
}) {
  if (group.contexts.length > 0) {
    return (
      <>
        {group.contexts.map((line, i) => (
          <tr key={`c${i}`}>
            <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
              {line.oldNum}
            </td>
            <td className="w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all border-r">
              {line.content}
            </td>
            <td className="w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap">
              {line.newNum}
            </td>
            <td className="w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all">
              {line.content}
            </td>
          </tr>
        ))}
      </>
    );
  }

  const maxLen = Math.max(group.removes.length, group.adds.length);
  const rows: ReactNode[] = [];

  for (let i = 0; i < maxLen; i++) {
    const rem = group.removes[i];
    const add = group.adds[i];
    const hasPair = rem && add;

    rows.push(
      <tr key={`s${i}`}>
        <td
          className={cn(
            "w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap",
            rem && "bg-red-100 dark:bg-red-950/30",
          )}
        >
          {rem?.oldNum}
        </td>
        <td
          className={cn(
            "w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all border-r",
            rem && "bg-red-100 dark:bg-red-950/30",
          )}
        >
          {rem && (
            <>
              {hasPair ? (
                <IntraLineHighlight
                  oldContent={rem.content}
                  newContent={add.content}
                  side="old"
                />
              ) : (
                rem.content
              )}
            </>
          )}
        </td>
        <td
          className={cn(
            "w-[1px] px-2 py-0.5 text-right text-muted-foreground select-none border-r whitespace-nowrap",
            add && "bg-green-100 dark:bg-green-950/30",
          )}
        >
          {add?.newNum}
        </td>
        <td
          className={cn(
            "w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all",
            add && "bg-green-100 dark:bg-green-950/30",
          )}
        >
          {add && (
            <>
              {hasPair ? (
                <IntraLineHighlight
                  oldContent={rem.content}
                  newContent={add.content}
                  side="new"
                />
              ) : (
                add.content
              )}
            </>
          )}
        </td>
      </tr>,
    );
  }

  return <>{rows}</>;
}

export function DiffViewer({ diff, viewStyle }: DiffViewerProps) {
  const files = useMemo(() => parseDiff(diff), [diff]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center">
        No changes to display
      </div>
    );
  }

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  const toggleFile = (path: string) => {
    setCollapsed((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm px-1">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <FileCode2 className="size-4" />
          {files.length} files changed
        </span>
        <span className="flex items-center gap-1 text-green-600">
          <Plus className="size-3" />
          {totalAdditions}
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <Minus className="size-3" />
          {totalDeletions}
        </span>
      </div>

      {files.map((file) => (
        <div
          key={file.path}
          className="border rounded-[10px] overflow-hidden"
        >
          <FileHeader
            file={file}
            collapsed={!!collapsed[file.path]}
            onToggle={() => toggleFile(file.path)}
          />
          {!collapsed[file.path] && (
            <div className="overflow-x-auto">
              {viewStyle === "split" ? (
                <SplitView file={file} />
              ) : (
                <UnifiedView file={file} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
