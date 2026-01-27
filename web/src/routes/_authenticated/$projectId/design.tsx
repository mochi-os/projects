// Mochi Projects: Design editor page
// Copyright Alistair Cunningham 2026

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GeneralError, Main, PageHeader, usePageTitle } from "@mochi/common";
import { Settings2 } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { DesignEditor } from "@/features/editor";

export const Route = createFileRoute("/_authenticated/$projectId/design")({
  component: DesignPage,
  errorComponent: ({ error }) => <GeneralError error={error} />,
});

function DesignPage() {
  const { projectId } = Route.useParams();

  const {
    data: projectData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await projectsApi.get(projectId);
      return response.data;
    },
  });

  const project = projectData as ProjectDetails | undefined;
  usePageTitle(project ? `${project.project.name} - Design` : "Design");

  if (isLoading) {
    return (
      <Main className="flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </Main>
    );
  }

  if (error || !project) {
    return <GeneralError error={error} />;
  }

  return (
    <>
      <PageHeader
        title={`${project.project.name} - Design`}
        icon={<Settings2 className="size-4 md:size-5" />}
      />
      <Main className="flex-1 overflow-hidden">
        <DesignEditor projectId={projectId} project={project} />
      </Main>
    </>
  );
}
