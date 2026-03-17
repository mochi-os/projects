// Mochi Projects: Repository select component
// Copyright Alistair Cunningham 2026

import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

  const repositories = data || [];

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <SelectValue placeholder="Select repository" />
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
            No repositories available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
