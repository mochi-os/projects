// Mochi Projects: Collapsible view options bar
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { EntityViewOptionsBar, type EntityViewOptionsBarProps } from "@mochi/web";
import type { ProjectDetails } from "@/types";

type ViewOptionsBarProps = Omit<
  EntityViewOptionsBarProps,
  "views" | "numbered"
> & {
  project: ProjectDetails;
};

// Every project object carries a number, so the built-in Number sort is offered.
// The crm binding leaves it off, which is what keeps a dead option out of a
// dropdown that cannot sort by it.
export function ViewOptionsBar({ project, ...props }: ViewOptionsBarProps) {
  return <EntityViewOptionsBar {...props} views={project.views} numbered />;
}
