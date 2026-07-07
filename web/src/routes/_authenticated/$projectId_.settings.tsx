// Mochi Projects: Project settings page
// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trans, useLingui } from '@lingui/react/macro'
import { plural } from '@lingui/core/macro'
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ConfirmDialog,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  PageHeader,
  Main,
  Tabs,
  TabsList,
  TabsTrigger,
  usePageTitle,
  EmptyState,
  Skeleton,
  Section,
  FieldRow,
  EditableFieldRow,
  DataChip,
  toastAction,
  getErrorMessage,
  extractStatus,
  AccessDialog,
  AccessList,
  coerceObjectArray,
  GeneralError,
  toast,
  type AccessRule,
  type AccessLevel,
} from "@mochi/web";
import {
  FolderKanban,
  Settings,
  Shield,
  Trash2,
  Plus,
  FileDown,
  FileUp,
  Upload,
  Loader2,
} from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { canDesign } from "@/lib/access";
import { useProjectsStore } from "@/stores/projects-store";

// Characters disallowed in project names (matches backend validation)
const DISALLOWED_NAME_CHARS = /[<>\r\n]/;


type TabId = "general" | "access";

type SettingsSearch = {
  tab?: TabId;
};

export const Route = createFileRoute("/_authenticated/$projectId_/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab:
      search.tab === "general" || search.tab === "access"
        ? search.tab
        : undefined,
  }),
  component: ProjectSettingsPage,
});

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

function ProjectSettingsPage() {
  const { t } = useLingui()
  const tabs: Tab[] = [
    { id: "general", label: t`Settings`, icon: <Settings className="h-4 w-4" /> },
    { id: "access", label: t`Access`, icon: <Shield className="h-4 w-4" /> },
  ];
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const navigateSettings = Route.useNavigate();
  const { tab } = Route.useSearch();
  const activeTab = tab ?? "general";
  const queryClient = useQueryClient();
  const refreshSidebar = useProjectsStore((state) => state.refresh);
  const goBackToProject = () => navigate({ to: "/$projectId", params: { projectId } });

  const setActiveTab = (newTab: TabId) => {
    void navigateSettings({ search: { tab: newTab }, replace: true });
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    data: projectData,
    isLoading,
    error,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await projectsApi.get(projectId);
      return response.data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const project = projectData as ProjectDetails | undefined;
  const isOwner = project?.project.owner === 1;
  const projectStatus = extractStatus(error);
  const projectLookupError =
    error && projectStatus !== 403 && projectStatus !== 404
      ? error
      : null;
  const projectNotFound =
    !project &&
    (projectStatus === 403 || projectStatus === 404 || (!isLoading && !error));

  usePageTitle(
    project ? t`${project.project.name} settings` : t`Project settings`
  );

  const handleDelete = useCallback(async () => {
    if (!project || !isOwner || isDeleting) return;

    setIsDeleting(true);
    try {
      await toastAction(projectsApi.delete(project.project.id), {
        loading: t`Deleting project...`,
        success: t`Project deleted`,
        error: (e) => getErrorMessage(e, t`Failed to delete project`),
      });
      void refreshSidebar();
      void navigate({ to: "/" });
    } catch {
      // toast already shown
    } finally {
      setIsDeleting(false);
    }
  }, [project, isOwner, isDeleting, refreshSidebar, navigate, t]);

  const handleUpdate = useCallback(
    async (updates: {
      name?: string;
      description?: string;
      prefix?: string;
    }) => {
      if (!project || !isOwner) return;

      try {
        await toastAction(projectsApi.update(project.project.id, updates), {
          loading: t`Saving...`,
          success: t`Project updated`,
          error: (e) => getErrorMessage(e, t`Failed to update project`),
        });
        void refreshSidebar();
        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      } catch (err) {
        throw err;
      }
    },
    [project, isOwner, refreshSidebar, queryClient, projectId, t]
  );

  if (isLoading) {
    return (
      <>
        <PageHeader
          title={t`Settings`}
          icon={<Settings className="size-4 md:size-5" />}
          back={{ label: t`Back to project`, onFallback: goBackToProject }}
        />
        <Main className="space-y-6">
          <div className="flex gap-1 border-b">
            <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-transparent">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="pt-2">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </Main>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <PageHeader
          title={t`Settings`}
          icon={<Settings className="size-4 md:size-5" />}
          back={{ label: t`Back to project`, onFallback: goBackToProject }}
        />
        <Main>
          {projectLookupError ? (
            <GeneralError
              error={projectLookupError}
              minimal
              mode="inline"
              reset={() => {
                void refetchProject();
              }}
            />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title={projectNotFound ? t`Project not found` : t`Project unavailable`}
              description={
                projectNotFound
                  ? t`This project may have been deleted or you don't have access to it.` : t`This project could not be loaded right now.`
              }
            />
          )}
        </Main>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t`${project.project.name} settings`}
        icon={<Settings className="size-4 md:size-5" />}
        back={{ label: t`Back to project`, onFallback: goBackToProject }}
      />
      <Main className="space-y-6">
        {/* Tabs - only show for owners */}
        {isOwner && (
          <Tabs
            variant="underline"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabId)}
          >
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Tab content */}
        <div className="pt-2">
          {activeTab === "general" && (
            <GeneralTab
              project={project}
              isOwner={isOwner}
              isDeleting={isDeleting}
              showDeleteDialog={showDeleteDialog}
              setShowDeleteDialog={setShowDeleteDialog}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          )}
          {activeTab === "access" && isOwner && (
            <AccessTab projectId={project.project.id} />
          )}
        </div>
      </Main>
    </>
  );
}

