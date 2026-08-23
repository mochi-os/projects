// Mochi Projects: Diff page URL
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/**
 * The diff page is routed at /$projectId/diff - two segments. Built from the
 * app path alone it becomes /projects/diff, which instead matches /$projectId
 * with projectId "diff", and that loader 404s and redirects home.
 */
export function diffUrl(
  appPath: string,
  projectId: string,
  request: { repository: string; source: string; target: string },
): string {
  return (
    `${appPath}/${projectId}/diff` +
    `?repo=${encodeURIComponent(request.repository)}` +
    `&source=${encodeURIComponent(request.source)}` +
    `&target=${encodeURIComponent(request.target)}`
  );
}
