// Mochi Projects: Design editor page
// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Trans, useLingui } from '@lingui/react/macro'
import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ConfirmDialog,
  IconButton,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  toast,
  getErrorMessage,
  usePageTitle,
} from "@mochi/web";
import { Download, Loader2, MoreHorizontal, Settings2, Upload } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails, ProjectTemplate } from "@/types";
import { canDesign } from "@/lib/access";
import { DesignEditor } from "@/features/editor";

export const Route = createFileRoute("/_authenticated/$projectId/design")({
  component: DesignPage,
});

function DesignPage() {
  const { t } = useLingui()
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const goBackToProject = () => navigate({ to: "/$projectId", params: { projectId } });

  const {
    data: projectData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await projectsApi.get(projectId);
      return response.data;
    },
  });

  const project = projectData as ProjectDetails | undefined;
  usePageTitle(project ? t`${project.project.name} - Design` : t`Design`);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    data: Record<string, unknown>;
    template?: string;
    templateVersion?: number;
    label: string;
  } | null>(null);


  // Export handler
  const handleExport = useCallback(async () => {
    if (!project) return;
    try {
      const response = await projectsApi.exportDesign(projectId);
      const json = JSON.stringify(response.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.project.name.toLowerCase().replace(/\s+/g, "-")}-design.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to export design`));
    }
  }, [projectId, project, t]);

  // Import confirmation handler
  const handleConfirmImport = useCallback(async () => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      await projectsApi.importDesign(
        projectId,
        pendingImport.data,
        pendingImport.template,
        pendingImport.templateVersion,
      );
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success(t`Design imported`);
      setConfirmOpen(false);
      setImportOpen(false);
      setPendingImport(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to import design`));
    } finally {
      setImporting(false);
    }
  }, [projectId, pendingImport, queryClient, t]);

  if (isLoading) {
    return (
      <Main>
        <ListSkeleton count={3} />
      </Main>
    );
  }

  if (error || !project) {
    return (
      <>
        <PageHeader
          title={t`Design`}
          icon={<Settings2 className="size-4 md:size-5" />}
          back={{ label: t`Back to project`, onFallback: goBackToProject }}
        />
        <Main>
          <GeneralError
            error={error ?? new Error(t`Failed to load project design`)}
            minimal
            mode="inline"
            reset={() => {
              void refetch();
            }}
          />
        </Main>
      </>
    );
  }

  if (!canDesign(project.project.access)) {
    return <Navigate to="/$projectId" params={{ projectId }} />;
  }

  return (
    <>
      <PageHeader
        title={t`${project.project.name} - Design`}
        icon={<Settings2 className="size-4 md:size-5" />}
        back={{ label: t`Back to project`, onFallback: goBackToProject }}
        menuAction={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                variant='ghost'
                className='size-8'
                label={t`Open design actions`}
              >
                <MoreHorizontal className="size-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="size-4 me-2" />
                <Trans>Export design</Trans>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportOpen(true)}>
                <Upload className="size-4 me-2" />
                <Trans>Import design</Trans>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <Main fixed fluid className="flex-1 !py-0">
        <DesignEditor projectId={projectId} project={project} />
      </Main>

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSelect={(data, template, templateVersion, label) => {
          setPendingImport({ data, template, templateVersion, label });
          setConfirmOpen(true);
        }}
      />

      {/* Confirm import dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t`Replace design?`}
        desc={
          <Trans>
            This will replace the current design with{" "}
            <strong>{pendingImport?.label}</strong>. All existing classes,
            fields, options, and views will be deleted. Existing objects will
            not be deleted but may no longer appear in views.
          </Trans>
        }
        confirmText={
          importing ? (
            <>
              <Loader2 className="size-4 me-1.5 animate-spin" />
              <Trans>Replacing...</Trans>
            </>
          ) : (
            <Trans>Replace design</Trans>
          )
        }
        handleConfirm={handleConfirmImport}
        isLoading={importing}
      >
        <Button variant="outline" className="w-full" onClick={handleExport} disabled={importing}>
          <Download className="size-4 me-1.5" />
          <Trans>Download backup first</Trans>
        </Button>
      </ConfirmDialog>
    </>
  );
}

// Import dialog: choose built-in template or upload JSON file
function ImportDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    data: Record<string, unknown>,
    template: string | undefined,
    templateVersion: number | undefined,
    label: string,
  ) => void;
}) {
  const { t } = useLingui()
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const response = await projectsApi.templates();
      return response.data.templates;
    },
    enabled: open,
  });

  const templates = templatesData || [];

  // Handle built-in template selection (backend loads the template file)
  const handleTemplateSelect = (template: ProjectTemplate) => {
    onSelect({}, template.id, template.version, template.name);
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        onSelect(data, undefined, undefined, file.name);
      } catch {
        toast.error(t`Invalid JSON file`);
      }
    };
    reader.onerror = () => {
      toast.error(t`Failed to read file`);
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle><Trans>Import design</Trans></ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {/* Built-in templates */}
          <div className="space-y-2">
            <p className="text-sm font-medium"><Trans>Built-in templates</Trans></p>
            <div className="space-y-1">
              {templates
                .filter((t) => t.id !== "blank")
                .map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-start px-3 py-2 text-sm rounded-lg border hover:bg-hover transition-colors"
                  >
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {template.description}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <p className="text-sm font-medium"><Trans>From file</Trans></p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4 me-1.5" />
              <Trans>Upload .json file</Trans>
            </Button>
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}


