// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Endpoints are relative to baseURL which is already set to /projects/ in
// request.ts. The shared object/class/field routes come from @mochi/web; what
// is spelled out below is what only this app has — templates, merge requests,
// and the repository integration behind them.

import { entityEndpoints } from "@mochi/web";

const endpoints = {
  projects: {
    ...entityEndpoints,

    templates: "-/templates",

    // Request endpoints
    requests: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/requests`,
    requestCreate: (projectId: string, objectId: string) =>
      `${projectId}/-/objects/${objectId}/requests/create`,
    requestUpdate: (projectId: string, objectId: string, requestId: string) =>
      `${projectId}/-/objects/${objectId}/requests/${requestId}/update`,
    requestDelete: (projectId: string, objectId: string, requestId: string) =>
      `${projectId}/-/objects/${objectId}/requests/${requestId}/delete`,

    // Diff preference endpoints
    diffPreference: "-/diff/preference",
    diffPreferenceSet: "-/diff/preference/set",

    // Repository integration endpoints (for merge requests)
    repositories: "-/repositories",
    repositoryBranches: (repoId: string) => `-/repositories/${repoId}/branches`,
    repositoryMergeCheck: (repoId: string) =>
      `-/repositories/${repoId}/merge/check`,
    repositoryDiff: (repoId: string) => `-/repositories/${repoId}/diff`,
    repositoryMerge: (repoId: string) => `-/repositories/${repoId}/merge`,
  },
} as const;

export default endpoints;
