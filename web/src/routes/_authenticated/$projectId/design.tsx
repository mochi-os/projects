// Mochi Projects: Design editor page
// Copyright Alistair Cunningham 2026

import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { GeneralError, Main, PageHeader, usePageTitle, useQueryWithError, DetailSkeleton } from "@mochi/common";
import { Settings2 } from "lucide-react";
import projectsApi from "@/api/projects";
import type { ProjectDetails } from "@/types";
import { canDesign } from "@/lib/access";
import { DesignEditor } from "@/features/editor";

export const Route = createFileRoute("/_authenticated/$projectId/design")({
  component: DesignPage,
  errorComponent: ({ error }) => <GeneralError error={error} />,
});

function DesignPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const goBackToProject = () => navigate({ to: "/$projectId", params: { projectId } });

  const {
    data: projectData,
    isLoading,
    ErrorComponent,
  } = useQueryWithError({
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
      <>
        <PageHeader
          title="Design"
          icon={<Settings2 className="size-4 md:size-5" />}
          back={{ label: "Back to project", onFallback: goBackToProject }}
        />
        <Main>
          <DetailSkeleton />
        </Main>
      </>
    );
  }

  if (ErrorComponent) {
    return (
      <Main>
        {ErrorComponent}
      </Main>
    );
  }

  if (!project) {
    return <GeneralError error={new Error("Project not found")} />;
  }

  if (!canDesign(project.project.access)) {
    return <Navigate to="/$projectId" params={{ projectId }} />;
  }

  return (
    <>
      <PageHeader
        title={`${project.project.name} - Design`}
        icon={<Settings2 className="size-4 md:size-5" />}
        back={{ label: "Back to project", onFallback: goBackToProject }}
      />
      <Main fixed fluid className="flex-1 !py-0">
        <DesignEditor projectId={projectId} project={project} />
      </Main>
    </>
  );
}
