// Mochi Projects: Project settings page
// Copyright Alistair Cunningham 2026

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trans, useLingui } from '@lingui/react/macro'
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ConfirmDialog,
  PageHeader,
  Main,
  cn,
  usePageTitle,
  Input,
  Textarea,
  EmptyState,
  Skeleton,
  Section,
  FieldRow,
  DataChip,
  toast,
  getErrorMessage,
  extractStatus,
  AccessDialog,
  AccessList,
  coerceObjectArray,
  GeneralError,
  type AccessRule,
  type AccessLevel,
} from "@mochi/web";
import {
  Loader2,
  FolderKanban,
  Settings,
  Shield,
  Trash2,
  Pencil,
  Check,
  X,
  Plus,
} from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
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
      await projectsApi.delete(project.project.id);
      void refreshSidebar();
      toast.success(t`Project deleted`);
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to delete project`));
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
        await projectsApi.update(project.project.id, updates);
        void refreshSidebar();
        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        toast.success(t`Project updated`);
      } catch (err) {
        toast.error(getErrorMessage(err, t`Failed to update project`));
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
          <div className="flex gap-1 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  "border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
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
  const { t } = useLingui()
  const projectName = project.project.name
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
            isOwner={isOwner}
            onSave={(value) => onUpdate({ name: value })}
            validate={validateName}
          />

          <EditableFieldRow
            label={t`Description`}
            value={project.project.description}
            isOwner={isOwner}
            onSave={(value) => onUpdate({ description: value })}
            multiline
          />

          <EditableFieldRow
            label={t`Prefix`}
            value={project.project.prefix}
            isOwner={isOwner}
            onSave={(value) => onUpdate({ prefix: value })}
            validate={validatePrefix}
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
    </div>
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

interface EditableFieldRowProps {
  label: string;
  value: string;
  isOwner: boolean;
  onSave: (value: string) => Promise<void>;
  validate?: (t: Translator, value: string) => string | null;
  multiline?: boolean;
}

function EditableFieldRow({
  label,
  value,
  isOwner,
  onSave,
  validate,
  multiline,
}: EditableFieldRowProps) {
  const { t } = useLingui();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setEditValue(value);
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSaveEdit = async () => {
    const trimmedValue = editValue.trim();
    if (validate) {
      const validationError = validate(t, trimmedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    if (trimmedValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FieldRow label={label}>
      {isOwner && isEditing ? (
        <div className="flex flex-col gap-1 w-full max-w-md">
          <div className="flex items-start gap-2">
            {multiline ? (
              <Textarea
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="min-h-[80px]"
                disabled={isSaving}
                autoFocus
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="h-9"
                disabled={isSaving}
                autoFocus
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleSaveEdit()}
              disabled={isSaving}
              className="h-9 w-9 p-0 shrink-0"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4 text-green-600" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="h-9 w-9 p-0 shrink-0"
              aria-label={t`Cancel edit`}
            >
              <X className="size-4 text-destructive" />
            </Button>
          </div>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {value ? (
            <span className={label === "Name" ? "text-base font-semibold" : ""}>
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground italic"><Trans>Not set</Trans></span>
          )}
          {isOwner && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStartEdit}
              className="h-6 w-6 p-0 hover:bg-muted"
              aria-label={t`Edit field`}
            >
              <Pencil className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      )}
    </FieldRow>
  );
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
    try {
      await projectsApi.setAccessLevel(projectId, subject, level);
      toast.success(t`Access set for ${subjectName}`);
      await refetchRules();
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to set access level`));
      throw err;
    }
  };

  const handleRevoke = async (subject: string) => {
    if (!canManageRules) return;
    try {
      await projectsApi.revokeAccess(projectId, subject);
      toast.success(t`Access removed`);
      await refetchRules();
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to remove access`));
    }
  };

  const handleLevelChange = async (subject: string, newLevel: string) => {
    if (!canManageRules) return;
    try {
      await projectsApi.setAccessLevel(projectId, subject, newLevel);
      toast.success(t`Access level updated`);
      await refetchRules();
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to update access level`));
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
