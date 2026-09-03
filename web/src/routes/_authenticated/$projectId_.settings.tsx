// Mochi Projects: Project settings page
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The page body is EntitySettingsPage in @mochi/web, shared with the crm app.
// What stays here is the route and its tab param, the wording, the name and
// prefix rules, the access ladder, and the prefix row itself, which only this
// app has.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLingui } from '@lingui/react/macro'
import {
  EditableFieldRow,
  EntitySettingsPage,
  type AccessLevel,
  type EntitySettingsTab,
  DISALLOWED_NAME_CHARS,
} from "@mochi/web";
import { FolderKanban } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { useProjectsStore } from "@/stores/projects-store";

type SettingsSearch = {
  tab?: EntitySettingsTab;
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

function ProjectSettingsPage() {
  const { t } = useLingui()
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const navigateSettings = Route.useNavigate();
  const { tab } = Route.useSearch();
  const refreshSidebar = useProjectsStore((state) => state.refresh);

  const accessLevels: AccessLevel[] = [
    { value: "design", label: t`Design, create, edit, comment, and view` },
    { value: "write", label: t`Create, edit, comment, and view` },
    { value: "comment", label: t`Comment and view` },
    { value: "view", label: t`View only` },
    { value: "none", label: t`No access` },
  ];

  return (
    <EntitySettingsPage<ProjectDetails["project"], ProjectDetails>
      containerId={projectId}
      selectContainer={(details) => details.project}
      queryKey="project"
      accessRulesKey="projects"
      api={projectsApi}
      icon={FolderKanban}
      accessLevels={accessLevels}
      activeTab={tab ?? "general"}
      onTabChange={(newTab) =>
        void navigateSettings({ search: { tab: newTab }, replace: true })
      }
      onBack={() => void navigate({ to: "/$projectId", params: { projectId } })}
      onDeleted={() => void navigate({ to: "/" })}
      refreshSidebar={refreshSidebar}
      validateName={(name) => {
        if (!name.trim()) return t`Project name is required`;
        if (name.length > 1000) return t`Name must be 1000 characters or less`;
        if (DISALLOWED_NAME_CHARS.test(name))
          return t`Name cannot contain < or > characters`;
        return null;
      }}
      renderIdentityExtras={({ container, canEdit, onUpdate }) => (
        // The prefix is this app's alone: it is what makes an object readable
        // as PROJ-14, and crm issues no object numbers at all.
        <EditableFieldRow
          label={t`Prefix`}
          value={container.prefix}
          canEdit={canEdit}
          onSave={(value) => onUpdate({ prefix: value })}
          validate={(value) => {
            // Lowercase and 20: what create-project-dialog produces and what
            // the server stores. This row used to accept mixed case and cap at
            // 10, so it both refused valid prefixes and admitted ones the
            // create path cannot make.
            if (value && !/^[a-z0-9-]+$/.test(value))
              return t`Prefix can only contain lowercase letters, numbers, and hyphens`;
            if (value.length > 20)
              return t`Prefix must be 20 characters or less`;
            return null;
          }}
        />
      )}
      labels={{
        settings: t`Settings`,
        access: t`Access`,
        back: t`Back to project`,
        // `String(name)` rather than a variable, so the extracted message keeps
        // the positional placeholder this app already ships.
        pageTitle: (name) =>
          name ? t`${String(name)} settings` : t`Project settings`,
        notFound: t`Project not found`,
        notFoundDescription: t`This project may have been deleted or you don't have access to it.`,
        unavailable: t`Project unavailable`,
        unavailableDescription: t`This project could not be loaded right now.`,
        identity: t`Identity`,
        name: t`Name`,
        description: t`Description`,
        entityId: t`Entity ID`,
        fingerprint: t`Fingerprint`,
        server: t`Server`,
        saving: t`Saving...`,
        updated: t`Project updated`,
        updateFailed: t`Failed to update project`,
        deleteSection: t`Delete project`,
        delete: t`Delete`,
        deleteTitle: t`Delete project?`,
        deleteConfirm: t`Delete project`,
        deleteDescription: (name) => {
          const projectName = name;
          return t`This will permanently delete "${projectName}" and all its objects, comments, and attachments. This action cannot be undone.`;
        },
        deleting: t`Deleting project...`,
        deleted: t`Project deleted`,
        deleteFailed: t`Failed to delete project`,
        accessManagement: t`Access management`,
        addRule: t`Add rule`,
        settingAccess: t`Setting access...`,
        accessSet: (subjectName) => t`Access set for ${subjectName}`,
        setAccessFailed: t`Failed to set access level`,
        removingAccess: t`Removing access...`,
        accessRemoved: t`Access removed`,
        removeAccessFailed: t`Failed to remove access`,
        updatingAccess: t`Updating access...`,
        accessUpdated: t`Access level updated`,
        updateAccessFailed: t`Failed to update access level`,
      }}
    />
  );
}
