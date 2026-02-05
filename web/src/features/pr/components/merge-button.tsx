// Mochi Projects: Merge button component
// Copyright Alistair Cunningham 2026

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { GitMerge, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Button, ConfirmDialog } from "@mochi/common";
import projectsApi from "@/api/projects";

interface MergeButtonProps {
  repoId: string;
  source: string;
  target: string;
  canMerge: boolean;
  objectTitle: string;
  objectReadable: string;
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
  onMergeComplete,
  disabled,
}: MergeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const message = `Merge ${objectReadable}: ${objectTitle}`;
      const response = await projectsApi.merge(repoId, source, target, message);
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
          {mergeMutation.error instanceof Error
            ? mergeMutation.error.message
            : "Failed to merge"}
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

interface ViewDiffLinkProps {
  repoId: string;
  source: string;
  target: string;
}

export function ViewDiffLink({ repoId, source, target }: ViewDiffLinkProps) {
  // Link to repositories app to view full diff
  const diffUrl = `/repositories/${repoId}/compare/${target}...${source}`;

  return (
    <a
      href={diffUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      View full diff
      <ExternalLink className="size-3" />
    </a>
  );
}
