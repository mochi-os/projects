// Mochi Projects: Conflict list component
// Copyright Alistair Cunningham 2026

import { AlertTriangle, FileWarning } from "lucide-react";

import { Trans } from '@lingui/react/macro'
interface ConflictListProps {
  conflicts: string[];
}

export function ConflictList({ conflicts }: ConflictListProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="size-4" />
        {conflicts.length} conflicting{" "}
        {conflicts.length === 1 ? "file" : "files"}
      </div>
      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
        <ul className="space-y-1.5">
          {conflicts.map((file) => (
            <li key={file} className="flex items-center gap-2 text-xs">
              <FileWarning className="size-3 text-destructive shrink-0" />
              <span className="font-mono truncate">{file}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        <Trans>Resolve these conflicts manually before merging.</Trans>
      </p>
    </div>
  );
}
