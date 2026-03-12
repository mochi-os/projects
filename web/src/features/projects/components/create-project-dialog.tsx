import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Switch, toast, getErrorMessage, cn } from "@mochi/common"
import { ArrowLeft, ArrowRight, Check, File, FolderKanban, LayoutGrid, Plus, Ticket, Zap } from "lucide-react";
import projectsApi from "@/api/projects";
import { useProjectsStore } from "@/stores/projects-store";
import type { ProjectTemplate } from "@/types";

function nameToPrefix(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
}

interface CreateProjectDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  hideTrigger,
}: CreateProjectDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [allowSearch, setAllowSearch] = useState(true);
  const prefixDirty = useRef(false);
  const navigate = useNavigate();
  const refreshProjects = useProjectsStore((state) => state.refresh);

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingTemplates(true);
      projectsApi
        .templates()
        .then((response) => {
          setTemplates(response.data?.templates ?? []);
        })
        .catch(() => {
          // Template loading failed - user will see empty list
        })
        .finally(() => {
          setIsLoadingTemplates(false);
        });
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setName("");
      setPrefix("");
      setSelectedTemplate("");
      setAllowSearch(true);
      prefixDirty.current = false;
    }
  }, [open]);

  const handleNext = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setIsPending(true);
    try {
      const response = await projectsApi.create({
        name: name.trim(),
        prefix: prefix.trim().toLowerCase() || "project",
        template: selectedTemplate,
        privacy: allowSearch ? "public" : "private",
      });

      const fingerprint = response.data?.fingerprint;
      await refreshProjects();

      toast.success("Project created");
      onOpenChange?.(false);

      if (fingerprint) {
        void navigate({
          to: "/$projectId",
          params: { projectId: fingerprint },
        });
      } else {
        void navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create project"));
    } finally {
      setIsPending(false);
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.id === "blank") return -1;
    if (b.id === "blank") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 size-4" />
            Create project
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <FolderKanban className="size-4" />
            </div>
            {step === 1 ? "Create project" : "Choose a template"}
          </DialogTitle>
          <DialogDescription className="sr-only">Create a new project</DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!prefixDirty.current) {
                    setPrefix(nameToPrefix(e.target.value));
                  }
                }}
                placeholder="My project"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNext();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix</Label>
              <Input
                id="prefix"
                value={prefix}
                onChange={(e) => {
                  prefixDirty.current = true;
                  setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20));
                }}
                className="lowercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNext();
                  }
                }}
              />
              <p className="text-muted-foreground text-xs">
                Used for readable IDs like {prefix || "project"}-1, {prefix || "project"}-2
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <Label htmlFor="allow-search" className="text-sm font-medium cursor-pointer">
                Allow anyone to search for project
              </Label>
              <Switch
                id="allow-search"
                checked={allowSearch}
                onCheckedChange={setAllowSearch}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange?.(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mt-4 space-y-3">
              {isLoadingTemplates ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  Loading templates...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sortedTemplates.map((template) => {
                    const isSelected = selectedTemplate === template.id;
                    const IconComponent = {
                      "file": File,
                      "layout-grid": LayoutGrid,
                      "ticket": Ticket,
                      "zap": Zap,
                    }[template.icon] || FolderKanban;
                    return (
                      <div
                        key={template.id}
                        className={cn(
                          "relative flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all duration-200",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-accent/50",
                        )}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <IconComponent className="size-4" />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="cursor-pointer text-base font-semibold leading-none">
                              {template.name}
                            </span>
                            {isSelected && (
                              <div className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button type="submit" disabled={isPending || !selectedTemplate}>
                {isPending ? "Creating..." : <><Plus className="mr-2 size-4" />Create project</>}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
