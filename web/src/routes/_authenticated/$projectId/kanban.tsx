
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Main, PageHeader, usePageTitle } from "@mochi/common";
import { FolderKanban } from "lucide-react";
import projectsApi from "@/api/projects";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { ProjectObject, ProjectDetails, ObjectTemplate } from "@/types";
import {
    CreateObjectDialog,
    ObjectDetailPanel,
} from "@/features/objects/components";

export const Route = createFileRoute("/_authenticated/$projectId/kanban")({
    loader: async ({ params }) => {
        const [projectResponse, templatesResponse] = await Promise.all([
          projectsApi.get(params.projectId),
          projectsApi.objectTemplates(),
        ]);
        return {
          project: projectResponse.data,
          templates: templatesResponse.data.templates,
        };
      },
    component: KanbanPage,
});

function KanbanPage() {
    const { project, templates } = Route.useLoaderData() as { project: ProjectDetails, templates: ObjectTemplate[] };
    const params = Route.useParams() as { projectId: string };
    const queryClient = useQueryClient();

    usePageTitle(`${project.project.name} - Kanban`);

    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createDefaultStatus, setCreateDefaultStatus] = useState<string | undefined>();

    // Load objects
    const { data: objectsData } = useQuery({
        queryKey: ["objects", params.projectId],
        queryFn: async () => {
            const response = await projectsApi.listObjects(params.projectId);
            return response.data.objects;
        },
    });

    // Move object mutation (Copied from index.tsx logic)
    const moveMutation = useMutation({
        mutationFn: async ({
          objectId,
          status,
        }: {
          objectId: string;
          status: string;
        }) => {
          return projectsApi.moveObject(params.projectId, objectId, { status });
        },
        onMutate: async ({ objectId, status }) => {
          await queryClient.cancelQueries({
            queryKey: ["objects", params.projectId],
          });
          const previousObjects = queryClient.getQueryData<ProjectObject[]>([
            "objects",
            params.projectId,
          ]);
          queryClient.setQueryData<ProjectObject[]>(
            ["objects", params.projectId],
            (old) =>
              old?.map((obj) =>
                obj.id === objectId
                  ? { ...obj, values: { ...obj.values, status } }
                  : obj,
              ),
          );
          return { previousObjects };
        },
        onError: (_err, _variables, context) => {
          if (context?.previousObjects) {
            queryClient.setQueryData(
              ["objects", params.projectId],
              context.previousObjects,
            );
          }
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["objects", params.projectId],
          });
        },
    });

    const handleMoveObject = (objectId: string, newStatus: string) => {
        moveMutation.mutate({ objectId, status: newStatus });
    };

    const handleCreateClick = (statusId: string) => {
        setCreateDefaultStatus(statusId);
        setCreateDialogOpen(true);
    };

    const handleObjectCreated = () => {
        // Handled by query invalidation
    };

    return (
        <>
            <PageHeader
                title={project.project.name}
                icon={<FolderKanban className="size-4 md:size-5" />}
            />
            <Main className="flex flex-col overflow-hidden h-full">
                <div className="flex-1 overflow-hidden p-4">
                    <KanbanBoard
                        project={project}
                        objects={objectsData || []}
                        statusField="status"
                        onCreateClick={handleCreateClick}
                        onMoveObject={handleMoveObject}
                    />
                </div>

                {selectedObjectId && (
                    <ObjectDetailPanel
                        projectId={params.projectId}
                        objectId={selectedObjectId}
                        project={project}
                        onClose={() => setSelectedObjectId(null)}
                    />
                )}
            </Main>
            <CreateObjectDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                project={project}
                templates={templates}
                defaultStatus={createDefaultStatus}
                onCreated={handleObjectCreated}
              />
        </>
    )
}
