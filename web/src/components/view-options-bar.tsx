// Mochi Projects: Collapsible view options bar
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { EntityViewOptionsBar, type EntityViewOptionsBarProps } from "@mochi/web";
import type { ProjectDetails } from "@/types";

type ViewOptionsBarProps = Omit<EntityViewOptionsBarProps, "views"> & {
  project: ProjectDetails;
};

export function ViewOptionsBar({ project, ...props }: ViewOptionsBarProps) {
  return <EntityViewOptionsBar {...props} views={project.views} />;
}
