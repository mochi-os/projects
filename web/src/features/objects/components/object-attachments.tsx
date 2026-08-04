// Mochi Projects: Object attachment display and management
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import {
  EntityObjectAttachments,
  type EntityObjectAttachmentsProps,
} from "@mochi/web";
import projectsApi from "@/api/projects";

type ObjectAttachmentsProps = Omit<
  EntityObjectAttachmentsProps,
  "containerId" | "listAttachments" | "uploadAttachments" | "deleteAttachment"
> & { projectId: string };

export function ObjectAttachments({ projectId, ...props }: ObjectAttachmentsProps) {
  return (
    <EntityObjectAttachments
      {...props}
      containerId={projectId}
      listAttachments={projectsApi.listAttachments}
      uploadAttachments={projectsApi.uploadAttachments}
      deleteAttachment={projectsApi.deleteAttachment}
    />
  );
}
