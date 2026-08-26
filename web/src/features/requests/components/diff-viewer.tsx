// Mochi Projects: Diff viewer component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useState, useMemo, type ReactNode } from "react";
import { Trans } from '@lingui/react/macro'
import { diffWords } from "diff";
import { ChevronDown, ChevronRight, FileCode2, Plus, Minus } from "lucide-react";
import { cn } from "@mochi/web";
import { parseDiff, type DiffFile, type DiffLine } from "./diff-parser";
import {
  diffFileStatusBadgeStyles,
  requestStatusTextStyles,
} from "./request-status-styles";

interface DiffViewerProps {
  diff: string;
  viewStyle: "unified" | "split";
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
              <span key={i} className="bg-success/25 dark:bg-success/40">
                {change.value}
              </span>
            );
          }
          return null;
        }
        if (change.removed) {
          if (side === "old") {
            return (
              <span key={i} className="bg-destructive/20 dark:bg-destructive/40">
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
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-3 py-2 bg-muted/50 border-b text-sm font-mono hover:bg-hover/80 transition-colors sticky top-0 z-10"
    >
      {collapsed ? (
        <ChevronRight className="size-3.5 shrink-0 rtl:rotate-180" />
      ) : (
        <ChevronDown className="size-3.5 shrink-0" />
      )}
      <span
        className={cn(
          "text-[10px] font-sans",
          diffFileStatusBadgeStyles[file.status] || "border-border bg-muted text-foreground",
        )}
      >
        {file.status.charAt(0).toUpperCase()}
      </span>
      <span className="truncate text-start flex-1">{file.path}</span>
      {file.oldPath && (
        <span className="text-muted-foreground text-xs font-sans shrink-0">
          <Trans>(from {file.oldPath})</Trans>
        </span>
      )}
      <span className="flex items-center gap-2 shrink-0 font-sans text-xs">
        {file.additions > 0 && (
          <span className={cn("flex items-center gap-0.5", requestStatusTextStyles.added)}>
            <Plus className="size-3" />
            {file.additions}
          </span>
        )}
        {file.deletions > 0 && (
          <span className={cn("flex items-center gap-0.5", requestStatusTextStyles.deleted)}>
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
      {/* Each hunk is its own tbody; a wrapping tbody would nest them. */}
      {file.hunks.map((hunk, hi) => {
          const groups = pairLines(hunk.lines);
          return (
            <tbody key={hi}>
              <tr className="bg-primary/5 dark:bg-primary/10">
                <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
                  ...
                </td>
                <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
                  ...
                </td>
                <td className="px-3 py-0.5 text-primary">
                  {hunk.header}
                </td>
              </tr>
              {groups.map((group, gi) => (
                <UnifiedGroup key={gi} group={group} />
              ))}
            </tbody>
          );
        })}
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
            <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
              {line.oldNum}
            </td>
            <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
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
        <tr key={`r${i}`} className="bg-destructive/10 dark:bg-destructive/15">
          <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
            {line.oldNum}
          </td>
          <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap" />
          <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
            <span className="select-none text-destructive">-</span>
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
        <tr key={`a${i}`} className="bg-success/10 dark:bg-success/15">
          <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap" />
          <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
            {line.newNum}
          </td>
          <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
            <span className="select-none text-success">+</span>
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
      {/* Each hunk is its own tbody; a wrapping tbody would nest them. */}
      {file.hunks.map((hunk, hi) => {
          const groups = pairLines(hunk.lines);
          return (
            <tbody key={hi}>
              <tr className="bg-primary/5 dark:bg-primary/10">
                <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
                  ...
                </td>
                <td className="w-1/2 px-3 py-0.5 text-primary border-e">
                  {hunk.header}
                </td>
                <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
                  ...
                </td>
                <td className="w-1/2 px-3 py-0.5 text-primary">
                  {hunk.header}
                </td>
              </tr>
              {groups.map((group, gi) => (
                <SplitGroup key={gi} group={group} />
              ))}
            </tbody>
          );
        })}
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
            <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
              {line.oldNum}
            </td>
            <td className="w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all border-e">
              {line.content}
            </td>
            <td className="w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap">
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
            "w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap",
            rem && "bg-destructive/10 dark:bg-destructive/15",
          )}
        >
          {rem?.oldNum}
        </td>
        <td
          className={cn(
            "w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all border-e",
            rem && "bg-destructive/10 dark:bg-destructive/15",
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
            "w-[1px] px-2 py-0.5 text-end text-muted-foreground select-none border-e whitespace-nowrap",
            add && "bg-success/10 dark:bg-success/15",
          )}
        >
          {add?.newNum}
        </td>
        <td
          className={cn(
            "w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all",
            add && "bg-success/10 dark:bg-success/15",
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
        <Trans>No changes to display</Trans>
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
          <Trans>{files.length} files changed</Trans>
        </span>
        <span className={cn("flex items-center gap-1", requestStatusTextStyles.added)}>
          <Plus className="size-3" />
          {totalAdditions}
        </span>
        <span className={cn("flex items-center gap-1", requestStatusTextStyles.deleted)}>
          <Minus className="size-3" />
          {totalDeletions}
        </span>
      </div>

      {files.map((file) => (
        <div
          key={file.path}
          className="border rounded-lg overflow-hidden"
        >
          <FileHeader
            file={file}
            collapsed={!!collapsed[file.path]}
            onToggle={() => toggleFile(file.path)}
          />
          {!collapsed[file.path] && (
            <div className="overflow-x-auto">
              {file.isBinary ? (
                // Binary files carry no hunks — say so rather than render an
                // empty body, which reads as "nothing changed".
                <p className="text-sm text-muted-foreground px-3 py-4">
                  <Trans>Binary file not shown</Trans>
                </p>
              ) : viewStyle === "split" ? (
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
