// Mochi Projects: Branch select component
// Copyright Alistair Cunningham 2026

import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@mochi/common";
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
  placeholder = "Select branch",
  disabled,
}: BranchSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["branches", repoId],
    queryFn: async () => {
      if (!repoId) return [];
      const response = await projectsApi.getRepositoryBranches(repoId);
      return response.data.branches;
    },
    enabled: !!repoId,
  });

  const branches = data || [];

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading || !repoId}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
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
            No branches found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