interface GeneralTabProps {
  project: ProjectDetails;
  isOwner: boolean;
  isDeleting: boolean;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  onDelete: () => void;
  onUpdate: (updates: {
    name?: string;
    description?: string;
    prefix?: string;
  }) => Promise<void>;
}

function GeneralTab({
  project,
  isOwner,
  isDeleting,
  showDeleteDialog,
  setShowDeleteDialog,
  onDelete,
  onUpdate,
}: GeneralTabProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const projectName = project.project.name;
  const projectId = project.project.id;

  // Data import dialog state
  const [dataImportOpen, setDataImportOpen] = useState(false);
  const [dataConfirmOpen, setDataConfirmOpen] = useState(false);
  const [dataImporting, setDataImporting] = useState(false);
  const [pendingDataImport, setPendingDataImport] = useState<{
    data: Record<string, unknown>;
    label: string;
  } | null>(null);

  // Data Export handler
  const handleDataExport = useCallback(async () => {
    try {
      const response = await projectsApi.exportData(projectId);
      const json = JSON.stringify(response.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.project.name.toLowerCase().replace(/\s+/g, "-")}-data.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to export data`));
    }
  }, [projectId, project, t]);

  // Data Import confirmation handler
  const handleConfirmDataImport = useCallback(async () => {
    if (!pendingDataImport) return;
    setDataImporting(true);
    try {
      const response = await projectsApi.importData(
        projectId,
        pendingDataImport.data,
      );
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success(t`Data imported (${plural(response.data?.objects ?? 0, { one: '# object', other: '# objects' })}, ${plural(response.data?.comments ?? 0, { one: '# comment', other: '# comments' })}, ${plural(response.data?.links ?? 0, { one: '# link', other: '# links' })})`);
      setDataConfirmOpen(false);
      setDataImportOpen(false);
      setPendingDataImport(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to import data`));
    } finally {
      setDataImporting(false);
    }
  }, [projectId, pendingDataImport, queryClient, t]);

  return (
    <div className="space-y-6">
      <Section
        title={t`Identity`}
        description={t`Core information about this project`}
      >
        <div className="divide-y-0">
          <EditableFieldRow
            label={t`Name`}
            value={project.project.name}
            canEdit={isOwner}
            onSave={(value) => onUpdate({ name: value })}
            validate={(value) => validateName(t, value)}
            emphasize
          />

          <EditableFieldRow
            label={t`Description`}
            value={project.project.description}
            canEdit={isOwner}
            onSave={(value) => onUpdate({ description: value })}
            multiline
          />

          <EditableFieldRow
            label={t`Prefix`}
            value={project.project.prefix}
            canEdit={isOwner}
            onSave={(value) => onUpdate({ prefix: value })}
            validate={(value) => validatePrefix(t, value)}
          />

          <FieldRow label={t`Entity ID`}>
            <DataChip value={project.project.id} truncate='middle' />
          </FieldRow>

          {project.project.fingerprint && (
            <FieldRow label={t`Fingerprint`}>
              <DataChip
                value={project.project.fingerprint}
                truncate='middle'
              />
            </FieldRow>
          )}

          {project.project.server && (
            <FieldRow label={t`Server`}>
              <DataChip value={project.project.server} />
            </FieldRow>
          )}
        </div>
      </Section>

      {isOwner && (
        <Section
          title={t`Delete project`}
          description={t`Permanently delete this project and all its content.`}
          action={
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              size="sm"
            >
              <Trash2 className="size-4 me-2" />
              <Trans>Delete</Trans>
            </Button>
          }
        />
      )}

      <Section
        title={t`Data management`}
        description={t`Export or import the raw data content in this project.`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDataExport}>
              <FileDown className="size-4 me-1.5" />
              <Trans>Export data</Trans>
            </Button>
            {canDesign(project.project.access) && (
              <Button variant="outline" onClick={() => setDataImportOpen(true)}>
                <FileUp className="size-4 me-1.5" />
                <Trans>Import data</Trans>
              </Button>
            )}
          </div>
        }
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t`Delete project?`}
        desc={t`This will permanently delete "${projectName}" and all its objects, comments, and attachments. This action cannot be undone.`}
        confirmText={t`Delete project`}
        destructive
        handleConfirm={onDelete}
        isLoading={isDeleting}
      />

      {/* Data Import dialog */}
      <DataImportDialog
        open={dataImportOpen}
        onOpenChange={setDataImportOpen}
        onSelect={(data: Record<string, unknown>, label: string) => {
          setPendingDataImport({ data, label });
          setDataConfirmOpen(true);
        }}
      />

      {/* Confirm data import dialog */}
      <ConfirmDialog
        open={dataConfirmOpen}
        onOpenChange={setDataConfirmOpen}
        title={t`Import data?`}
        desc={
          <Trans>
            This will import the data from{" "}
            <strong>{pendingDataImport?.label}</strong>. Objects will be appended to the existing records. Ensure the current design matches the classes and fields referenced in the file.
          </Trans>
        }
        confirmText={
          dataImporting ? (
            <>
              <Loader2 className="size-4 me-1.5 animate-spin" />
              <Trans>Importing...</Trans>
            </>
          ) : (
            t`Import data`
          )
        }
        handleConfirm={handleConfirmDataImport}
        isLoading={dataImporting}
      >
        <Button variant="outline" className="w-full" onClick={handleDataExport} disabled={dataImporting}>
          <FileDown className="size-4 me-1.5" />
          <Trans>Download backup first</Trans>
        </Button>
      </ConfirmDialog>
    </div>
  );
}

