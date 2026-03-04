import { createFileRoute } from "@tanstack/react-router";
import { ProjectsListPage } from "@/features/projects/pages";

export const Route = createFileRoute("/_authenticated/")({
  component: ProjectsListPage,
});
