// Mochi Projects: Design preview component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { t } from "@lingui/core/macro";
import { EntityDesignPreview } from "@mochi/web";
import type { ProjectDetails, ProjectObject } from "@/types";

interface DesignPreviewProps {
  project: ProjectDetails;
  projectId: string;
  objects: ProjectObject[];
  selectedClassId: string | null;
}

export function DesignPreview({ project, projectId, objects, selectedClassId }: DesignPreviewProps) {
  return (
    <EntityDesignPreview
      design={project}
      objects={objects}
      selectedClassId={selectedClassId}
      boardContainerId={project.project.id}
      treeContainerId={projectId}
      storagePrefix="projects"
      prefix={project.project.prefix}
      fallbackTitle={(object) =>
        typeof object.number === "number"
          ? `${project.project.prefix}-${object.number}`
          : t`Untitled`
      }
    />
  );
}
