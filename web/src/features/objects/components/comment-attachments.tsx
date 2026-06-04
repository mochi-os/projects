// Mochi Projects: Comment attachment display
// Copyright Alistair Cunningham 2026

import {
  AttachmentGallery,
  getAppPath,
  authenticatedUrl,
} from "@mochi/web";
import type { CommentAttachment } from "@/types";

interface CommentAttachmentsProps {
  attachments: CommentAttachment[];
  projectId: string;
}

export function CommentAttachments({
  attachments,
  projectId,
}: CommentAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  const basePath = `${getAppPath()}/${projectId}/-/attachments/`;
  const attUrl = (id: string, suffix = "") => authenticatedUrl(`${basePath}${id}${suffix}`);

  return (
    <div className="mt-1">
      <AttachmentGallery
        attachments={attachments}
        getUrl={(att) => attUrl(att.id)}
        getThumbnailUrl={(att) => attUrl(att.id, "/thumbnail")}
        rowHeight={80}
      />
    </div>
  );
}
