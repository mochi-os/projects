// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useRef, useState, useMemo } from "react";
import { Trans, useLingui } from '@lingui/react/macro'
import { plural } from '@lingui/core/macro'
import { useNavigate } from "@tanstack/react-router";
import { Button, cn, getErrorMessage, Input, Label, naturalCompare, ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogTrigger, Switch, toast, toastAction, Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentAction, Tooltip, TooltipContent, TooltipTrigger } from "@mochi/web"
import { ArrowLeft, ArrowRight, Check, File, FolderKanban, LayoutGrid, Plus, Ticket, Upload, Zap, X } from "lucide-react";
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
  const { t } = useLingui()
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [allowSearch, setAllowSearch] = useState(true);
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setImportData(null);
      setImportFileName("");
      prefixDirty.current = false;
    }
  }, [open]);

  const handleNext = () => {
    if (!name.trim()) {
      toast.error(t`Name is required`);
      return;
    }
    // A backup with an embedded design needs no template choice — create
    // straight from the file.
    if (importDesign) {
      void handleSubmit();
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!importDesign && !selectedTemplate) {
      toast.error(t`Please select a template`);
      return;
    }

    setIsPending(true);
    try {
      const response = await toastAction(
        projectsApi.create({
          name: name.trim(),
          prefix: prefix.trim().toLowerCase() || "project",
          template: importDesign ? "blank" : selectedTemplate,
          privacy: allowSearch ? "public" : "private",
        }),
        {
          loading: t`Creating project...`,
          success: t`Project created`,
          error: (e) => getErrorMessage(e, t`Failed to create project`),
        }
      );

      const fingerprint = response.data?.fingerprint;

      if (fingerprint && importData) {
        const importObjects: Record<string, unknown> = { ...importData };
        delete importObjects.design;
        // A design-only backup (an empty project) has nothing for
        // data/import, which rejects an empty payload — skip the call
        // rather than fail and roll the new project back.
        const importHasData =
          (Array.isArray(importObjects.objects) && importObjects.objects.length > 0) ||
          (Array.isArray(importObjects.links) && importObjects.links.length > 0);
        if (importDesign || importHasData) {
          try {
            await toastAction(
              (async () => {
                if (importDesign) {
                  await projectsApi.importDesign(fingerprint, importDesign);
                }
                return importHasData ? projectsApi.importData(fingerprint, importObjects) : null;
              })(),
              {
                loading: t`Importing data...`,
                success: (imported) =>
                  imported
                    ? t`Data imported (${plural(imported.data?.objects ?? 0, { one: '# object', other: '# objects' })}, ${plural(imported.data?.comments ?? 0, { one: '# comment', other: '# comments' })}, ${plural(imported.data?.links ?? 0, { one: '# link', other: '# links' })})`
                    : t`Design imported`,
                error: (e) => getErrorMessage(e, t`Failed to import data`),
              }
            );
          } catch (e) {
            // If import fails, rollback project creation
            await projectsApi.delete(fingerprint).catch(() => {});
            throw e; // Stop execution, avoid navigation
          }
        }
      }

      await refreshProjects();

      onOpenChange?.(false);

      if (fingerprint) {
        void navigate({
          to: "/$projectId",
          params: { projectId: fingerprint },
        });
      } else {
        void navigate({ to: "/" });
      }
    } catch {
      // toast already shown
    } finally {
      setIsPending(false);
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    if (a.id === "blank") return -1;
    if (b.id === "blank") return 1;
    return naturalCompare(a.name, b.name);
  });



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        setImportData(data);
        setImportFileName(file.name);
      } catch {
        toast.error(t`Invalid JSON file`);
        setImportData(null);
        setImportFileName("");
      }
    };
    reader.onerror = () => {
      toast.error(t`Failed to read file`);
      setImportData(null);
      setImportFileName("");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Design snapshot embedded in the backup (newer exports). When present, the
  // project is recreated from it directly and the template step is skipped —
  // recreating from a built-in template breaks on any customized or drifted
  // design (added classes, extra hierarchy rules, custom fields).
  const importDesign = useMemo(() => {
    if (!importData) return null;
    const design = importData.design;
    return design && typeof design === "object" && !Array.isArray(design)
      ? (design as Record<string, unknown>)
      : null;
  }, [importData]);

  const importClasses = useMemo(() => {
    if (!importData || !Array.isArray((importData as any).objects)) return [];
    const classes = new Set<string>();
    (importData as any).objects.forEach((obj: any) => {
      if (obj.class) classes.add(obj.class);
    });
    return Array.from(classes);
  }, [importData]);

  // Display names for the backup's class ids, resolved from the templates'
  // translated class labels; unknown ids fall back to the raw id.
  const importClassNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const template of templates) {
      for (const c of template.classes ?? []) {
        if (!names.has(c.id)) names.set(c.id, c.name);
      }
    }
    return importClasses.map((id) => names.get(id) ?? id);
  }, [templates, importClasses]);

  // Auto-select template based on detected classes
  useEffect(() => {
    if (importClasses.length === 0) return;
    
    if (importClasses.includes("card") || importClasses.includes("checklist")) {
      setSelectedTemplate("kanban");
    } else if (importClasses.includes("ticket")) {
      setSelectedTemplate("tickets");
    } else if (importClasses.includes("story") || importClasses.includes("epic") || importClasses.includes("bug")) {
      setSelectedTemplate("agile");
    } else {
      setSelectedTemplate("blank");
    }
  }, [importClasses]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <ResponsiveDialogTrigger asChild>
          <Button>
            <Plus className="me-2 size-4" />
            <Trans>Create project</Trans>
          </Button>
        </ResponsiveDialogTrigger>
      )}
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <FolderKanban className="size-4" />
            </div>
            {step === 1 ? <Trans>Create project</Trans> : <Trans>Choose a template</Trans>}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only"><Trans>Create a new project</Trans></ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {step === 1 ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name"><Trans>Name</Trans></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!prefixDirty.current) {
                    setPrefix(nameToPrefix(e.target.value));
                  }
                }}
                placeholder={t`My project`}
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
              <Label htmlFor="prefix"><Trans>Prefix</Trans></Label>
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
                <Trans>Used for readable IDs like {prefix || "project"}-1, {prefix || "project"}-2</Trans>
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <Label htmlFor="allow-search" className="text-sm font-medium cursor-pointer">
                <Trans>Allow anyone to search for project</Trans>
              </Label>
              <Switch
                id="allow-search"
                checked={allowSearch}
                onCheckedChange={setAllowSearch}
              />
            </div>

            <div className="space-y-2">
              <Label><Trans>Import from backup (optional)</Trans></Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4 me-1.5" />
                  <Trans>Upload .json file</Trans>
                </Button>
              </div>
              {importFileName && (
                <div className="mt-2">
                  <Attachment orientation="horizontal">
                    <AttachmentMedia>
                      <Upload className="size-4" />
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{importFileName}</AttachmentTitle>
                    </AttachmentContent>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AttachmentAction
                          variant="ghost"
                          onClick={() => {
                            setImportData(null);
                            setImportFileName("");
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                        >
                          <X className="size-4" />
                        </AttachmentAction>
                      </TooltipTrigger>
                      <TooltipContent><Trans>Remove</Trans></TooltipContent>
                    </Tooltip>
                  </Attachment>
                </div>
              )}
            </div>

            <ResponsiveDialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange?.(false)}
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button type="button" onClick={handleNext} disabled={isPending}>
                {importDesign ? (
                  isPending ? <Trans>Creating...</Trans> : <><Plus className="me-2 size-4" /><Trans>Create project</Trans></>
                ) : (
                  <><Trans>Next</Trans><ArrowRight className="ms-2 size-4 rtl:rotate-180" /></>
                )}
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mt-4 space-y-3">
              {importData && importClasses.length > 0 && (
                <div className="bg-primary/10 text-foreground border-primary/20 mb-4 rounded-lg border p-3 text-sm">
                  <Trans>Your backup contains objects of type:</Trans>{" "}
                  <span className="text-primary font-semibold">
                    {importClassNames.join(", ")}
                  </span>.{" "}
                  <Trans>We have auto-selected the best matching template.</Trans>
                </div>
              )}
              {isLoadingTemplates ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  <Trans>Loading templates...</Trans>
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
                            : "border-border hover:border-primary/30 hover:bg-hover/50",
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


            <ResponsiveDialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="me-2 size-4 rtl:rotate-180" />
                <Trans>Back</Trans>
              </Button>
              <Button type="submit" disabled={isPending || !selectedTemplate}>
                {isPending ? <Trans>Creating...</Trans> : <><Plus className="me-2 size-4" /><Trans>Create project</Trans></>}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
