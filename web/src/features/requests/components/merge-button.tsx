// Mochi Projects: Merge button component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { GitMerge, Loader2, CheckCircle2 } from "lucide-react";
import { Button, ConfirmDialog, cn, getErrorMessage } from "@mochi/web";
import projectsApi from "@/api/projects";
import { requestStatusTextStyles } from "./request-status-styles";

type MergeMethod = "merge" | "squash" | "rebase";

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
  const [method, setMethod] = useState<MergeMethod>("merge");

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const message = `Merge ${objectReadable}: ${objectTitle}`;
      const response = await projectsApi.merge(repoId, source, target, message, projectId, method);
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
      <div className={cn("flex items-center gap-2 text-sm font-medium", requestStatusTextStyles.added)}>
        <CheckCircle2 className="size-4" />
        Merged successfully
      </div>
    );
  }

  const methodLabels: Record<MergeMethod, string> = {
    merge: "Merge commit",
    squash: "Squash and merge",
    rebase: "Rebase and merge",
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={!canMerge || disabled || mergeMutation.isPending}
        className="flex-1"
      >
        {mergeMutation.isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Merging...
          </>
        ) : (
          <>
            <GitMerge className="size-4 mr-2" />
            {methodLabels[method]}
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
        title="Merge"
        desc={`This will merge "${source}" into "${target}". This action cannot be undone.`}
        confirmText={methodLabels[method]}
        isLoading={mergeMutation.isPending}
        handleConfirm={handleMerge}
      >
        <div className="space-y-2 px-1">
          {(["merge", "squash", "rebase"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="merge-method"
                checked={method === m}
                onChange={() => setMethod(m)}
                className="accent-primary"
              />
              {methodLabels[m]}
            </label>
          ))}
        </div>
      </ConfirmDialog>
    </>
  );
}
