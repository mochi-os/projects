// Mochi Projects: Design editor page
// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The page body is EntityDesignPage in @mochi/web, shared with the crm app.
// What stays here is the route, the wording, this app's design editor, and the
// built-in template list, which crm has no equivalent for.

import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from "@tanstack/react-query";
import { EntityDesignPage, type EntityDesignImport } from "@mochi/web";
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

  return (
    <EntityDesignPage<ProjectDetails["project"], ProjectDetails>
      containerId={projectId}
      selectContainer={(details) => details.project}
      queryKey="project"
      api={projectsApi}
      canDesign={(details) => canDesign(details.project.access)}
      renderRedirect={() => <Navigate to="/$projectId" params={{ projectId }} />}
      onBack={() => void navigate({ to: "/$projectId", params: { projectId } })}
      renderEditor={(details) => (
        <DesignEditor projectId={projectId} project={details} />
      )}
      renderTemplates={(select) => <TemplateList onSelect={select} />}
      labels={{
        design: t`Design`,
        // `String(name)` rather than a variable, so the extracted message keeps
        // the positional placeholder this app already ships.
        pageTitle: (name) => (name ? t`${String(name)} - Design` : t`Design`),
        back: t`Back to project`,
        loadFailed: t`Failed to load project design`,
        pageActions: t`Open design actions`,
        exportAction: t`Export design`,
        importAction: t`Import design`,
        downloaded: (filename) => t`Downloaded ${filename}`,
        exportFailed: t`Failed to export design`,
        imported: t`Design imported`,
        importFailed: t`Failed to import design`,
        importTitle: t`Import design`,
        fileSection: t`From file`,
        uploadFile: t`Upload .json file`,
        invalidJson: t`Invalid JSON file`,
        readFailed: t`Failed to read file`,
        cancel: t`Cancel`,
        replaceTitle: t`Replace design?`,
        // `String(label)` rather than the bare variable, so the extracted
        // message keeps the positional placeholder this app already ships.
        replaceDescription: (label) => (
          <Trans>
            This will replace the current design with{" "}
            <strong>{String(label)}</strong>. All existing classes,
            fields, options, and views will be deleted. Existing objects will
            not be deleted but may no longer appear in views.
          </Trans>
        ),
        replaceConfirm: t`Replace design`,
        replacing: t`Replacing...`,
        downloadBackup: t`Download backup first`,
      }}
    />
  );
}

// Built-in templates, offered above the file upload in the import dialog. The
// backend loads the template file, so only its id and version are sent.
function TemplateList({
  onSelect,
}: {
  onSelect: (choice: EntityDesignImport) => void;
}) {
  const { data: templatesData, isError } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const response = await projectsApi.templates();
      return response.data.templates;
    },
  });

  const templates: ProjectTemplate[] = templatesData || [];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium"><Trans>Built-in templates</Trans></p>
      {isError && (
        <p className="text-sm text-destructive"><Trans>Could not load templates</Trans></p>
      )}
      <div className="space-y-1">
        {templates
          .filter((template) => template.id !== "blank")
          .map((template) => (
            <button
              key={template.id}
              onClick={() =>
                onSelect({
                  data: {},
                  template: template.id,
                  templateVersion: template.version,
                  label: template.name,
                })
              }
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
  );
}
