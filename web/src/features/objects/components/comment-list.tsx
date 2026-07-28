// Mochi Projects: Threaded comment list component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useState, useRef } from "react";
import { useLingui } from '@lingui/react/macro'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Paperclip, Send, X } from "lucide-react";
import {
  Button,
  EmptyState,
  toast,
  getErrorMessage,
  ListSkeleton,
  MentionTextarea,
  useAuthStore,
  useImageObjectUrls,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  textUnchanged,
  findCommentTextInTree,
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  useFormat,
  pendingFileKey,
  removePendingFile,
} from "@mochi/web";
import projectsApi from "@/api/projects";
import { CommentThread } from "./comment-thread";

interface CommentListProps {
  projectId: string;
  objectId: string;
  readOnly?: boolean;
}

export function CommentList({
  projectId,
  objectId,
  readOnly,
}: CommentListProps) {
  const { t } = useLingui()
  const [newComment, setNewComment] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const newFileImageUrls = useImageObjectUrls(newFiles);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewComment("");
    setNewFiles([]);
    setReplyingTo(null);
    setReplyDraft("");
  }, [objectId]);
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.identity);
  const { formatFileSize } = useFormat();

  const { data, isLoading } = useQuery({
    queryKey: ["comments", projectId, objectId],
    queryFn: async () => {
      const response = await projectsApi.listComments(projectId, objectId);
      return response.data;
    },
  });

  const { data: peopleData } = useQuery({
    queryKey: ["people", projectId],
    queryFn: async () => {
      const response = await projectsApi.listPeople(projectId);
      return response.data.people;
    },
    staleTime: 60000,
  });
  const people = peopleData ?? [];

  const createMutation = useMutation({
    mutationFn: async ({
      content,
      parent,
      files,
    }: {
      content: string;
      parent?: string;
      files?: File[];
    }) => {
      return projectsApi.createComment(
        projectId,
        objectId,
        content,
        parent,
        files,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", projectId, objectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["object", projectId, objectId],
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, t`Failed to post comment`));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      return projectsApi.updateComment(projectId, objectId, commentId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", projectId, objectId],
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, t`Failed to update comment`));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return projectsApi.deleteComment(projectId, objectId, commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", projectId, objectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["object", projectId, objectId],
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, t`Failed to delete comment`));
    },
  });

  const handleCreate = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { content: trimmed, files: newFiles.length > 0 ? newFiles : undefined },
      {
        onSuccess: () => {
          setNewComment("");
          setNewFiles([]);
        },
      },
    );
  };

  const handleReply = async (parentId: string, files?: File[]) => {
    const trimmed = replyDraft.trim();
    if (!trimmed) return;
    await createMutation.mutateAsync({
      content: trimmed,
      parent: parentId,
      files,
    });
    setReplyingTo(null);
    setReplyDraft("");
  };

  const handleEdit = (commentId: string, content: string) => {
    const original = findCommentTextInTree(data?.comments ?? [], commentId, {
      getId: (c) => c.id,
      getText: (c) => c.content,
      getChildren: (c) => c.children,
    });
    if (original !== undefined && textUnchanged(content, original)) {
      return;
    }
    updateMutation.mutate({ commentId, content });
  };

  const handleDelete = (commentId: string) => {
    deleteMutation.mutate(commentId);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setNewFiles((prev) => [...prev, ...selected]);
    }
    e.target.value = "";
  };

  if (isLoading) {
    return <ListSkeleton count={3} variant="simple" height="h-12" />;
  }

  const comments = data?.comments ?? [];

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="space-y-2">
          <MentionTextarea
            value={newComment}
            onValueChange={setNewComment}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder={t`Add a comment...`}
            rows={3}
            people={people}
          />
          {newFiles.length > 0 && (
            <AttachmentGroup>
              {newFiles.map((file, i) => {
                const isImage = file.type.startsWith("image/");
                return (
                  <Attachment key={pendingFileKey(file)} state="uploading" size="sm">
                    <AttachmentMedia variant={isImage ? "image" : "icon"}>
                      {isImage && newFileImageUrls[i] ? (
                        <img
                          src={newFileImageUrls[i]}
                          alt={file.name}
                          draggable={false}
                        />
                      ) : (
                        <Paperclip />
                      )}
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{file.name}</AttachmentTitle>
                      <AttachmentDescription>
                        {formatFileSize(file.size)}
                      </AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        onClick={() =>
                          setNewFiles((prev) => removePendingFile(prev, file))
                        }
                        aria-label={t`Remove`}
                      >
                        <X className="size-4" />
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                );
              })}
            </AttachmentGroup>
          )}
          <div className="flex items-center justify-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t`Attach comment files`}
                >
                  <Paperclip className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t`Attach comment files`}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  className="size-8"
                  disabled={!newComment.trim() || createMutation.isPending}
                  onClick={handleCreate}
                  aria-label={t`Submit comment`}
                >
                  <Send className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t`Submit comment`}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t`No comments yet`}
          description={t`Start the discussion by adding the first comment.`}
          className="py-4"
        />
      ) : (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              projectId={projectId}
              currentUserId={currentUserId}
              readOnly={!!readOnly}
              people={people}
              replyingTo={replyingTo}
              replyDraft={replyDraft}
              onStartReply={(id) => {
                setReplyingTo(id);
                const selected = window.getSelection()?.toString().trim();
                if (selected) {
                  const quoted =
                    selected
                      .split("\n")
                      .map((line) => `> ${line}`)
                      .join("\n") + "\n\n";
                  setReplyDraft(quoted);
                } else {
                  setReplyDraft("");
                }
              }}
              onCancelReply={() => {
                setReplyingTo(null);
                setReplyDraft("");
              }}
              onReplyDraftChange={setReplyDraft}
              onSubmitReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
