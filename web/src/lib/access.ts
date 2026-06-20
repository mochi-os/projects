// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import type { ProjectAccess } from "@/types";

export const canDesign = (a: ProjectAccess) => a === "owner" || a === "design";
export const canWrite = (a: ProjectAccess) => canDesign(a) || a === "write";
export const canCreate = canWrite;
export const canComment = (a: ProjectAccess) => canWrite(a) || a === "comment";