// Data Import dialog: upload JSON file
function DataImportDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    data: Record<string, unknown>,
    label: string,
  ) => void;
}) {
  const { t } = useLingui()
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        onSelect(data, file.name);
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
          <ResponsiveDialogTitle><Trans>Import data</Trans></ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only"><Trans>Import a data configuration</Trans></ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
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

type Translator = ReturnType<typeof useLingui>["t"];

function validateName(t: Translator, name: string): string | null {
  if (!name.trim()) return t`Project name is required`;
  if (name.length > 1000) return t`Name must be 1000 characters or less`;
  if (DISALLOWED_NAME_CHARS.test(name))
    return t`Name cannot contain < or > characters`;
  return null;
}

function validatePrefix(t: Translator, prefix: string): string | null {
  if (prefix && !/^[A-Za-z0-9-]+$/.test(prefix))
    return t`Prefix can only contain letters, numbers, and hyphens`;
  if (prefix.length > 10) return t`Prefix must be 10 characters or less`;
  return null;
}


// Access levels for projects
interface AccessTabProps {
  projectId: string;
}

function AccessTab({ projectId }: AccessTabProps) {
  const { t } = useLingui()
  const PROJECTS_ACCESS_LEVELS: AccessLevel[] = [
    { value: "design", label: t`Design, create, edit, comment, and view` },
    { value: "write", label: t`Create, edit, comment, and view` },
    { value: "comment", label: t`Comment and view` },
    { value: "view", label: t`View only` },
    { value: "none", label: t`No access` },
  ];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const {
    data: rulesData,
    isLoading: isLoadingRules,
    error: rulesErrorRaw,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ["projects", "access-rules", projectId],
    queryFn: () => projectsApi.getAccessRules(projectId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: userSearchData,
    isLoading: userSearchLoading,
    error: userSearchErrorRaw,
    refetch: refetchUserSearch,
  } = useQuery({
    queryKey: ["users", "search", userSearchQuery],
    queryFn: () => projectsApi.searchUsers(userSearchQuery),
    enabled: userSearchQuery.length >= 1,
    retry: false,
  });

  const {
    data: groupsData,
    error: groupsErrorRaw,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["groups", "list"],
    queryFn: () => projectsApi.listGroups(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const rules = useMemo<AccessRule[]>(
    () => coerceObjectArray<AccessRule>(rulesData?.data?.rules),
    [rulesData],
  );
  const rulesError = rulesErrorRaw ?? null;
  const userSearchError =
    userSearchQuery.length >= 1 && userSearchErrorRaw
      ? userSearchErrorRaw
      : null;
  const groupsError = groupsErrorRaw ?? null;
  const canManageRules = !rulesError && !isLoadingRules && !!rulesData;
  const userSearchResults = coerceObjectArray<{ id: string; name: string }>(
    userSearchData?.data?.results,
  );
  const groups = coerceObjectArray<{ id: string; name: string; description?: string }>(
    groupsData?.data?.groups,
  );

  const handleAdd = async (
    subject: string,
    subjectName: string,
    level: string
  ) => {
    if (!canManageRules) return;
    await toastAction(projectsApi.setAccessLevel(projectId, subject, level), {
      loading: t`Setting access...`,
      success: t`Access set for ${subjectName}`,
      error: (e) => getErrorMessage(e, t`Failed to set access level`),
    });
    await refetchRules();
  };

  const handleRevoke = async (subject: string) => {
    if (!canManageRules) return;
    try {
      await toastAction(projectsApi.revokeAccess(projectId, subject), {
        loading: t`Removing access...`,
        success: t`Access removed`,
        error: (e) => getErrorMessage(e, t`Failed to remove access`),
      });
      await refetchRules();
    } catch {
      // toast already shown
    }
  };

  const handleLevelChange = async (subject: string, newLevel: string) => {
    if (!canManageRules) return;
    try {
      await toastAction(projectsApi.setAccessLevel(projectId, subject, newLevel), {
        loading: t`Updating access...`,
        success: t`Access level updated`,
        error: (e) => getErrorMessage(e, t`Failed to update access level`),
      });
      await refetchRules();
    } catch {
      // toast already shown
    }
  };

  return (
    <Section
      title={t`Access Management`}
      description={t`Control who can view and interact with this project`}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setDialogOpen(true)} size="sm" disabled={!canManageRules}>
            <Plus className="h-4 w-4 me-2" />
            <Trans>Add rule</Trans>
          </Button>
        </div>

        <AccessDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdd={handleAdd}
          levels={PROJECTS_ACCESS_LEVELS}
          defaultLevel="comment"
          userSearchResults={userSearchResults}
          userSearchLoading={userSearchLoading}
          userSearchError={userSearchError}
          onRetryUserSearch={() => {
            void refetchUserSearch();
          }}
          onUserSearch={setUserSearchQuery}
          groups={groups}
          groupsError={groupsError}
          onRetryGroups={() => {
            void refetchGroups();
          }}
        />

        {rulesError ? (
          <GeneralError
            error={rulesError}
            minimal
            mode="inline"
            reset={() => {
              void refetchRules();
            }}
          />
        ) : (
          <AccessList
            rules={rules}
            levels={PROJECTS_ACCESS_LEVELS}
            onLevelChange={handleLevelChange}
            onRevoke={handleRevoke}
            isLoading={isLoadingRules}
            error={null}
          />
        )}
      </div>
    </Section>
  );
}
