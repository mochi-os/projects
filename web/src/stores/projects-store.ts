// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The store itself is createEntityListStore in @mochi/web, shared with the crm
// app. Only the list call, the response key and the wording are ours.

import { createEntityListStore } from "@mochi/web";
import { t } from '@lingui/core/macro'
import type { Project } from "@/types";
import projectsApi from "@/api/projects";

export const useProjectsStore = createEntityListStore<Project>({
  list: projectsApi.list,
  listKey: "projects",
  errorMessage: () => t`Failed to load projects`,
});
