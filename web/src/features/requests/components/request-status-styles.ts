const statusBadgeBaseClass =
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium leading-none shrink-0";

export const requestStateBadgeStyles = {
  draft: `${statusBadgeBaseClass} border-warning/30 bg-warning/15 text-warning-foreground dark:border-warning/35 dark:bg-warning/20 dark:text-warning`,
  merged: `${statusBadgeBaseClass} border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100`,
  open: `${statusBadgeBaseClass} border-primary/30 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/15 dark:text-primary`,
} as const;

export const diffFileStatusBadgeStyles = {
  added: requestStateBadgeStyles.merged,
  modified: requestStateBadgeStyles.draft,
  deleted: `${statusBadgeBaseClass} border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100`,
  renamed: requestStateBadgeStyles.open,
} as const;

export const requestStatusTextStyles = {
  added: "text-emerald-800 dark:text-emerald-300",
  deleted: "text-red-700 dark:text-red-400",
  info: "text-primary",
  successIcon: "text-emerald-700 dark:text-emerald-400",
  warning: "text-warning-foreground dark:text-warning",
} as const;

export const diffFileStatusDotStyles = {
  added: "bg-emerald-700 dark:bg-emerald-400",
  modified: "bg-amber-700 dark:bg-amber-400",
  deleted: "bg-red-700 dark:bg-red-400",
  renamed: "bg-primary",
} as const;
