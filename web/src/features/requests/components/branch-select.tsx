// Mochi Projects: Branch select component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useQuery } from "@tanstack/react-query";
import { Trans, useLingui } from '@lingui/react/macro'
import {
  naturalCompare,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mochi/web";
import { GitBranch } from "lucide-react";
import projectsApi from "@/api/projects";

interface BranchSelectProps {
  repoId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BranchSelect({
  repoId,
  value,
  onChange,
  placeholder,
  disabled,
}: BranchSelectProps) {
  const { t } = useLingui();
  const placeholderText = placeholder ?? t`Select branch`;
  const { data, isLoading } = useQuery({
    queryKey: ["branches", repoId],
    queryFn: async () => {
      if (!repoId) return [];
      const response = await projectsApi.getRepositoryBranches(repoId);
      return response.data.branches;
    },
    enabled: !!repoId,
  });

  const branches = [...(data || [])].sort((a, b) =>
    naturalCompare(a.name, b.name),
  );

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading || !repoId}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <SelectValue placeholder={placeholderText} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.name} value={branch.name}>
            <div className="flex items-center gap-2">
              {branch.name}
              {branch.current && (
                <span className="text-xs text-muted-foreground">(current)</span>
              )}
            </div>
          </SelectItem>
        ))}
        {branches.length === 0 && repoId && !isLoading && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            <Trans>No branches found</Trans>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
