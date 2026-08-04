// Mochi Projects: Threaded comment list component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { EntityCommentList, type EntityCommentListProps } from "@mochi/web";
import projectsApi from "@/api/projects";

type CommentListProps = Omit<
  EntityCommentListProps,
  | "containerId"
  | "listComments"
  | "listPeople"
  | "createComment"
  | "updateComment"
  | "deleteComment"
> & { projectId: string };

export function CommentList({ projectId, ...props }: CommentListProps) {
  return (
    <EntityCommentList
      {...props}
      containerId={projectId}
      listComments={projectsApi.listComments}
      listPeople={projectsApi.listPeople}
      createComment={projectsApi.createComment}
      updateComment={projectsApi.updateComment}
      deleteComment={projectsApi.deleteComment}
    />
  );
}
