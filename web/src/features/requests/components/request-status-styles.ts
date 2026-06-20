// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */
const statusBadgeBaseClass =
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium leading-none shrink-0";

export const requestStateBadgeStyles = {
  draft: `${statusBadgeBaseClass} border-warning/30 bg-warning/15 text-warning-foreground dark:border-warning/35 dark:bg-warning/20 dark:text-warning`,
  merged: `${statusBadgeBaseClass} border-success/30 bg-success/10 text-success dark:border-success/35 dark:bg-success/15`,
  open: `${statusBadgeBaseClass} border-primary/30 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-primary`,
} as const;

export const diffFileStatusBadgeStyles = {
  added: requestStateBadgeStyles.merged,
  modified: requestStateBadgeStyles.draft,
  deleted: `${statusBadgeBaseClass} border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/35 dark:bg-destructive/15`,
  renamed: requestStateBadgeStyles.open,
} as const;

export const requestStatusTextStyles = {
  added: "text-success",
  deleted: "text-destructive",
  info: "text-primary",
  successIcon: "text-success",
  warning: "text-warning-foreground dark:text-warning",
} as const;

export const diffFileStatusDotStyles = {
  added: "bg-success",
  modified: "bg-amber-700 dark:bg-amber-400",
  deleted: "bg-destructive",
  renamed: "bg-primary",
} as const;
