// Mochi Projects: Comment list component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Trash2, Pencil } from "lucide-react";
import { Button, Textarea, ConfirmDialog } from "@mochi/common";
import projectsApi from "@/api/projects";
import type { Comment } from "@/types";

interface CommentListProps {
  projectId: string;
  objectId: string;
}

export function CommentList({ projectId, objectId }: CommentListProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["comments", projectId, objectId],
    queryFn: async () => {
      const response = await projectsApi.listComments(projectId, objectId);
      return response.data.comments;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      return projectsApi.createComment(projectId, objectId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", projectId, objectId],
      });
      setNewComment("");
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
      setEditingId(null);
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
    },
  });

  const handleSubmit = () => {
    if (newComment.trim()) {
      createMutation.mutate(newComment.trim());
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      updateMutation.mutate({
        commentId: editingId,
        content: editContent.trim(),
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const comments = data || [];

  return (
    <div className="space-y-4">
      {/* New comment form */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || createMutation.isPending}
          >
            <Send className="size-4 mr-1" />
            {createMutation.isPending ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No comments yet
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">{comment.name}</div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEdit(comment)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => setDeleteCommentId(comment.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>

              {editingId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm whitespace-pre-wrap">
                    {comment.content}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatDate(comment.created)}
                    {comment.edited > 0 && " (edited)"}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteCommentId}
        onOpenChange={(open) => !open && setDeleteCommentId(null)}
        title="Delete comment"
        desc="Are you sure you want to delete this comment?"
        confirmText="Delete"
        destructive
        handleConfirm={() => {
          if (deleteCommentId) {
            deleteMutation.mutate(deleteCommentId);
            setDeleteCommentId(null);
          }
        }}
      />
    </div>
  );
}
