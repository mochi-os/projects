// Mochi Projects: Merge button component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { GitMerge, Loader2, CheckCircle2 } from "lucide-react";
import { Button, ConfirmDialog, getErrorMessage } from "@mochi/common";
import projectsApi from "@/api/projects";

interface MergeButtonProps {
  repoId: string;
  source: string;
  target: string;
  canMerge: boolean;
  objectTitle: string;
  objectReadable: string;
  projectId?: string;
  onMergeComplete?: () => void;
  disabled?: boolean;
}

export function MergeButton({
  repoId,
  source,
  target,
  canMerge,
  objectTitle,
  objectReadable,
  projectId,
  onMergeComplete,
  disabled,
}: MergeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const message = `Merge ${objectReadable}: ${objectTitle}`;
      const response = await projectsApi.merge(repoId, source, target, message, projectId);
      return response.data;
    },
    onSuccess: () => {
      setShowConfirm(false);
      onMergeComplete?.();
    },
  });

  const handleMerge = () => {
    mergeMutation.mutate();
  };

  if (mergeMutation.isSuccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
        <CheckCircle2 className="size-4" />
        Merged successfully
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={!canMerge || disabled || mergeMutation.isPending}
        className="w-full"
      >
        {mergeMutation.isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Merging...
          </>
        ) : (
          <>
            <GitMerge className="size-4 mr-2" />
            Merge pull request
          </>
        )}
      </Button>

      {mergeMutation.isError && (
        <p className="text-xs text-destructive mt-2">
          {getErrorMessage(mergeMutation.error, "Failed to merge")}
        </p>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Merge pull request"
        desc={`This will merge "${source}" into "${target}". This action cannot be undone.`}
        confirmText="Merge"
        isLoading={mergeMutation.isPending}
        handleConfirm={handleMerge}
      />
    </>
  );
}
