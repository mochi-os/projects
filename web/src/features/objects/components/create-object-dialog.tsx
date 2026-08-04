// Mochi Projects: Create object dialog component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { Trans } from "@lingui/react/macro";
import {
  EntityCreateObjectDialog,
  type EntityCreateObjectDialogProps,
} from "@mochi/web";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectObject } from "@/types";

type CreateObjectDialogProps = Omit<
  EntityCreateObjectDialogProps<ProjectObject>,
  | "containerId"
  | "recordId"
  | "design"
  | "prefix"
  | "srTitle"
  | "srDescription"
  | "buildObject"
  | "listObjects"
  | "listPeople"
  | "createObject"
  | "setValue"
  | "uploadAttachments"
  | "searchUsers"
> & { projectId: string; project: ProjectDetails };

export function CreateObjectDialog({
  projectId,
  project,
  ...props
}: CreateObjectDialogProps) {
  return (
    <EntityCreateObjectDialog
      {...props}
      containerId={projectId}
      recordId={project.project.id}
      design={project}
      prefix={project.project.prefix}
      srTitle={<Trans>Create new item</Trans>}
      srDescription={<Trans>Create a new item in this project</Trans>}
      buildObject={(base) => ({
        ...base,
        project: project.project.id,
        number: base.number ?? 0,
      })}
      listObjects={projectsApi.listObjects}
      listPeople={projectsApi.listPeople}
      createObject={projectsApi.createObject}
      setValue={projectsApi.setValue}
      uploadAttachments={projectsApi.uploadAttachments}
      searchUsers={projectsApi.searchUsers}
    />
  );
}
