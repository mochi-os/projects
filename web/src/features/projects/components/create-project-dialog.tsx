import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
  getErrorMessage,
  RadioGroup,
  RadioGroupItem,
} from "@mochi/common";
import { Check, FolderKanban, Plus } from "lucide-react";
import { cn } from "@mochi/common";
import projectsApi from "@/api/projects";
import { useProjectsStore } from "@/stores/projects-store";
import type { ProjectTemplate } from "@/types";

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
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("simple");
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setIsPending(true);
    try {
      const response = await projectsApi.create({
        name: name.trim(),
        prefix: prefix.trim().toUpperCase() || "PROJ",
        template: selectedTemplate,
        privacy: "private",
      });

      const fingerprint = response.data?.fingerprint;
      await refreshProjects();

      toast.success("Project created");
      onOpenChange?.(false);
      setName("");
      setPrefix("");
      setSelectedTemplate("simple");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 size-4" />
            New project
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <FolderKanban className="size-4" />
              </div>
              Create project
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My project"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix</Label>
              <Input
                id="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="PROJ"
                className="uppercase"
              />
              <p className="text-muted-foreground text-xs">
                Used for readable IDs like {prefix || "PROJ"}-1, {prefix || "PROJ"}-2
              </p>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              {isLoadingTemplates ? (
                <div className="text-muted-foreground py-4 text-center text-sm">
                  Loading templates...
                </div>
              ) : (
                <RadioGroup
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                  className="grid grid-cols-1 gap-3"
                >
                  {templates.map((template) => {
                    const isSelected = selectedTemplate === template.id;
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
                        <RadioGroupItem
                          value={template.id}
                          id={template.id}
                          className="sr-only"
                        />
                        <div
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-transparent",
                          )}
                        >
                          {isSelected && <Check className="size-3 stroke-[3]" />}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label
                            htmlFor={template.id}
                            className="cursor-pointer text-base font-semibold leading-none"
                          >
                            {template.name}
                          </Label>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedTemplate}>
              {isPending ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
