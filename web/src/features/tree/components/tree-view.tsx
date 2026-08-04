// Mochi Projects: Tree view component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// Binding for the shared tree view. The project prefix is what enables the ID
// column, so it is passed even though the shared component treats it as optional.

import { EntityTreeView, type EntityTreeNode, type EntityTreeViewProps } from "@mochi/web";
import type { ProjectDetails, ProjectObject } from "@/types";

export type TreeNode = EntityTreeNode<ProjectObject>;

type TreeViewProps = Omit<
  EntityTreeViewProps<ProjectObject>,
  "design" | "containerId" | "storagePrefix" | "prefix"
> & {
  project: ProjectDetails;
  projectId: string;
};

export function TreeView({ project, projectId, ...props }: TreeViewProps) {
  return (
    <EntityTreeView
      {...props}
      design={project}
      containerId={projectId}
      storagePrefix="projects"
      prefix={project.project.prefix}
    />
  );
}
