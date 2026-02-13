// Mochi Projects: Threaded comment list component
// Copyright Alistair Cunningham 2026

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import {
  Button,
  toast,
  getErrorMessage,
  useAuthStore,
} from "@mochi/common";
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
  const [newComment, setNewComment] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.identity);

  const { data, isLoading } = useQuery({
    queryKey: ["comments", projectId, objectId],
    queryFn: async () => {
      const response = await projectsApi.listComments(projectId, objectId);
      return response.data;
    },
  });

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
      toast.error(getErrorMessage(err, "Failed to post comment"));
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
      return projectsApi.updateComment(
        projectId,
        objectId,
        commentId,
        content,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", projectId, objectId],
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update comment"));
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
      toast.error(getErrorMessage(err, "Failed to delete comment"));
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

  const handleReply = (parentId: string, files?: File[]) => {
    const trimmed = replyDraft.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { content: trimmed, parent: parentId, files },
      {
        onSuccess: () => {
          setReplyingTo(null);
          setReplyDraft("");
        },
      },
    );
  };

  const handleEdit = (commentId: string, content: string) => {
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
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const comments = data?.comments ?? [];

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Add a comment..."
            className="border-input bg-background min-h-16 w-full resize-none rounded-lg border px-3 py-2 text-sm"
            rows={3}
          />
          {newFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {newFiles.map((file, i) => (
                <div
                  key={i}
                  className="bg-muted relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  {file.type.startsWith("image/") && (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <Paperclip className="text-muted-foreground size-3 shrink-0" />
                  <span className="max-w-40 truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="text-muted-foreground hover:text-foreground ml-0.5"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="size-8"
              disabled={!newComment.trim() || createMutation.isPending}
              onClick={handleCreate}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No comments yet
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              projectId={projectId}
              currentUserId={currentUserId}
              readOnly={!!readOnly}
              replyingTo={replyingTo}
              replyDraft={replyDraft}
              onStartReply={(id) => {
                setReplyingTo(id);
                setReplyDraft("");
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
