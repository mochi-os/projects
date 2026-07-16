// Mochi Projects: Repository select component
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useQuery } from "@tanstack/react-query";
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  naturalCompare,
} from "@mochi/web";
import { GitBranch } from "lucide-react";
import projectsApi from "@/api/projects";

interface RepositorySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function RepositorySelect({
  value,
  onChange,
  disabled,
}: RepositorySelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: async () => {
      const response = await projectsApi.listRepositories();
      return response.data.repositories;
    },
  });

  const repositories = [...(data || [])].sort((a, b) =>
    naturalCompare(a.name, b.name),
  );

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <SelectValue placeholder={t`Select repository`} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {repositories.map((repo) => (
          <SelectItem key={repo.id} value={repo.id}>
            {repo.name}
          </SelectItem>
        ))}
        {repositories.length === 0 && !isLoading && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            <Trans>No repositories available</Trans>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
