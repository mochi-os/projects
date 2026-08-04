// Mochi Projects: Board column component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import {
  EntityBoardColumn,
  type EntityBoardColumnProps,
  type EntityBoardColumnRow,
} from "@mochi/web";
import type { ProjectObject } from "@/types";

export type BoardColumnRow = EntityBoardColumnRow<ProjectObject>;

type BoardColumnProps = Omit<
  EntityBoardColumnProps<ProjectObject>,
  "fallbackTitle" | "containerId"
> & { projectId?: string; prefix: string };

export function BoardColumn({
  projectId,
  prefix,
  ...props
}: BoardColumnProps) {
  return (
    <EntityBoardColumn
      {...props}
      containerId={projectId}
      fallbackTitle={(object) => `${prefix}-${object.number}`}
    />
  );
}
