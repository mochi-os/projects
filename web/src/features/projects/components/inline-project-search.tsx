import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, FolderKanban } from "lucide-react";
import { Button, Input, toast, getErrorMessage } from "@mochi/common";
import projectsApi from "@/api/projects";
import { useProjectsStore } from "@/stores/projects-store";

interface DirectoryEntry {
  id: string;
  name: string;
  fingerprint: string;
  location?: string;
}

interface InlineProjectSearchProps {
  subscribedIds: Set<string>;
  onRefresh?: () => void;
}

export function InlineProjectSearch({
  subscribedIds,
  onRefresh,
}: InlineProjectSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const navigate = useNavigate();
  const refresh = useProjectsStore((state) => state.refresh);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const response = await projectsApi.search({ search: debouncedQuery });
        setResults(response.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    void search();
  }, [debouncedQuery]);

  const handleSubscribe = async (project: DirectoryEntry) => {
    setPendingProjectId(project.id);
    try {
      await projectsApi.subscribe(project.id, project.location || undefined);
      void refresh();
      onRefresh?.();
      void navigate({
        to: "/$projectId",
        params: { projectId: project.fingerprint || project.id },
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to subscribe"));
      setPendingProjectId(null);
    }
  };

  const showResults = debouncedQuery.length > 0;
  const showLoading = isLoading && debouncedQuery.length > 0;

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search for projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 pl-9"
          autoFocus
        />
      </div>

      {/* Results */}
      {showLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      {!isLoading && showResults && results.length === 0 && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No projects found
        </p>
      )}

      {!isLoading && results.length > 0 && (
        <div className="divide-border divide-y rounded-lg border">
          {results
            .filter(
              (project) =>
                !subscribedIds.has(project.id) &&
                !subscribedIds.has(project.fingerprint),
            )
            .map((project) => {
              const isPending = pendingProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-500/10">
                      <FolderKanban className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col text-left">
                      <span className="truncate text-sm font-medium">
                        {project.name}
                      </span>
                      {project.fingerprint && (
                        <span className="text-muted-foreground truncate text-xs">
                          {project.fingerprint.match(/.{1,3}/g)?.join("-")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSubscribe(project)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
