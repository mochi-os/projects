// Mochi Projects: Board container component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { t } from "@lingui/core/macro";
import {
  EntityBoardContainer,
  type EntityBoardContainerProps,
} from "@mochi/web";
import type { ProjectObject, ProjectDetails } from "@/types";


type BoardContainerProps = Omit<
  EntityBoardContainerProps<ProjectObject>,
  "design" | "containerId" | "fallbackTitle"
> & { project: ProjectDetails };

export function BoardContainer({ project, ...props }: BoardContainerProps) {
  return (
    <EntityBoardContainer
      {...props}
      design={project}
      containerId={project.project.id}
      fallbackTitle={(object) =>
        typeof object.number === "number"
          ? `${project.project.prefix}-${object.number}`
          : t`Untitled`
      }
    />
  );
}
